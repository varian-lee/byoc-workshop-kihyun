# BYOC Workshop — Todo App

A simple Todo app built with FastAPI + React + PostgreSQL, pre-wired for Datadog APM, Logs, CloudPrem, and Observability Pipelines.

## Prerequisites

- Docker Desktop
- A Datadog account on [horde.datadoghq.com](https://horde.datadoghq.com)
- API Key and App Key from [Organization Settings](https://horde.datadoghq.com/organization-settings/api-keys)

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd byoc-workshop
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DD_API_KEY` | ✅ | Datadog API Key |
| `DD_APP_KEY` | ✅ | Datadog App Key |
| `DD_ENV` | ✅ | Your personal env tag — **must be unique per user** (e.g. `local-alice`) |
| `DD_SITE` | — | Defaults to `datadoghq.com` |
| `DD_OP_PIPELINE_ID` | — | Set to enable OPW (Observability Pipelines Worker) |

### 2. Start

```bash
./start.sh up -d --build
```

`start.sh` reads `.env` and automatically composes the right set of services.

### 3. Access

- **Frontend**: http://localhost:28080
- **Backend API / Swagger**: http://localhost:28081/docs

---

## Step-by-step Datadog Setup

### Step 1 — APM + Logs (default)

Just set `DD_API_KEY` and `DD_ENV` — APM and log collection start automatically.

### Step 2 — CloudPrem

CloudPrem is enabled by default. On startup, `./start.sh` prints your cluster info:

```
Cluster remote UID : xxxxxxxx-xxxx-...
Cluster name in UI : rev_cluster_xxxxxxxx  ← find this on /byoc-logs
```

View your logs: [horde.datadoghq.com/byoc-logs](https://horde.datadoghq.com/byoc-logs)

### Step 3 — Observability Pipelines Worker

1. Create a pipeline at [Observability Pipelines](https://app.datadoghq.com/observability-pipelines)
   - Source: **Datadog Agent** (set Address identifier to `byoc_workshop_agent`)
   - Destination: **Datadog BYOC Logs**
2. Add the Pipeline ID to `.env`:
   ```
   DD_OP_PIPELINE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
3. Restart:
   ```bash
   ./start.sh down --clean && ./start.sh up -d --build
   ```

Log flow: **Agent → OPW (8282) → CloudPrem (7280)**

---

## Common Commands

```bash
./start.sh up -d --build     # start in background
./start.sh down --clean      # stop and wipe CloudPrem data
./start.sh logs -f backend   # follow backend logs
./start.sh info              # show your CloudPrem cluster UID and links
```

## Notes

- `.env` is gitignored — never commit it.
- Each team member sets their own `DD_ENV` to distinguish their data in Datadog.
