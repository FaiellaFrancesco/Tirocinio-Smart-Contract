#!/usr/bin/env ts-node
/**
 * build-prompts.ts
 *
 * Questo script genera i file di prompt per LLM a partire dai contratti Solidity e dagli scaffold di test.
 * Per ogni scaffold trovato nella cartella indicata, cerca il relativo contratto Solidity, carica il template scelto
 * e sostituisce i placeholder {CONTRACT} e {SCAFFOLD} con il codice del contratto e dello scaffold.
 *
 * I prompt generati vengono salvati nella cartella di output, suddivisi per dimensione (small, medium, large, ...).
 *
 * Uso:
 *   npx ts-node scripts/build-prompts.ts [scaffoldDir] [outDir] [templatePath] [--include=regex]
 *   - scaffoldDir: cartella degli scaffold di test (default: scaffolds)
 *   - outDir: cartella di output per i prompt generati (default: prompts_out)
 *   - templatePath: percorso del template da usare (default: prompts/templates/coverage.txt)
 *   - --include=regex: (opzionale) genera solo i prompt che corrispondono al regex
 *
 * Esempio:
 *   npx ts-node scripts/build-prompts.ts scaffolds prompts_out prompts/templates/only-sol.template.txt
 */
import * as fs from "fs";
import * as path from "path";


// Usage: npx ts-node scripts/build-prompts.ts [scaffoldDir] [outDir] [templatePath] [--include=regex]
const DEFAULT_SCAFFOLD_DIR = "scaffolds";
const DEFAULT_OUT_DIR = "prompts_out";
const DEFAULT_TEMPLATE_PATH = "prompts/templates/only-sol-template2.txt";

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
  // Cerca il file .sol con hash nel nome (pattern: ...__size__<hash>)
  const contractsDir = path.join("contracts", size);
  if (!fs.existsSync(contractsDir)) return null;
  // Estrai hash dal nome (es: OwnbitMultiSigProxy__small__0xb65a6bcfce2d2ad60712cee5ef53b93e83f48a37)
  const hashMatch = name.match(/__([a-z]+)__([0-9a-fA-Fx]+)/);
  if (!hashMatch) return null;
  const hash = hashMatch[2];
  const files = fs.readdirSync(contractsDir);
  for (const file of files) {
    if (!file.endsWith(".sol")) continue;
    if (file.includes(hash)) {
      const filePath = path.join(contractsDir, file);
      const content = read(filePath);
      console.log(`[findContractSource] Found contract for hash '${hash}' in: ${file}`);
      return content;
    }
  }
  console.log(`[findContractSource] No contract for hash '${hash}' found in ${contractsDir}`);
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const scaffoldDir = args[0] || DEFAULT_SCAFFOLD_DIR;
  const outDir = args[1] || DEFAULT_OUT_DIR;
  const templatePath = path.resolve(args[2] || DEFAULT_TEMPLATE_PATH);
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