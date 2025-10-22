#!/usr/bin/env ts-node
import * as fs from "fs";
import * as path from "path";


// Usage: npx ts-node scripts/build-prompts.ts [scaffoldDir] [outDir] [templatePath] [--include=regex]
const DEFAULT_SCAFFOLD_DIR = "scaffolds";
const DEFAULT_OUT_DIR = "prompts_out";
const DEFAULT_TEMPLATE_PATH = "prompts/templates/coverage.txt";

function read(p: string) { return fs.readFileSync(p, "utf-8"); }
function write(p: string, s: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf-8");
}
function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.isFile()) yield f;
  }
}
function baseName(f: string) { return path.basename(f).replace(/\.scaffold\.spec\.ts$/i, ""); }

function getSizeFromPath(p: string): string {
  // expects path like scaffolds/{size}/...
  const parts = p.split(path.sep);
  const idx = parts.findIndex(part => ["small", "medium", "large", "empty"].includes(part));
  return idx !== -1 ? parts[idx] : "other";
}

function findContractSource(name: string, size: string): string | null {
  // Try to find the .sol file in contracts/{size}/
  const contractsDir = path.join("contracts", size);
  if (!fs.existsSync(contractsDir)) return null;
  const files = fs.readdirSync(contractsDir);
  // 1. Exact match
  for (const file of files) {
    if (file.endsWith(".sol") && file.replace(/\.sol$/,"") === name) {
      console.log(`[findContractSource] Exact match: ${file}`);
      return read(path.join(contractsDir, file));
    }
  }
  // 2. Case-insensitive match
  for (const file of files) {
    if (file.endsWith(".sol") && file.replace(/\.sol$/i,"").toLowerCase() === name.toLowerCase()) {
      console.log(`[findContractSource] Case-insensitive match: ${file}`);
      return read(path.join(contractsDir, file));
    }
  }
  // 3. Partial match (contains)
  for (const file of files) {
    if (file.endsWith(".sol") && file.toLowerCase().includes(name.toLowerCase())) {
      console.log(`[findContractSource] Partial match: ${file}`);
      return read(path.join(contractsDir, file));
    }
  }
  console.log(`[findContractSource] No match for: ${name} in ${contractsDir}`);
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const scaffoldDir = args[0] || DEFAULT_SCAFFOLD_DIR;
  const outDir = args[1] || DEFAULT_OUT_DIR;
  const templatePath = args[2] || DEFAULT_TEMPLATE_PATH;
  const includeArg = args.find(a => a.startsWith("--include="));
  const includeRe = includeArg ? new RegExp(includeArg.split("=")[1]) : null;

  // Load the template
  const template = read(templatePath);

  let made = 0;
  for (const f of walk(scaffoldDir)) {
    if (!f.endsWith(".scaffold.spec.ts")) continue;
    const name = baseName(f);
    if (includeRe && !includeRe.test(name)) continue;

    const scaffold = read(f);
    const size = getSizeFromPath(f);
    const contractSource = findContractSource(name, size) || "// Contract source not found";

    // Replace {CONTRACT} and {SCAFFOLD} in template
    let promptText = template.replace(/{CONTRACT}/g, contractSource).replace(/{SCAFFOLD}/g, scaffold);

    const outPath = path.join(outDir, size, `${name}.prompt.txt`);
    write(outPath, promptText);
    console.log("→", outPath);
    made++;
  }
  console.log(`\nCreated ${made} prompts in ${outDir}/[size] using template ${templatePath}`);
}
main();