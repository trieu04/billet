# Billet sample data

This directory contains the durable local sample dataset, including the private
media objects used by sample expenses. It replaces the former `/tmp` storage,
which was lost whenever the operating system cleaned temporary files.

Load or reset the dataset while the local PostgreSQL container is running:

```sh
pnpm --filter @billet/server data:sample
```

The loader targets the existing user `ntdm11@example.com`, replaces that
user's expenses and media records, and leaves authentication data untouched.
Set `SAMPLE_USER_EMAIL` to target another existing development account.

The ten expenses intentionally exercise calendar photo counts: October 13 has
four photos, October 15 has three, October 16 has two, October 17 has one, and
October 14 has none.

Local server development reads media from `data/sample/object-storage`. Relative
storage paths are resolved from the workspace root, regardless of the directory
used to start Nest. Docker Compose continues to use its managed
`billet-storage` volume.

Only curated files under `object-storage/media/sample/` are versioned. Local user
uploads and generated exports are excluded from Git and the Docker build context.

The ten sample photographs are cropped development fixtures sourced from
[Unsplash](https://unsplash.com/license). Their source photo identifiers are
preserved in `sources.md`.
