create table if not exists app_state (
  id integer primary key,
  data text not null,
  version integer not null default 1,
  updated_at text not null
);
