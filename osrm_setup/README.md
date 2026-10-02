# Sri Lanka Multi-Profile OSRM Engine

A localized routing engine for Sri Lanka with dedicated profiles for Vans and Trucks.

## How to Run

1. Place `docker-compose.yml` and `nginx.conf` in the same directory.
2. Start the service:

```bash
docker compose up -d
```

_(Allow a few moments for the map data to load on the first run)._

## Web UI

Open `index.html` in your browser. Ensure the `OSRM_BASE_URL` in the file is set to `http://localhost:8081/route/v1`. Click two points on the map to calculate routes.

## 🔌 API Endpoints

The service runs on **port 8081**.

**Van:**

```http
http://localhost:8081/route/v1/van/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson

```

**Truck:**

```http
http://localhost:8081/route/v1/truck/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson

```

## 🛑 Stop Service

```bash
docker compose down

```
