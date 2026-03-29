-- Phone-only and some OAuth identities may not populate auth.users.email; profiles.email is NOT NULL.
-- Prefer email, then phone; map common provider metadata keys for display name.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb;
  display_name text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display_name := coalesce(
    nullif(trim(both from coalesce(meta->>'full_name', '')), ''),
    nullif(trim(both from coalesce(meta->>'name', '')), ''),
    nullif(
      trim(
        both from concat_ws(
          ' ',
          nullif(trim(both from coalesce(meta#>>'{given_name}', '')), ''),
          nullif(trim(both from coalesce(meta#>>'{family_name}', '')), '')
        )
      ),
      ''
    )
  );
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(both from coalesce(new.email::text, '')), ''),
      nullif(trim(both from coalesce(new.phone::text, '')), ''),
      ''
    ),
    display_name,
    nullif(trim(both from coalesce(meta->>'avatar_url', '')), '')
  );
  return new;
end;
$$;
