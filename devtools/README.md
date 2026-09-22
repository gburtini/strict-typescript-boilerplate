# Repository Devtools

This directory contains tooling that maintains or inspects the repository. It
is not the database schema or application data model.

- `scripts/repository/` holds repository checks and generated reports.
- `scripts/database/` holds database maintenance and query-plan commands.
- `query-plans/` holds the sanitized planner fixture and reviewed baselines.
- `schemas/` holds JSON schemas for repository tooling metadata.
- `quality/semantic/` holds semantic lint policy and evaluation fixtures.
- `dependency-cruiser/` holds dependency boundary rules and its isolated tool
  package.

Database runtime schemas, migrations, and query capture implementation remain
in `packages/db/`.
