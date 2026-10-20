# Billet sample data

This directory contains the durable local sample dataset, including the private
media objects used by sample expenses. It replaces the former `/tmp` storage,
which was lost whenever the operating system cleaned temporary files.

Load or reset the dataset while the local PostgreSQL container is running:

```sh
pnpm --filter @billet/server data:sample
```

Run database migrations first (`pnpm --filter @billet/server migration:run`). New
user IDs start at 101; existing users retain their IDs and higher sequences are
never rewound.

The loader targets username `ntdm` and creates it if missing with email
`ntdm@example.com` and the local-only demo password `devt` (verified
email). Existing account credentials are preserved. Set `SAMPLE_USERNAME` to
choose another development account and `SAMPLE_USER_EMAIL` to customize the email
when creating it. `DATABASE_URL` overrides the local PostgreSQL connection.
When `psql` is unavailable and `DATABASE_URL` is unset, the loader uses `psql`
inside the local Compose PostgreSQL container.

Reloading replaces the target user's expenses, recognition jobs, and media.
The dataset contains 22 expenses across September and October 2026, linked to ten
reusable sample photographs. In each month, day 13 has four photos, day 14 has an
expense without a photo, day 15 has three photos, day 16 has two, and day 17 has
one. Other days are empty.

Local server development reads media from `data/sample/object-storage`. Relative
storage paths are resolved from the workspace root, regardless of the directory
used to start Nest. Docker Compose continues to use its managed
`billet-storage` volume.

Only curated files under `object-storage/media/sample/` are versioned. Local user
uploads and generated exports are excluded from Git and the Docker build context.

The ten sample photographs are cropped development fixtures sourced from
[Unsplash](https://unsplash.com/license). Their source photo identifiers are
preserved in `sources.md`.
