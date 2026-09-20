const maximumMajor = 25;
const minimumNode = { major: 24, minor: 13, patch: 1 } as const;
const [major = 0, minor = 0, patch = 0] = process.versions.node.split(".").map(Number);
const atOrAboveMaximum = major >= maximumMajor;
const belowMinimum =
  major < minimumNode.major ||
  (major === minimumNode.major && minor < minimumNode.minor) ||
  (major === minimumNode.major &&
    minor === minimumNode.minor &&
    patch < minimumNode.patch);

if (belowMinimum || atOrAboveMaximum) {
  throw new Error(
    `Node.js >=${minimumNode.major}.${minimumNode.minor}.${minimumNode.patch} <${maximumMajor} is required; found ${process.versions.node}.`,
  );
}

export const runtimeCheck = true;
