# WayPoint

WayPoint plans and tracks deliveries from depots to retail outlets. Store managers place orders, dispatchers plan and publish vehicle trips, loaders load them, and drivers deliver them. Store managers then follow each delivery and confirm what arrived. An AI assistant answers questions from documents and live business data.

## What's in this repository

| Folder | What it is | Built with |
| --- | --- | --- |
| [`api/`](api/) | Business API: auth, orders, planning, trips, vehicles, outlets, issues | NestJS, TypeORM, PostgreSQL, RabbitMQ |
| [`web/`](web/) | Web app for the dispatcher hub and store managers | React, Vite, Tailwind |
| [`ai-service/`](ai-service/) | AI assistant: document Q&A, business tools, note drafting | Python, FastAPI, Qdrant, Gemini |
| [`mobile/driver_app/`](mobile/driver_app/) | Driver app that works offline | Flutter |
| [`mobile/loader_app/`](mobile/loader_app/) | Loader app  | Flutter |
| [`osrm_setup/`](osrm_setup/) | Road routing for Sri Lanka, with van and truck profiles | OSRM, Nginx |
| [`infra/`](infra/) | Optional local AI infrastructure and monitoring | Docker Compose |
| [`docs/`](docs/) | Architecture diagrams and design notes | draw.io, Markdown |

## Services in Docker Compose

`docker-compose.yml` runs everything. The OSRM services come in from [`osrm_setup/docker-compose.yml`](osrm_setup/docker-compose.yml).

| Service | Purpose | Host address |
| --- | --- | --- |
| `web` | Serves the web app and proxies `/api` and `/ai-api` | http://localhost:8080 |
| `api` | Business API (reached through `web`) | not exposed |
| `postgres` | Business database | `localhost:5433` |
| `rabbitmq` | Queues for SMS, vehicle locations and notifications | `localhost:5672`, UI http://localhost:15672 |
| `ai-service` | AI assistant API (reached through `web`) | not exposed |
| `ai-worker` | Turns uploaded documents into searchable chunks | not exposed |
| `ai-init` | Creates the AI tables, then exits | not exposed |
| `ai-postgres` | AI conversations and document catalog | `127.0.0.1:5434` |
| `qdrant` | Vector search for documents | `127.0.0.1:6333` |
| `osrm-data-init` | Copies the routing map data into a volume, then exits | not exposed |
| `osrm-van`, `osrm-truck` | Road routing per vehicle type | not exposed |
| `gateway` | Single entry to both OSRM profiles | `localhost:8081` |

## Run with Docker Compose

**You need** Docker with Compose v2.24 or newer (`docker compose version`).

1. **Create the environment files** and fill in the values:
   ```bash
   cp api/.env.example api/.env
   cp ai-service/.env.example ai-service/.env
   ```

* `api/.env`: set `JWT_SECRET`, and the phones and passwords for the seeded accounts (`SYSTEM_DISPATCHER_*`, `DEMO_STORE_MANAGER_*`, `DEMO_DRIVER_*`, `DEMO_LOADER_*`). SMS, Cloudinary and Firebase keys are only needed for those features.
* `ai-service/.env`: set `AI_GEMINI_API_KEY` for AI answers.

Database, RabbitMQ and service addresses are set by Compose, so you don't need to change them.

2. **Add the dataset.** The API seeds vehicles, outlets and the calendar from the dataset CSVs. Put them in `api/data/General Data/`. They are not in git, download from here [download the General Data from the original Tech-Triathlon dataset here](https://drive.google.com/drive/folders/1d-272bTFyx4QBpWSFe4_kE8-p5S_Zx8q?usp=sharing).
3. **Start everything:**

   ```bash
   docker compose up -d --build
   ```

The first start takes a few minutes. It downloads the Sri Lanka routing data, and the API creates its tables and runs the seed migrations.

4. **Open http://localhost:8080**

Alternatively, you can access the **live hosted system** at: **[https://way-point.site/](https://way-point.site/)**

### Demo accounts

**Hosted system ([way-point.site](https://way-point.site/)):** use these credentials to test each role:

* **Dispatcher:** `0711120401` / `Waypoint@123`
* **Store Manager:** `0764511038` / `Waypoint@123`
* **Loader:** `0784562377` / `Waypoint@123`
* **Driver:** `0760299855` / `Waypoint@123`

**Local setup:** the seeded accounts use the phones and passwords from `api/.env`. If you kept the defaults from `api/.env.example`, they are:

* **Dispatcher:** `0770000000` / `111111` (`SYSTEM_DISPATCHER_PHONE` / `SYSTEM_DISPATCHER_PASSWORD`)
* **Store Manager:** `0770000001` / `111111` (`DEMO_STORE_MANAGER_PHONE` / `DEMO_STORE_MANAGER_PASSWORD`)
* **Driver:** `0770000002` / `111111` (`DEMO_DRIVER_PHONE` / `DEMO_DRIVER_PASSWORD`)
* **Loader:** `0770000003` / `111111` (`DEMO_LOADER_PHONE` / `DEMO_LOADER_PASSWORD`)

If you changed these values in `api/.env`, log in with your own values instead.



## Develop locally

Run the supporting services in Docker and the apps on your machine, so they reload as you edit:

   ```bash
   docker compose up -d postgres rabbitmq ai-postgres qdrant gateway

   cd api && npm install && npm run dev            # http://localhost:5000, uses DB_PORT=5433
   cd web && npm install && npm run dev            # Vite proxies /api to :5000 and /ai-api to :8000
   ```


To run the AI service and the driver app locally, follow ai-service/README.md and mobile/driver_app/README.md.
