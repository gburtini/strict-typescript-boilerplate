const minimumNode = { major: 24, minor: 13, patch: 1 } as const;
const versionMatch = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/u.exec(
  process.versions.node,
);

if (versionMatch === null) {
  throw new Error(`Unable to parse Node.js version: ${process.versions.node}`);
}

const major = Number(versionMatch.groups?.major ?? 0);
const minor = Number(versionMatch.groups?.minor ?? 0);
const patch = Number(versionMatch.groups?.patch ?? 0);
const belowMinimum =
  major < minimumNode.major ||
  (major === minimumNode.major && minor < minimumNode.minor) ||
  (major === minimumNode.major &&
    minor === minimumNode.minor &&
    patch < minimumNode.patch);

if (belowMinimum) {
  throw new Error(
    `Node.js ${minimumNode.major}.${minimumNode.minor}.${minimumNode.patch}+ is required; found ${process.versions.node}.`,
  );
}

export const runtimeCheck = true;
