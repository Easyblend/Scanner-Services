# Crowdtest Scanner

Crowdtest Scanner is a background worker for checking websites submitted by the Crowdtest app. It gets scan jobs from RabbitMQ, opens the site in a headless Chromium browser, and sends the results back to the app.

It is a worker, not a user-facing website. Its HTTP server currently provides a health endpoint only.

## What It Checks

For each job, the scanner crawls up to 10 pages on the starting site's origin and collects:

- Unhandled JavaScript errors.
- Failed same-origin network requests and HTTP responses with an error status.
- Internal links that cannot be reached or return an error status.

Findings include a category, severity, confidence, page URL, description, and available request or error details. Duplicate findings are removed before results are sent. Third-party network errors and external links are not checked.

## How A Scan Works

1. The Crowdtest app publishes a job to the durable RabbitMQ queue `scan-requests`.
2. The worker scans the job's URL using Chromium.
3. The worker posts a success or failure result to the app.
4. The worker acknowledges the RabbitMQ message after processing.

## Run Locally

You need Node.js 22 or later, a reachable RabbitMQ instance, and a Crowdtest app endpoint that accepts scan results.

Install the scanner's dependencies:

```sh
cd scanner
npm install
```

Create `scanner/.env` with values for your local services:

```dotenv
RABBITMQ_URL=amqp://localhost
NEXT_APP_URL=http://localhost:3000
SCANNER_API_KEY=your-local-api-key
PORT=8080
```

`NEXT_APP_URL` is the base URL of the Crowdtest app. `SCANNER_API_KEY` must be accepted by its result endpoint. `PORT` is optional and defaults to `8080`.

Start the worker from the `scanner` directory:

```sh
npm run dev
```

In another terminal, check its health endpoint:

```sh
curl http://localhost:8080/health
```

Expected response:

```json
{"status":"ok","service":"crowdtest-scanner"}
```

The worker connects to RabbitMQ before the health endpoint starts listening. Startup exits with an error if it cannot connect.

To compile the TypeScript or run the compiled worker:

```sh
npm run build
npm start
```

## RabbitMQ Message

The producer publishes JSON to `scan-requests` with this shape:

```json
{
  "eventId": "evt_123",
  "scanId": "scan_456",
  "projectId": "project_789",
  "url": "https://example.com",
  "requestedAt": "2026-10-31T12:00:00.000Z"
}
```

All five fields are part of the message contract. The worker currently uses `scanId`, `projectId`, and `url`; `eventId` and `requestedAt` are not used during scanning.

## Results Sent To The App

The worker sends results to:

```text
POST {NEXT_APP_URL}/api/internal/scans/result
Authorization: Bearer {SCANNER_API_KEY}
```

A successful scan includes `scanId`, `projectId`, `success: true`, `startedAt`, `pagesScanned`, and `findings`. A failed scan includes `scanId`, `projectId`, `success: false`, and an error message.

## Project Layout

```text
scanner/
  src/server.ts                 HTTP health endpoint and worker startup
  src/messaging/                RabbitMQ consumer and job contract
  src/scanner/crawler.ts        Chromium crawl, limited to 10 pages
  src/scanner/checks/           JavaScript, network, and link checks
  src/scanner/findings/         Finding types, classification, deduplication
```

## Build And Deploy

The Dockerfile is in `scanner/`. From the repository root, build and push an image for Azure Container Apps:

```sh
VERSION=v1.0.0
IMAGE=crowdtestscanneremmanuel.azurecr.io/crowdtest-scanner:$VERSION

docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t "$IMAGE" \
  --push scanner
```

Deploy the same image version:

```sh
az containerapp update \
  --name crowdtest-scanner \
  --resource-group crowdtest-scanner-rg \
  --image "$IMAGE"
```

Configure the Container App secrets `rabbitmq-url`, `next-app-url`, and `scanner-secret`, then map them to the worker environment:

```sh
az containerapp update \
  --name crowdtest-scanner \
  --resource-group crowdtest-scanner-rg \
  --set-env-vars \
    RABBITMQ_URL=secretref:rabbitmq-url \
    NEXT_APP_URL=secretref:next-app-url \
    SCANNER_API_KEY=secretref:scanner-secret
  ```
