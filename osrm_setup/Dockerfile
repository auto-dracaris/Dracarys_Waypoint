# Stage 1: Download map using a modern, working Alpine image
FROM alpine:latest AS downloader
RUN apk add --no-cache curl
WORKDIR /build

# Download Sri Lanka map data
RUN curl -L -o sri-lanka-latest.osm.pbf https://download.geofabrik.de/asia/sri-lanka-latest.osm.pbf

# Stage 2: Process the raw OpenStreetMap data using OSRM tools
FROM osrm/osrm-backend:latest AS builder
WORKDIR /build

# Copy the downloaded map from the downloader stage
COPY --from=downloader /build/sri-lanka-latest.osm.pbf .

# Copy your custom profiles into the OSRM /opt directory
COPY profiles/van.lua /opt/van.lua
COPY profiles/truck.lua /opt/truck.lua

# 1. Process Van Profile 
RUN mkdir /build/van && cp sri-lanka-latest.osm.pbf /build/van/van.osm.pbf
WORKDIR /build/van
RUN osrm-extract -p /opt/van.lua van.osm.pbf
RUN osrm-partition van.osrm
RUN osrm-customize van.osrm

# 2. Process Truck Profile 
WORKDIR /build
RUN mkdir /build/truck && cp sri-lanka-latest.osm.pbf /build/truck/truck.osm.pbf
WORKDIR /build/truck
RUN osrm-extract -p /opt/truck.lua truck.osm.pbf
RUN osrm-partition truck.osrm
RUN osrm-customize truck.osrm

# Stage 3: Packaging into a minimal data container
FROM alpine:latest
RUN mkdir -p /data/van /data/truck

# Copy processed graph files to /data
COPY --from=builder /build/van/van.osrm* /data/van/
COPY --from=builder /build/truck/truck.osrm* /data/truck/

VOLUME ["/data"]
CMD ["sh", "-c", "echo 'Multi-profile data initialized' && sleep infinity"]