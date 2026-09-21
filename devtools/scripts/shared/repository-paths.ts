import nodePath from "node:path";

const repositoryRoot = nodePath.resolve(import.meta.dirname, "../../..");

function resolveRepositoryPath(...segments: string[]): string {
  return nodePath.resolve(repositoryRoot, ...segments);
}

export { repositoryRoot, resolveRepositoryPath };
