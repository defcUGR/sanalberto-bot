#!/usr/bin/env bash
# Builds the Docker image, pushes it to a registry and runs it on the server
# with Docker Compose (see README.md). Settings come from
# .env.deploy (copy .env.deploy.example).
#
#   bash scripts/deploy.sh             build, push and deploy what is checked out
#   bash scripts/deploy.sh --rollback  go back to the image that ran before the last deploy
set -euo pipefail

cd "$(dirname "$0")/.."

log() { printf '== %s ==\n' "$1"; }
fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}
require_command() { command -v "$1" >/dev/null 2>&1 || fail "$1 is not available locally"; }

MODE=deploy
for arg in "$@"; do
  case "$arg" in
    --rollback) MODE=rollback ;;
    -h | --help)
      sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-.env.deploy}"
[ -f "$DEPLOY_ENV_FILE" ] || fail "$DEPLOY_ENV_FILE not found (copy .env.deploy.example)"
set -a
# shellcheck disable=SC1090
. "$DEPLOY_ENV_FILE"
set +a

: "${VPS_HOST:?ERROR: VPS_HOST is required in $DEPLOY_ENV_FILE}"
: "${REMOTE_DIR:?ERROR: REMOTE_DIR is required in $DEPLOY_ENV_FILE}"
: "${IMAGE_NAME:?ERROR: IMAGE_NAME is required in $DEPLOY_ENV_FILE}"

COMPOSE_DIR="${COMPOSE_DIR:-$REMOTE_DIR}"
COMPOSE_APP_SERVICE="${COMPOSE_APP_SERVICE:-sanalberto-bot}"
IMAGE_ENV_FILE="${IMAGE_ENV_FILE:-$COMPOSE_DIR/.env}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
DEPLOY_HEALTH_TIMEOUT="${DEPLOY_HEALTH_TIMEOUT:-90}"
DEPLOY_IMAGE_RETENTION="${DEPLOY_IMAGE_RETENTION:-2}"

[[ "$DEPLOY_HEALTH_TIMEOUT" =~ ^[0-9]+$ ]] || fail 'DEPLOY_HEALTH_TIMEOUT must be a non-negative integer'
[[ "$DEPLOY_IMAGE_RETENTION" =~ ^[0-9]+$ ]] || fail 'DEPLOY_IMAGE_RETENTION must be a non-negative integer'

# Under WSL (a bare `bash` typed in PowerShell) the Linux ssh does not see the
# keys and host aliases of the Windows user; Windows' ssh.exe does.
SSH_BIN=ssh
if [ -n "${WSL_DISTRO_NAME:-}" ] && command -v ssh.exe >/dev/null 2>&1; then SSH_BIN=ssh.exe; fi
require_command "$SSH_BIN"

SSH_ARGS=()
if [ -n "${SSH_PORT:-}" ]; then
  [[ "$SSH_PORT" =~ ^[0-9]+$ ]] || fail 'SSH_PORT must be a port number'
  SSH_ARGS+=(-p "$SSH_PORT")
fi
if [ -n "${SSH_OPTS:-}" ]; then
  read -r -a ssh_extra_args <<<"$SSH_OPTS"
  SSH_ARGS+=("${ssh_extra_args[@]}")
fi

IMAGE=''
if [ "$MODE" = deploy ]; then
  require_command docker
  require_command git

  # The tag names the commit. Uncommitted changes get their own tag, so the
  # image never claims to be a commit it is not.
  if [ -z "${IMAGE_TAG:-}" ]; then
    IMAGE_TAG="$(git rev-parse --short HEAD)"
    if [ -n "$(git status --porcelain)" ]; then
      IMAGE_TAG="$IMAGE_TAG-dirty-$(date +%Y%m%d%H%M%S)"
    fi
  fi
  IMAGE="$IMAGE_NAME:$IMAGE_TAG"

  # Links the package to its repository on registries that read it (GHCR).
  labels=(--label "org.opencontainers.image.revision=$(git rev-parse HEAD)")
  origin="$(git config --get remote.origin.url || true)"
  if [[ "$origin" =~ ^(git@|https://)github\.com[:/](.+)$ ]]; then
    labels+=(--label "org.opencontainers.image.source=https://github.com/${BASH_REMATCH[2]%.git}")
  fi

  if [ -n "${REGISTRY_USERNAME:-}" ] && [ -n "${REGISTRY_TOKEN:-}" ]; then
    log "Registry login"
    printf '%s' "$REGISTRY_TOKEN" | docker login "${IMAGE_NAME%%/*}" -u "$REGISTRY_USERNAME" --password-stdin
  fi

  log "Build and push $IMAGE"
  # --pull: every deploy starts from the latest Node.js base image.
  docker buildx build \
    --pull \
    --platform "$DOCKER_PLATFORM" \
    "${labels[@]}" \
    -t "$IMAGE" \
    -t "$IMAGE_NAME:latest" \
    --push \
    .
fi

log "$MODE on $VPS_HOST"
remote_log="$(mktemp)"
trap 'rm -f "$remote_log"' EXIT
remote_args="$(printf '%q ' "$MODE" "$COMPOSE_DIR" "$REMOTE_DIR" "$COMPOSE_APP_SERVICE" \
  "$IMAGE_NAME" "$IMAGE" "$IMAGE_ENV_FILE" "$DEPLOY_HEALTH_TIMEOUT" "$DEPLOY_IMAGE_RETENTION")"
"$SSH_BIN" "${SSH_ARGS[@]}" "$VPS_HOST" "bash -s -- $remote_args" <scripts/deploy-remote.sh |
  tee "$remote_log"
grep -qxF "== Remote $MODE done ==" "$remote_log" || fail "the remote $MODE stopped before its last step"

printf '%s finished\n' "$MODE"
