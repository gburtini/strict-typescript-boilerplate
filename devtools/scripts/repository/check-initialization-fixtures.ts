import {
  initializeText,
  projectInitializationSchema,
} from "./project-initialization.ts";
import { expectRejection } from "../shared/expect-rejection.ts";

const fixture = {
  name: "sample-project",
  scope: "@sample",
  title: "Sample Project",
  database: "sample_project",
};
const project = projectInitializationSchema.parse(fixture);
const collision = projectInitializationSchema.parse({
  ...fixture,
  scope: "@typescript-boilerplate",
  title: "TypeScript Boilerplate Studio",
});
if (
  initializeText("@template/core TypeScript Boilerplate", collision) !==
  "@typescript-boilerplate/core TypeScript Boilerplate Studio"
) {
  throw new Error("Initialization must preserve configured replacement values");
}
if (
  initializeText(
    "@template/core typescript-boilerplate typescript_boilerplate TypeScript Boilerplate",
    project,
  ) !== "@sample/core sample-project sample_project Sample Project"
) {
  throw new Error(
    "Initialization must update all runtime and workspace identities together",
  );
}
for (const invalid of [
  { ...fixture, name: "../outside" },
  { ...fixture, scope: "sample" },
  { ...fixture, title: "<script>" },
  { ...fixture, database: "postgres" },
  { ...fixture, database: "planner_product" },
  { ...fixture, database: "a".repeat(64) },
  { ...fixture, extra: true },
]) {
  expectRejection(() => projectInitializationSchema.parse(invalid), "");
}
process.stdout.write("Project initialization positive and negative fixtures passed.\n");
