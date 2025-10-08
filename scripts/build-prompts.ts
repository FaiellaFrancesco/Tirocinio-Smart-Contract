#!/usr/bin/env ts-node
import * as fs from "fs";
import * as path from "path";

const DEFAULT_SCAFFOLD_DIR = "tests/llm";
const DEFAULT_TPL_DIR = "prompts/templates";
const DEFAULT_OUT_DIR = "prompts_out";

function read(p: string) { return fs.readFileSync(p, "utf-8"); }
function write(p: string, s: string) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, "utf-8"); }

function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.isFile()) yield f;
  }
}
function baseName(f: string) { return path.basename(f).replace(/\.scaffold\.spec\.ts$/i, ""); }

function main() {
  const args = process.argv.slice(2);
  const root = process.cwd();
  const scaffoldDir = path.resolve(root, args[0] || DEFAULT_SCAFFOLD_DIR);
  const outDir = path.resolve(root, args[1] || DEFAULT_OUT_DIR);
  const tplDir = path.resolve(root, DEFAULT_TPL_DIR);
  const includeArg = args.find(a => a.startsWith("--include="));
  const includeRe = includeArg ? new RegExp(includeArg.split("=")[1]) : null;

  const tplPath = path.join(tplDir, "coverage.txt");
  if (!fs.existsSync(tplPath)) {
    console.error("Template file not found:", tplPath);
    process.exit(1);
  }
  const tplCoverage = read(tplPath);
  if (!tplCoverage || tplCoverage.trim().length === 0) {
    console.error("Template file is empty:", tplPath);
    process.exit(1);
  }

  let made = 0;
  if (!fs.existsSync(scaffoldDir)) {
    console.error("Scaffold directory not found:", scaffoldDir);
    process.exit(1);
  }
  for (const f of walk(scaffoldDir)) {
    if (!f.endsWith(".scaffold.spec.ts")) continue;
    const name = baseName(f);
    if (includeRe && !includeRe.test(name)) continue;

    const scaffold = read(f);
    // Use a replacer function to avoid treating $ in scaffold as replacement patterns
    const promptText = tplCoverage.replace(/{{SCAFFOLD_CONTENT}}/g, () => scaffold);
    if (!promptText || promptText.trim().length === 0) {
      console.warn("Skipping empty prompt for:", name);
      continue;
    }
    const outPath = path.join(outDir, "coverage", `${name}.coverage.prompt.txt`);
    write(outPath, promptText);
    console.log("→", outPath);
    made++;
  }
  console.log(`\nCreati ${made} prompt in ${path.relative(root, path.join(outDir, "coverage"))}`);
}
main();