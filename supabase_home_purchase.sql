alter table public.home_purchase_simulations
  add column if not exists bank_financing_percent numeric not null default 80;
