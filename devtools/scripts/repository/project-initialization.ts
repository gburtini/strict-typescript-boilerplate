import { z } from "zod";

const projectInitializationSchema = z.strictObject({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/u)
    .max(64)
    .refine((name) => name !== "typescript-boilerplate", "Choose a new project name"),
  scope: z
    .string()
    .regex(/^@[a-z][a-z0-9-]*$/u)
    .max(64)
    .refine((scope) => scope !== "@template", "Choose a new package scope"),
  title: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[\p{L}\p{N} .-]+$/u),
  database: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/u)
    .max(63)
    .refine(
      (name) =>
        !["postgres", "template0", "template1"].includes(name) &&
        !name.startsWith("planner_"),
      "Choose a product database name, outside the disposable planner namespace",
    ),
});

type ProjectInitialization = z.infer<typeof projectInitializationSchema>;

function initializeText(source: string, project: ProjectInitialization): string {
  return source
    .replaceAll("@template", project.scope)
    .replaceAll("typescript-boilerplate", project.name)
    .replaceAll("typescript_boilerplate", project.database)
    .replaceAll("TypeScript Boilerplate", project.title);
}

export { initializeText, projectInitializationSchema };
