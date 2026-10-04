# WayPoint target architecture: application, prediction and MLOps

## Architecture decision

Use a hybrid serving architecture: live travel/service-time predictions and optional batch demand forecasts. Keep NestJS as the business API, the existing chatbot as its own service, and Python prediction serving separate from training. Use Apache Airflow for data/training workflows, dbt Core for SQL transformations and data tests, MLflow for experiment tracking and model registry, S3-compatible object storage for immutable datasets/model files, and containerized Python training jobs.

This follows established CI/CD/continuous-training practices. There is no universal industry-standard product stack or evidence here that one combination is the most used. The selection fits the supplied diagrams and the current project.

## Full component map

| Layer | Component | Responsibility |
|---|---|---|
| Clients | Web and Flutter driver app | Business operations, planning views, delivery outcomes |
| Edge | Nginx | TLS, static web build and routing to NestJS/chatbot |
| Business | NestJS | Authentication, authorization, planning, trips, orders and prediction contracts |
| Operational data | Business PostgreSQL | Source of truth for business records and persisted prediction audit records |
| Messaging | Existing RabbitMQ and consumers | SMS, location and notifications; independent queues/retries/dead-letter handling |
| External integrations | OSRM, Cloudinary, smsapi.lk, FCM | Route estimates, media, SMS and push notifications |
| Chatbot | Existing FastAPI AI service | Gemini calls, Qdrant document retrieval, AI PostgreSQL conversation/document persistence |
| Prediction serving | Separate Python FastAPI service | Batch-capable live duration inference with a pinned approved model and shared preprocessing |
| Data orchestration | Airflow scheduler and workers | Extraction, transformation, snapshots, training, evaluation, batch forecasting and monitoring workflows |
| Analytical data | Separate analytical PostgreSQL database initially | Historical staging tables, dbt feature/label models, prediction-outcome joins and forecast results |
| Data transformation | dbt Core plus Python feature package | SQL joins/tests plus identical model preprocessing in training and serving |
| Artifacts | S3-compatible object storage | Immutable raw extracts, Parquet training snapshots, model files, manifests and reports |
| Training | Isolated Python containers | Fit baseline/candidate models and record reproducible runs |
| Model lifecycle | MLflow and dedicated metadata database | Parameters, metrics, dataset/code identifiers, model signatures, versions, aliases and artifact references |
| Release | Automated release job | Resolve a model version, build/test a serving image or manifest, deploy to staging, shadow-test and promote/roll back |
| Monitoring | Evidently jobs, Prometheus, Grafana, OpenTelemetry/Tempo | Model quality/drift, service metrics/alerts and request traces |
| Delivery | GitHub Actions and container registry | Test code/pipelines, build immutable images and deploy environments |

Airflow and MLflow require separate metadata databases/users. They can share a managed PostgreSQL server initially; they must not share application tables or credentials. Separate environments also require separate stores, credentials and artifacts.

## Live request path

1. Web/mobile calls NestJS through Nginx. The chatbot uses its existing `/ai-api` route and authorized business tools.
2. NestJS assembles inputs known at prediction time, including an OSRM estimate where relevant, and calls the internal prediction service. Prefer one batch request per planning run over a request per order.
3. The prediction service uses its locally loaded, pinned model/preprocessing version and returns estimates, units, prediction time and version. Registry/object storage are not called for each prediction.
4. NestJS saves the input snapshot, prediction ID, order/trip/stop IDs, model version, prediction timestamp and fallback status. The response feeds existing planning logic; capacity, windows, fuel and publication validation remain enforced by NestJS.
5. On timeout or unavailable models, use an explicitly marked OSRM/current service-allowance baseline. Define timeouts and circuit breaking. Prediction logging failure is monitored and handled through a durable retry path.

## Data and training path

Daily Airflow workflow: bounded incremental extraction -> raw immutable snapshot -> analytical staging -> dbt transformations/tests -> feature/label snapshot -> eligibility check. Training runs on a configurable schedule or a sustained monitoring signal, only with sufficient valid labelled data.

Use a read-only extraction identity; move heavy queries to a read replica when load requires it. Track extraction watermarks and use overlapping windows plus key-based upserts to capture late offline sync and corrected records. A CDC platform is a later option, not a first requirement. RabbitMQ is not the training dataset or artifact store.

Each model has a separate workflow and release history: travel-time regression, service-time regression and optional demand forecasting. Train simple statistical/scikit-learn baselines and evaluate boosted-tree candidates such as XGBoost/LightGBM; choose by measured accuracy and latency rather than architecture branding. Demand modelling needs a separately defined forecast horizon and outlet/date aggregation.

Record Git commit, training/container version, dependency lock, configuration, seed, dataset manifest/hash, feature schema, cutoff and split dates, model signature and metrics in MLflow. Serialize preprocessing together with the model or use one versioned feature package across both paths.

## Labels and leakage prevention

- Arrival-to-completion duration is a candidate service-time label; validate whether it includes waiting, interruptions or multiple orders unloaded together. The current schema records one order per stop, so do not assume each row is an independent physical outlet visit.
- Define travel-leg start/end events before deriving travel labels. Arrival/completion fields alone do not establish every leg reliably.
- Future arrival/completion, delivered units and later-known outcomes are labels/audit fields, not pre-delivery inputs.
- Capture actual feature availability at prediction time, including delayed handset synchronization; retrospectively corrected data must not silently appear in historical prediction inputs.
- Validate timestamp ordering, units, duplicate events, missing labels and plausible durations. Keep failed/unserved deliveries for coverage analysis; do not assign fabricated zero duration labels.
- Use time-based train/validation/test periods and group related orders/visits/trips to prevent duplicate-event leakage. Model selection uses validation data; retain an untouched temporal test set and prospective shadow results for release decisions.

## Automatic model release

Training -> register candidate -> compare with current model and baseline -> staging contract/latency tests -> shadow predictions -> controlled promotion. For interactive duration models, a small canary can follow successful shadow evaluation; batch forecasts can first run in parallel without affecting plans.

Release gates cover MAE in minutes, tail error/underestimation, brand/district/outlet slices, dataset coverage, invalid outputs, latency and planning feasibility outcomes. Set numeric tolerances with the model/planning owners after measuring the baseline; there are no invented guaranteed thresholds in this proposal.

Failed candidates remain recorded and do not replace the active model. Use MLflow aliases such as `candidate` and `champion`, but resolve each to an exact version in a release manifest. Serving replicas switch through deployment, not by checking a mutable alias on every request. Keep the previous model and compatible image for rollback. Model rollback does not undo plans, deliveries or database writes already made.

CI/CD tests and deploys software/pipeline changes. Continuous training generates and evaluates model candidates from new data. Automatic production promotion is a separate configurable policy; begin with reviewed production promotion until gates and monitoring are calibrated.

## Monitoring and reliability

Join logged predictions to validated actuals daily. Track MAE, tail errors, underprediction, subgroup error, missing-label rate, feature freshness and drift. Drift triggers investigation/data validation, not unconditional promotion. Deduplicate training requests; enforce one active training run per model, cooldowns, retries, run budgets and minimum sample coverage.

Prometheus/Grafana covers API latency/errors, fallback rate, queue backlog, resource use and workflow health. Reuse OpenTelemetry/Tempo for traces. The inspected `infra/compose.yml` already defines optional Grafana/Tempo/collector components; its README states that metrics/log collection is not currently provided. Add metrics instrumentation and central structured-log collection as implementation work; do not describe the existing setup as full observability.

Use private service networking, authenticated service identities, role-based management access, TLS where traffic crosses trust boundaries, least-privilege database/object-store permissions and managed secrets. Restrict training data fields, audit model promotion and define artifact/log retention. Back up databases/artifacts and test restores. Training jobs have resource limits and run separately from live serving workloads.

## Deployment scope

Initial target: containerized application/serving services, a separate training worker host where practical, durable external storage and separate dev/staging/production configuration. A single Compose host is suitable for development or a limited deployment but does not provide high availability. Production availability objectives determine managed databases, replicated serving and redundant infrastructure.

Kubernetes/KServe, Feast, Kafka/CDC, a large warehouse and multi-agent A2A remain growth options. Add Kubernetes when independent scaling/availability justify its operating cost; Feast when shared online/offline feature retrieval becomes necessary. Do not add BigQuery/Tableau solely because they appear in the reference: the first analytical store can remain PostgreSQL and an analytics UI can connect later.

## Delivery sequence

1. Agree model contracts/labels, implement prediction serving and audit logging, retain baseline fallback.
2. Add analytical data, versioned snapshots, Airflow/dbt workflows, MLflow and isolated scheduled training.
3. Add evaluation gates, staging/shadow releases, rollback, service/model monitoring and calibrated automatic promotion.
4. Add batch demand forecasting and scale infrastructure according to measured workloads.

## Sources

- Google Cloud, CI/CD/continuous training architecture: https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning
- Apache Airflow core concepts: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/
- dbt data tests: https://docs.getdbt.com/docs/build/data-tests
- MLflow model registry/aliases: https://www.mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow backend/artifact separation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- Evidently ML evaluation: https://github.com/evidentlyai/docs/blob/main/quickstart_ml.mdx
- Prometheus metrics architecture: https://prometheus.io/docs/introduction/overview/
- Feast online/offline feature architecture: https://docs.feast.dev/getting-started/architecture/overview

Repository evidence inspected: supplied `Untitled Diagram.drawio`, `api/src/modules/planning/engine/README.md`, `api/src/database/entities/trip-stop.entity.ts`, root `docker-compose.yml`, `infra/compose.yml` and `infra/README.md`. References guide design only; they do not establish a working production deployment.
