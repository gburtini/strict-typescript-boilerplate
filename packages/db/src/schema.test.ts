import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

const snakeCaseName = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
type SchemaValue = (typeof schema)[keyof typeof schema];
type SchemaTable = Extract<SchemaValue, PgTable>;
const tables = Object.values(schema)
  .filter((value): value is SchemaTable => is(value, PgTable))
  .map((table) => getTableConfig(table));

describe("database schema policy", () => {
  it.each(tables)("$name has a primary key", (table) => {
    expect.hasAssertions();

    const inlinePrimaryKeyCount = table.columns.filter(
      (column) => column.primary,
    ).length;

    expect(inlinePrimaryKeyCount + table.primaryKeys.length).toBeGreaterThan(0);
  });

  it.each(tables)("$name uses snake_case identifiers", (table) => {
    expect.hasAssertions();

    expect(snakeCaseName.test(table.name)).toBeTruthy();
    expect(
      table.columns.every((column) => snakeCaseName.test(column.name)),
    ).toBeTruthy();
  });

  it.each(tables)("$name gives foreign keys explicit actions", (table) => {
    expect.hasAssertions();

    expect(
      table.foreignKeys.every((foreignKey) => Boolean(foreignKey.onDelete)),
    ).toBeTruthy();
    expect(
      table.foreignKeys.every((foreignKey) => Boolean(foreignKey.onUpdate)),
    ).toBeTruthy();
  });
});
