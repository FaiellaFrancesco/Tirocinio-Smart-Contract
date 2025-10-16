#!/usr/bin/env ts-node
import * as fs from "fs";
import * as path from "path";

// Uso: npx ts-node scripts/build-prompts.ts [scaffoldDir] [outDir] [--include=regex]
const DEFAULT_SCAFFOLD_DIR = "scaffolds/eng1";
const DEFAULT_OUT_DIR = "prompts_out_eng";

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

function main() {
  const args = process.argv.slice(2);
  const scaffoldDir = args[0] || DEFAULT_SCAFFOLD_DIR;
  const outDir = args[1] || DEFAULT_OUT_DIR;
  const includeArg = args.find(a => a.startsWith("--include="));
  const includeRe = includeArg ? new RegExp(includeArg.split("=")[1]) : null;

  // Load the template
  const templatePath = "prompts/templates/coverage-eng.txt";
  const template = read(templatePath);

  let made = 0;
  for (const f of walk(scaffoldDir)) {
    if (!f.endsWith(".scaffold.spec.ts")) continue;
    const name = baseName(f);
    if (includeRe && !includeRe.test(name)) continue;

    const scaffold = read(f);

    // Use the template and replace the scaffold content
    const promptText = template.replace("{{SCAFFOLD_CONTENT}}", scaffold);
    const outPath = path.join(outDir, "coverage", `${name}.coverage.prompt.txt`);
    write(outPath, promptText);
    console.log("→", outPath);
    made++;
  }
  console.log(`\nCreati ${made} prompt in ${outDir}/coverage usando template ${templatePath}`);
}
main();