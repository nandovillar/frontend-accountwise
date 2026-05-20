create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_list_options (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.user_lists(id) on delete cascade,
  text text not null,
  hidden boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_lists_user_space_idx
  on public.user_lists(user_id, space_id);

create index if not exists user_list_options_list_idx
  on public.user_list_options(list_id, position);

alter table public.user_lists enable row level security;
alter table public.user_list_options enable row level security;

drop policy if exists "Users can manage own or shared lists" on public.user_lists;
drop policy if exists "Users can manage own or shared list options" on public.user_list_options;

create policy "Users can manage own or shared lists"
  on public.user_lists
  for all
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.space_members sm
      where sm.space_id = user_lists.space_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and (
      space_id is null
      or exists (
        select 1
        from public.space_members sm
        where sm.space_id = user_lists.space_id
          and sm.user_id = auth.uid()
      )
    )
  );

create policy "Users can manage own or shared list options"
  on public.user_list_options
  for all
  using (
    exists (
      select 1
      from public.user_lists ul
      where ul.id = user_list_options.list_id
        and (
          ul.user_id = auth.uid()
          or exists (
            select 1
            from public.space_members sm
            where sm.space_id = ul.space_id
              and sm.user_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.user_lists ul
      where ul.id = user_list_options.list_id
        and (
          ul.user_id = auth.uid()
          or exists (
            select 1
            from public.space_members sm
            where sm.space_id = ul.space_id
              and sm.user_id = auth.uid()
          )
        )
    )
  );
