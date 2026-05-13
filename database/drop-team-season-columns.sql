alter table public.teams
  drop column if exists points,
  drop column if exists goals_scored,
  drop column if exists goals_against,
  drop column if exists league_group,
  drop column if exists played,
  drop column if exists rank;
