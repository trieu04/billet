#!/bin/sh

set -eu

sample_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
database_url=${DATABASE_URL:-postgresql://billet:billet@localhost:6710/billet}
sample_username=${SAMPLE_USERNAME:-ntdm}
sample_user_email=${SAMPLE_USER_EMAIL:-${sample_username}@example.com}

set -- \
  --set=ON_ERROR_STOP=1 \
  --set=sample_username="$sample_username" \
  --set=sample_user_email="$sample_user_email"

if command -v psql >/dev/null 2>&1; then
  psql "$database_url" "$@" --file="$sample_dir/seed.sql"
elif [ -z "${DATABASE_URL:-}" ]; then
  docker compose -f "$sample_dir/../../compose.yml" exec -T postgres \
    psql -U billet -d billet "$@" < "$sample_dir/seed.sql"
else
  echo 'psql is required when DATABASE_URL is set.' >&2
  exit 1
fi
