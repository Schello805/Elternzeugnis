import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

function read(command, fallback) {
  try {
    return execSync(command, { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const revision = read("git rev-parse --short HEAD", "dev");
const branch = read("git branch --show-current", "local");
const releasedAt = new Date().toISOString();
const target = resolve(root, "src/generated/version.ts");

mkdirSync(dirname(target), { recursive: true });
writeFileSync(
  target,
  `export const appVersion = ${JSON.stringify(pkg.version)};\n` +
    `export const appRevision = ${JSON.stringify(revision)};\n` +
    `export const appBranch = ${JSON.stringify(branch)};\n` +
    `export const appBuildTime = ${JSON.stringify(releasedAt)};\n`,
);
