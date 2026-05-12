create table if not exists public.team_goal_minute_stats (
  team_id integer not null,
  league_id integer not null,
  season integer not null,
  bucket text not null,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (team_id, league_id, season, bucket)
);

create index if not exists team_goal_minute_stats_team_season_idx
  on public.team_goal_minute_stats (team_id, league_id, season);

grant select, insert, update on public.team_goal_minute_stats to anon, authenticated;
