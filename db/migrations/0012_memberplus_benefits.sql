alter table public.profiles
  add column if not exists member_plus_union_id text,
  add column if not exists member_plus_union_name text;

alter table public.profiles
  add constraint profiles_member_plus_union_pair
  check ((member_plus_union_id is null and member_plus_union_name is null) or (member_plus_union_id is not null and member_plus_union_name is not null));
