#!/bin/sh
set -eu

if [ -z "${PRESENTON_BASIC_AUTH:-}" ]; then
  if [ -z "${PRESENTON_AUTH_USERNAME:-}" ] || [ -z "${PRESENTON_AUTH_PASSWORD:-}" ]; then
    echo "Presenton proxy credentials are required" >&2
    exit 1
  fi
  PRESENTON_BASIC_AUTH="$(printf '%s:%s' "$PRESENTON_AUTH_USERNAME" "$PRESENTON_AUTH_PASSWORD" | base64 | tr -d '\n')"
  export PRESENTON_BASIC_AUTH
fi

exec /docker-entrypoint.sh "$@"
