#!/bin/sh

set -eu

sample_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
database_url=${DATABASE_URL:-postgresql://billet:billet@localhost:6710/billet}
sample_user_email=${SAMPLE_USER_EMAIL:-ntdm11@example.com}

psql "$database_url" \
  --set=ON_ERROR_STOP=1 \
  --set=sample_dir="$sample_dir" \
  --set=sample_user_email="$sample_user_email" \
  --file="$sample_dir/seed.sql"
