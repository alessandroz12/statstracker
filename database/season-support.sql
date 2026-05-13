alter table public.matches
  add column if not exists league_id integer not null default 218,
  add column if not exists season integer not null default 2024;

create table if not exists public.team_seasons (
  team_id integer not null references public.teams(id) on delete cascade,
  league_id integer not null,
  season integer not null,
  points integer not null default 0,
  goals_scored integer not null default 0,
  goals_against integer not null default 0,
  league_group text,
  played integer not null default 0,
  rank integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (team_id, league_id, season)
);

insert into public.team_seasons (
  team_id,
  league_id,
  season,
  points,
  goals_scored,
  goals_against,
  league_group,
  played,
  rank
)
select
  id,
  218,
  2024,
  points,
  goals_scored,
  goals_against,
  league_group,
  played,
  rank
from public.teams
on conflict (team_id, league_id, season) do update set
  points = excluded.points,
  goals_scored = excluded.goals_scored,
  goals_against = excluded.goals_against,
  league_group = excluded.league_group,
  played = excluded.played,
  rank = excluded.rank;

create index if not exists team_seasons_league_season_idx
  on public.team_seasons (league_id, season, rank);

create index if not exists matches_league_season_idx
  on public.matches (league_id, season);

grant select, insert, update on public.team_seasons to anon, authenticated;
grant select, insert, update on public.matches to anon, authenticated;
