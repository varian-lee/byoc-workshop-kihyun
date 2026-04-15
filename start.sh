#!/usr/bin/env bash
# start.sh — Compose file selector based on .env flags.
#
# Usage:
#   ./start.sh up --build       # Build and start
#   ./start.sh up -d            # Start in background
#   ./start.sh down             # Stop
#   ./start.sh down --clean     # Stop + wipe CloudPrem data

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env
if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
else
  echo "⚠️  .env file not found. Copy .env.example and fill in your values:"
  echo "   cp .env.example .env"
  echo ""
fi

if [ -z "${DD_API_KEY:-}" ]; then
  echo "❌ DD_API_KEY is not set. Check your .env file."
  exit 1
fi

# Build COMPOSE_FILE (colon-separated)
COMPOSE_FILE="docker-compose.yaml"
ACTIVE_SERVICES="core (db, backend, frontend, datadog-agent)"

if [ "${DD_CLOUDPREM_ENABLED:-true}" = "true" ]; then
  COMPOSE_FILE="$COMPOSE_FILE:docker-compose.cloudprem.yaml"
  ACTIVE_SERVICES="$ACTIVE_SERVICES + CloudPrem"
fi

if [ -n "${DD_OP_PIPELINE_ID:-}" ]; then
  COMPOSE_FILE="$COMPOSE_FILE:docker-compose.opw.yaml"
  ACTIVE_SERVICES="$ACTIVE_SERVICES + OPW"
fi

export COMPOSE_FILE

# Detect docker compose command (V2 plugin vs V1 standalone)
if docker compose version > /dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ Neither 'docker compose' nor 'docker-compose' found. Is Docker Desktop installed?"
  exit 1
fi

# Wipe CloudPrem data dir (required when restarting with a different node ID)
clean_cloudprem_data() {
  if [ -d "./cloudprem-data" ]; then
    echo "🧹 Wiping CloudPrem data directory (cloudprem-data/)..."
    rm -rf "./cloudprem-data"
  fi
  mkdir -p "./cloudprem-data"
  chmod 777 "./cloudprem-data"
  echo "✅ CloudPrem data directory reset."
}

# Warn if indexing dirs reference a different node ID than the current one
check_cloudprem_stale_data() {
  if [ "${DD_CLOUDPREM_ENABLED:-true}" != "true" ]; then
    return
  fi
  if [ ! -d "./cloudprem-data" ] || [ -z "$(ls -A ./cloudprem-data 2>/dev/null)" ]; then
    return
  fi

  local expected_node="byoc-workshop-local-node"

  if [ -d "./cloudprem-data/indexing" ]; then
    local stale
    stale=$(find ./cloudprem-data/indexing -maxdepth 1 -mindepth 1 -type d \
              ! -name "${expected_node}*" 2>/dev/null || true)
    if [ -n "$stale" ]; then
      echo ""
      echo "⚠️  Stale CloudPrem data detected (expected node: ${expected_node}):"
      echo "$stale" | sed 's/^/     /'
      echo ""
      echo "   This will cause 'ingester unavailable' errors at startup."
      echo "   Run the following to start clean:"
      echo ""
      echo "     ./start.sh down --clean"
      echo "     ./start.sh up --build"
      echo ""
    fi
  fi
}

print_banner() {
  echo "======================================================"
  echo "  Todo App — Docker Compose"
  echo "======================================================"
  echo "  DD_ENV   : ${DD_ENV:-local}"
  echo "  DD_SITE  : ${DD_SITE:-datadoghq.com}"
  echo "  Services : $ACTIVE_SERVICES"
  echo "  Command  : $COMPOSE_CMD"
  echo "======================================================"
  echo ""
}

# Print CloudPrem cluster info after UID is known
print_cluster_info() {
  local CLUSTER_UID="$1"
  local SITE="${DD_SITE:-datadoghq.com}"
  local ENV_TAG="${DD_ENV:-local}"
  local UID_PREFIX="${CLUSTER_UID%%-*}"
  local REV_CLUSTER="rev_cluster_${UID_PREFIX}"
  local LOG_EXPLORER_URL="https://horde.${SITE}/logs?index=byoc--${REV_CLUSTER}"

  echo "======================================================"
  echo "  CloudPrem Cluster Info"
  echo "======================================================"
  echo "  Cluster remote UID : $CLUSTER_UID"
  echo "  Cluster name in UI : $REV_CLUSTER   ← find this on /byoc-logs"
  echo "  DD_ENV             : $ENV_TAG"
  echo "======================================================"
  echo ""
  echo "  ▶ Datadog Log Explorer (your cluster only):"
  echo "    $LOG_EXPLORER_URL"
  echo ""
  echo "  ▶ CloudPrem cluster list (find '$REV_CLUSTER' here):"
  echo "    https://horde.${SITE}/byoc-logs"
  echo ""
  echo "======================================================"
}

# Extract cluster_remote_uid from CloudPrem container logs
get_cluster_uid() {
  local CONTAINER="$1"
  docker logs "$CONTAINER" 2>/dev/null \
    | grep '"cluster_remote_uid"' \
    | tail -1 \
    | grep -o '"cluster_remote_uid":"[^"]*"' \
    | cut -d'"' -f4
}

SUBCOMMAND="${1:-}"

case "$SUBCOMMAND" in

  reset)
    print_banner
    echo "🔄 Resetting: stopping containers and wiping all data..."
    $COMPOSE_CMD down -v 2>/dev/null || true
    clean_cloudprem_data
    echo ""
    echo "🚀 Starting fresh..."
    exec $COMPOSE_CMD up --build
    ;;

  down)
    shift
    CLEAN=false
    REMAINING=()
    for arg in "$@"; do
      if [ "$arg" = "--clean" ]; then
        CLEAN=true
      else
        REMAINING+=("$arg")
      fi
    done

    print_banner
    $COMPOSE_CMD down "${REMAINING[@]+"${REMAINING[@]}"}"

    if [ "$CLEAN" = true ]; then
      clean_cloudprem_data
    fi
    ;;

  info)
    if [ "${DD_CLOUDPREM_ENABLED:-true}" != "true" ]; then
      echo "ℹ️  CloudPrem is not enabled (DD_CLOUDPREM_ENABLED != true)"
      exit 0
    fi

    PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$SCRIPT_DIR")}"
    CONTAINER="${PROJECT_NAME}-cloudprem-1"

    echo "🔍 Reading CloudPrem logs from container: $CONTAINER"
    echo ""

    CLUSTER_UID=$(get_cluster_uid "$CONTAINER")

    if [ -z "$CLUSTER_UID" ]; then
      echo "❌ cluster_remote_uid not found yet."
      echo "   Make sure CloudPrem is running:  ./start.sh up -d"
      echo "   Then retry:                       ./start.sh info"
      exit 1
    fi

    print_cluster_info "$CLUSTER_UID"
    ;;

  up)
    shift
    check_cloudprem_stale_data
    # Pre-create cloudprem-data with open permissions so the non-root
    # CloudPrem process can write to the bind-mounted directory.
    if [ "${DD_CLOUDPREM_ENABLED:-true}" = "true" ]; then
      mkdir -p ./cloudprem-data
      chmod 777 ./cloudprem-data
    fi
    print_banner

    DETACHED=false
    for arg in "$@"; do
      if [ "$arg" = "-d" ] || [ "$arg" = "--detach" ]; then
        DETACHED=true
        break
      fi
    done

    if [ "$DETACHED" = true ] && [ "${DD_CLOUDPREM_ENABLED:-true}" = "true" ]; then
      $COMPOSE_CMD up "$@"

      echo ""
      echo "⏳ Waiting for CloudPrem to report its cluster remote UID..."

      PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$SCRIPT_DIR")}"
      CONTAINER="${PROJECT_NAME}-cloudprem-1"
      TIMEOUT=60
      ELAPSED=0
      CLUSTER_UID=""

      while [ $ELAPSED -lt $TIMEOUT ]; do
        CLUSTER_UID=$(get_cluster_uid "$CONTAINER")
        if [ -n "$CLUSTER_UID" ]; then
          break
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        printf "."
      done
      echo ""

      if [ -z "$CLUSTER_UID" ]; then
        echo "⚠️  Timed out waiting for cluster_remote_uid."
        echo "   Try again later:  ./start.sh info"
      else
        print_cluster_info "$CLUSTER_UID"
      fi
    else
      exec $COMPOSE_CMD up "$@"
    fi
    ;;

  *)
    print_banner
    exec $COMPOSE_CMD "$@"
    ;;

esac
