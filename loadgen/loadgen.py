"""Load generator — sends a mix of CRUD requests to the Todo API every ~1 second."""

import logging
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone

import requests
from ddtrace import tracer
from pythonjsonlogger import jsonlogger

# ---------------------------------------------------------------------------
# JSON logger — mirrors backend/main.py setup
# ---------------------------------------------------------------------------
def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
    )
    handler.setFormatter(formatter)
    root = logging.getLogger()
    root.handlers = []
    root.addHandler(handler)
    root.setLevel(logging.INFO)


setup_logging()
logger = logging.getLogger("loadgen")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = os.environ.get("BACKEND_URL", "http://backend:8000")
INTERVAL = float(os.environ.get("LOAD_INTERVAL", "1.0"))   # seconds between ticks

TITLES = [
    "Write unit tests",
    "Review pull request",
    "Update documentation",
    "Fix flaky test",
    "Deploy to staging",
    "Sync with team",
    "Refactor auth module",
    "Add integration tests",
    "Monitor error rates",
    "Rotate API keys",
    "Benchmark database queries",
    "Clean up stale branches",
    "Update dependencies",
    "Write runbook",
    "Set up alerting",
]

DESCRIPTIONS = [
    "High priority item from sprint planning.",
    "Carryover from last week.",
    "Requested by the platform team.",
    "Blocking the next release.",
    "Nice to have, low urgency.",
    None,
]

# ---------------------------------------------------------------------------
# HTTP helpers — emit one structured log line per request
# ---------------------------------------------------------------------------
SESSION = requests.Session()
SESSION.headers["Content-Type"] = "application/json"


def _request(method: str, path: str, **kwargs) -> requests.Response | None:
    url = f"{BASE_URL}{path}"
    # Wrap in a parent span so dd.trace_id/dd.span_id are non-zero in logs.
    with tracer.trace(
        "loadgen.http",
        service="todo-loadgen",
        resource=f"{method} {path}",
        span_type="http",
    ) as span:
        span.set_tag("http.method", method)
        span.set_tag("http.url", url)
        t0 = time.monotonic()
        try:
            r = SESSION.request(method, url, timeout=5, **kwargs)
            duration_ms = round((time.monotonic() - t0) * 1000, 2)
            span.set_tag("http.status_code", r.status_code)
            if r.status_code >= 400:
                span.error = 1
            level = logging.WARNING if r.status_code >= 400 else logging.INFO
            logger.log(
                level,
                f"{method} {path} → {r.status_code}",
                extra={
                    "http.method": method,
                    "http.url": url,
                    "http.url_details.path": path,
                    "http.status_code": r.status_code,
                    "duration": int(duration_ms * 1_000_000),  # nanoseconds
                    "duration_ms": duration_ms,
                },
            )
            return r
        except requests.exceptions.ConnectionError as exc:
            span.error = 1
            span.set_tag("error.message", str(exc))
            logger.error(
                f"{method} {path} connection error",
                extra={"http.method": method, "http.url": url, "error.message": str(exc)},
            )
            return None
        except Exception as exc:
            span.error = 1
            span.set_tag("error.message", str(exc))
            logger.error(
                f"{method} {path} unexpected error",
                extra={"http.method": method, "http.url": url, "error.message": str(exc)},
            )
            return None


def get(path: str) -> requests.Response | None:
    return _request("GET", path)


def post(path: str, body: dict) -> requests.Response | None:
    return _request("POST", path, json=body)


def put(path: str, body: dict) -> requests.Response | None:
    return _request("PUT", path, json=body)


def delete(path: str) -> requests.Response | None:
    return _request("DELETE", path)


# ---------------------------------------------------------------------------
# Action helpers
# ---------------------------------------------------------------------------
def action_health() -> None:
    get("/health")


def action_create() -> int | None:
    deadline_days = random.choice([None, 1, 3, 7, 14, 30])
    body = {
        "title": random.choice(TITLES),
        "description": random.choice(DESCRIPTIONS),
        "deadline": (
            (datetime.now(timezone.utc) + timedelta(days=deadline_days)).isoformat()
            if deadline_days else None
        ),
    }
    r = post("/todos", body)
    if r and r.status_code == 201:
        return r.json().get("id")
    return None


def action_list() -> list[int]:
    r = get("/todos")
    if r and r.status_code == 200:
        return [t["id"] for t in r.json()]
    return []


def action_get(todo_id: int) -> None:
    get(f"/todos/{todo_id}")


def action_get_nonexistent() -> None:
    """Intentional 404 to exercise the error path."""
    get("/todos/999999")


def action_update(todo_id: int) -> None:
    choice = random.randint(0, 2)
    if choice == 0:
        body = {"completed": True}
    elif choice == 1:
        body = {"title": random.choice(TITLES) + " (revised)"}
    else:
        body = {"completed": True, "title": random.choice(TITLES) + " (done)"}
    put(f"/todos/{todo_id}", body)


def action_delete(todo_id: int) -> None:
    delete(f"/todos/{todo_id}")


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def wait_for_backend() -> None:
    logger.info("Waiting for backend to become available…")
    while True:
        try:
            r = SESSION.get(f"{BASE_URL}/health", timeout=3)
            if r.status_code == 200:
                logger.info("Backend is healthy — starting load generation", extra={
                    "backend_url": BASE_URL,
                    "interval_s": INTERVAL,
                })
                return
        except Exception:
            pass
        time.sleep(2)


def tick(tick_count: int, known_ids: list[int]) -> None:
    # Refresh known IDs every 10 ticks
    if tick_count % 10 == 0:
        fresh = action_list()
        if fresh:
            known_ids.clear()
            known_ids.extend(fresh)
        return

    # Health check every 30 ticks
    if tick_count % 30 == 0:
        action_health()
        return

    roll = random.random()

    if roll < 0.20:
        new_id = action_create()
        if new_id:
            known_ids.append(new_id)
    elif roll < 0.40:
        action_list()
    elif roll < 0.55:
        action_get(random.choice(known_ids)) if known_ids else action_create()
    elif roll < 0.65:
        action_get_nonexistent()
    elif roll < 0.85:
        action_update(random.choice(known_ids)) if known_ids else action_create()
    else:
        if len(known_ids) > 5:
            action_delete(known_ids.pop(random.randrange(len(known_ids))))
        else:
            action_create()


def main() -> None:
    logger.info("Load generator starting", extra={
        "backend_url": BASE_URL,
        "interval_s": INTERVAL,
    })
    wait_for_backend()

    known_ids: list[int] = []
    tick_count = 0

    while True:
        t0 = time.monotonic()
        try:
            tick(tick_count, known_ids)
        except Exception:
            logger.exception("Unexpected error in tick")
        tick_count += 1
        sleep_for = max(0.0, INTERVAL - (time.monotonic() - t0))
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
