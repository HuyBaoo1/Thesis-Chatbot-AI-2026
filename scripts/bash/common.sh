#!/usr/bin/env sh
# Common functions for shell scripts
# Source this file at the top of any .sh script:
#   . "$(dirname "$0")/common.sh"
#
# Auto-detects podman or docker. Override with env var CONTAINER_RUNTIME:
#   export CONTAINER_RUNTIME=docker   # force docker
#   export CONTAINER_RUNTIME=podman   # force podman

# Detect docker compose command (v2 plugin vs v1 standalone)
_find_docker_compose() {
    # Docker Compose v2: "docker compose" (plugin)
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    # Docker Compose v1: "docker-compose" (standalone)
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo "docker compose"  # fallback to v2
    fi
}

# Auto-detect container runtime (podman or docker)
detect_container_runtime() {
    # 0. Override via environment variable
    if [ "$CONTAINER_RUNTIME" = "docker" ]; then
        CONTAINER_COMPOSE="$(_find_docker_compose)"
        return 0
    fi
    if [ "$CONTAINER_RUNTIME" = "podman" ]; then
        CONTAINER_COMPOSE="podman-compose"
        return 0
    fi

    # 1. Check docker first (more common)
    if command -v docker >/dev/null 2>&1; then
        CONTAINER_RUNTIME="docker"
        CONTAINER_COMPOSE="$(_find_docker_compose)"
        return 0
    fi

    # 2. Check podman
    if command -v podman >/dev/null 2>&1; then
        CONTAINER_RUNTIME="podman"
        CONTAINER_COMPOSE="podman-compose"
        return 0
    fi

    echo "ERROR: Neither podman nor docker found in PATH!" >&2
    echo "Set env var to override: export CONTAINER_RUNTIME=docker" >&2
    echo "Or install: Docker (https://docker.com) or Podman (https://podman.io)" >&2
    return 1
}

# Resolve project root (3 levels up from this script: bash/ -> scripts/ -> root)
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"

# Auto-detect on source
detect_container_runtime
export CONTAINER_RUNTIME CONTAINER_COMPOSE
