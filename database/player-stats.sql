create table if not exists public.players (
  id integer primary key,
  name text not null,
  firstname text,
  lastname text,
  age integer,
  nationality text,
  photo_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.player_season_stats (
  player_id integer not null references public.players(id) on delete cascade,
  team_id integer not null,
  league_id integer not null,
  season integer not null,
  appearances integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  yellow_cards integer not null default 0,
  red_cards integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, team_id, league_id, season)
);

create index if not exists player_season_stats_team_season_idx
  on public.player_season_stats (team_id, league_id, season);

grant select, insert, update on public.players to anon, authenticated;
grant select, insert, update on public.player_season_stats to anon, authenticated;
