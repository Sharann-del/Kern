-- PostgREST upsert emits ON CONFLICT (collection_id, external_id) without a matching
-- partial-index predicate, so it fails against the partial unique index from 00011.
-- A full UNIQUE constraint still allows multiple manual rows with external_id NULL
-- (PostgreSQL treats NULLs as distinct in UNIQUE).
drop index if exists public.rows_collection_external_id_unique;

alter table public.rows
  add constraint rows_collection_external_id_unique unique (collection_id, external_id);
