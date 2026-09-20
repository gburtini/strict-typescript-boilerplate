TRUNCATE TABLE users;

INSERT INTO users (id, email, created_at, updated_at)
SELECT
  gen_random_uuid(),
  format('query-plan-user-%s@example.test', series),
  now() - (series * interval '1 minute'),
  now() - (series * interval '1 minute')
FROM generate_series(1, 10000) AS series;

ANALYZE users;
