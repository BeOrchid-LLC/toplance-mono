import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Which test files reach the database.
 *
 * `vitest.config.mts` needs this to keep the database-backed suites off
 * each other. It is derived from the import graph rather than written
 * out as a list of paths, because the list is 48 files across 13
 * directories with nothing in common but what they import — a glob
 * cannot express it, and a hand-kept array is one new test away from
 * being wrong in the direction that looks green.
 *
 * The cost of getting it wrong is not a failing suite, it is a suite
 * that fails somewhere else: a file left in the parallel project takes
 * row locks against one Postgres alongside twelve others, and what comes
 * back is a timeout in a test that has no fault of its own.
 */

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const CLIENT = join(SRC, "lib/db/client.ts");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

function resolveImport(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // a package, and no package here owns the pool

  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Static `from "x"` and dynamic `import("x")` both.
 *
 * The dynamic form is the one that matters: these suites import the pool
 * inside a hook rather than at module load, so a checkout with no
 * `DATABASE_URL` skips them instead of throwing on import. A scan that
 * reads only static imports therefore finds almost none of the files it
 * is looking for — it reported 11 of 48 before this line existed.
 */
function importsOf(source: string, file: string): string[] {
  const specs = [
    ...[...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...source.matchAll(/import\s*\(\s*["']([^"']+)["']/g)].map((m) => m[1]),
  ];
  return specs.map((s) => resolveImport(s, file)).filter((p): p is string => p !== null);
}

export function databaseBackedTests(): string[] {
  const files = walk(SRC);
  const graph = new Map<string, string[]>();
  for (const file of files) graph.set(file, importsOf(readFileSync(file, "utf8"), file));

  /**
   * Breadth-first from each test file, with a visited set per root.
   *
   * Deliberately not memoised across roots. Memoising caches the `false`
   * that the cycle guard returns, and that `false` is a fact about the
   * path taken rather than about the file — the first version of this
   * did memoise, and under-reported by a factor of four.
   */
  const reaches = (root: string): boolean => {
    const seen = new Set([root]);
    const queue = [root];
    while (queue.length > 0) {
      const file = queue.shift() as string;
      if (file === CLIENT) return true;
      for (const dep of graph.get(file) ?? []) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        queue.push(dep);
      }
    }
    return false;
  };

  return files
    .filter((f) => f.endsWith(".test.ts"))
    .filter(reaches)
    .map((f) => relative(ROOT, f))
    .sort();
}
