#!/usr/bin/env bash
# Server side of scripts/deploy.sh, which feeds it through `ssh ... bash -s`.
# Do not run it by hand.
#
#   deploy-remote.sh deploy   <compose-dir> <remote-dir> <service> <image-name> <image> <env-file> <health-timeout> <retention>
#   deploy-remote.sh rollback <compose-dir> <remote-dir> <service> <image-name> ''      <env-file> <health-timeout> <retention>
set -euo pipefail

mode=$1
compose_dir=$2
remote_dir=$3
service=$4
image_name=$5
image=$6
env_file=$7
health_timeout=$8
retention=$9

# The image that ran before the last deploy, for --rollback.
last_image_file="$remote_dir/.last_image"

# This script arrives on stdin: anything that reads stdin (docker compose run
# and exec do) would swallow the rest of it, so no command gets it.
compose() { docker compose "$@" </dev/null; }

container_id() { compose ps -q "$service" 2>/dev/null || true; }

running_image() {
  local id
  id="$(container_id)"
  if [ -n "$id" ]; then
    docker inspect --format '{{.Config.Image}}' "$id" 2>/dev/null || true
  fi
}

running_health() {
  local id
  id="$(container_id)"
  if [ -n "$id" ]; then
    docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || true
  fi
}

# Writes SANALBERTO_IMAGE in the .env Compose reads, so a later bare
# `docker compose up -d` (a reboot, another project's deploy) keeps this image.
# Anchored on ^SANALBERTO_IMAGE= so other keys in a shared .env stay as they are.
persist_image() {
  local line="SANALBERTO_IMAGE=$1" tmp
  if [ -f "$env_file" ] && grep -q '^SANALBERTO_IMAGE=' "$env_file"; then
    tmp="$(mktemp)"
    sed "s|^SANALBERTO_IMAGE=.*|$line|" "$env_file" >"$tmp"
    cat "$tmp" >"$env_file"
    rm -f "$tmp"
  else
    # Never glue the line onto the previous one.
    if [ -s "$env_file" ] && [ -n "$(tail -c1 "$env_file")" ]; then
      printf '\n' >>"$env_file"
    fi
    printf '%s\n' "$line" >>"$env_file"
  fi
  echo "    $line in $env_file"
}

start_and_wait() {
  local target=$1 port deadline
  export SANALBERTO_IMAGE="$target"

  echo "== Start $target =="
  compose up -d --no-deps "$service"

  if [ "$health_timeout" -eq 0 ]; then
    echo "== Health check skipped (DEPLOY_HEALTH_TIMEOUT=0) =="
    return
  fi

  echo "== Wait for /health =="
  # Ask Docker which port it published instead of reading a .env.
  port="$(compose port "$service" 3000 2>/dev/null | tail -1)"
  port="${port##*:}"
  case "$port" in
    '' | *[!0-9]*)
      echo "ERROR: $service does not publish port 3000" >&2
      exit 1
      ;;
  esac
  deadline=$(($(date +%s) + health_timeout))
  until curl -fsS --max-time 5 "http://127.0.0.1:$port/health" >/dev/null 2>&1; do
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "ERROR: no answer from /health on port $port after ${health_timeout}s. Last logs:" >&2
      compose logs --tail 50 "$service" >&2 || true
      exit 1
    fi
    sleep 2
  done
  echo "    healthy on port $port"
}

# Keeps the running image, the rollback one and the newest $retention.
cleanup_images() {
  local keep=" $1 " kept=0 removed=0 ref
  if [ -s "$last_image_file" ]; then keep+="$(cat "$last_image_file") "; fi
  if [ "$retention" -eq 0 ]; then return; fi
  echo "== Remove old images =="
  while read -r ref; do
    [ -n "$ref" ] || continue
    if [[ "$keep" == *" $ref "* ]] || [ "$kept" -lt "$retention" ]; then
      kept=$((kept + 1))
      continue
    fi
    if docker image rm "$ref" >/dev/null 2>&1; then removed=$((removed + 1)); fi
  done < <(docker image ls "$image_name" --format '{{.CreatedAt}}|{{.Repository}}:{{.Tag}}' |
    grep -v ':<none>$' | sort -r | cut -d'|' -f2)
  echo "    kept $kept, removed $removed"
}

cd "$compose_dir"

if ! command -v curl >/dev/null 2>&1 && [ "$health_timeout" -ne 0 ]; then
  echo "ERROR: curl is not installed on the server (or set DEPLOY_HEALTH_TIMEOUT=0)" >&2
  exit 1
fi

case "$mode" in
  deploy)
    previous="$(running_image)"
    health="$(running_health)"
    if [ -z "$previous" ]; then
      echo "== No container running: nothing saved for rollback =="
    elif [ "$previous" = "$image" ]; then
      echo "== $image is already running =="
    elif [ "$health" = healthy ] || [ "$health" = none ]; then
      printf '%s\n' "$previous" >"$last_image_file"
      echo "== Rollback image saved: $previous =="
    else
      # A failed deploy leaves a broken container: keep the last good image.
      echo "== Running container is $health: rollback image stays $(cat "$last_image_file" 2>/dev/null || echo none) =="
    fi

    echo "== Pull $image =="
    SANALBERTO_IMAGE="$image" compose pull "$service"
    start_and_wait "$image"
    ;;
  rollback)
    if [ ! -s "$last_image_file" ]; then
      echo "ERROR: there is no image to roll back to ($last_image_file)" >&2
      exit 1
    fi
    image="$(cat "$last_image_file")"
    start_and_wait "$image"
    ;;
  *)
    echo "ERROR: unknown mode $mode" >&2
    exit 1
    ;;
esac

echo "== Persist SANALBERTO_IMAGE =="
persist_image "$image"
cleanup_images "$image"

# deploy.sh only reports success after this line: a script cut short (a
# dropped connection) must not pass for a finished deploy.
echo "== Remote $mode done =="
