import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { users } from "../schema";

const snakeCaseName = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
const tables = [getTableConfig(users)];

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

    expect(snakeCaseName.test(table.name)).toBe(true);
    expect(table.columns.every((column) => snakeCaseName.test(column.name))).toBe(true);
  });

  it.each(tables)("$name gives foreign keys explicit actions", (table) => {
    expect.hasAssertions();

    expect(table.foreignKeys.every((foreignKey) => Boolean(foreignKey.onDelete))).toBe(
      true,
    );
    expect(table.foreignKeys.every((foreignKey) => Boolean(foreignKey.onUpdate))).toBe(
      true,
    );
  });
});
