#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";

const DEFAULT_SCAFFOLD_DIR = "scaffolds";
const DEFAULT_OUT_DIR = "prompts_out";
const DEFAULT_TEMPLATE_PATH = "prompts/templates/only-sol.template.txt";

function read(p: string) {
  return fs.readFileSync(p, "utf-8");
}

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

function extractContractNameFromFilename(filename: string): string | null {
  const m = filename.match(/^([A-Z][A-Za-z0-9_]*)\.scaffold/);
  return m ? m[1] : null;
}

function extractSolidityVersion(src: string): string {
  const m = src.match(/pragma\s+solidity\s+([^;]+)/);
  return m ? m[1].trim() : "unknown";
}

function extractConstructorParams(src: string): string {
  const m = src.match(/constructor\s*\(([^)]*)\)/);
  if (!m) return "None.";
  const inner = m[1].trim();
  return inner.length > 0 ? inner : "None.";
}

function findContractSourceByName(name: string): string | null {
  const CONTRACTS_DIR = "contracts";

  for (const f of walk(CONTRACTS_DIR)) {
    if (!f.endsWith(".sol")) continue;
    const content = read(f);
    if (new RegExp(`contract\\s+${name}\\b`).test(content)) {
      return content;
    }
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);

  // -------------------------------------------------
  // ARGOMENTI SCRIPT: 
  //  arg[0] = output directory (anche se non esiste)
  //  arg[1] = template path (opzionale)
  // -------------------------------------------------

  const outDir = args[0] ? args[0] : DEFAULT_OUT_DIR;
  let templatePath = args[1] && fs.existsSync(args[1])
    ? args[1]
    : DEFAULT_TEMPLATE_PATH;

  templatePath = path.resolve(templatePath);

  // Crea output dir se non esiste
  fs.mkdirSync(outDir, { recursive: true });

  const scaffoldDir = DEFAULT_SCAFFOLD_DIR;

  // Carica template
  const template = read(templatePath);

  let count = 0;
  let skipName = 0;
  let skipNotFound = 0;
  let found = 0;

  console.log("Scanning scaffolds…");

  for (const f of walk(scaffoldDir)) {
    if (!/\.scaffold(\.spec)?\.ts$/i.test(f)) continue;

    const fileName = path.basename(f);
    const scaffold = read(f);

    const contractName = extractContractNameFromFilename(fileName);
    if (!contractName) {
      console.log(`⚠ Skip: nome non valido → ${fileName}`);
      skipName++;
      continue;
    }

    const solSource = findContractSourceByName(contractName);
    if (!solSource) {
      console.log(`⚠ Contratto non trovato per ${contractName}`);
      skipNotFound++;
      continue;
    }

    found++;

    const solVersion = extractSolidityVersion(solSource);
    const ctorParams = extractConstructorParams(solSource);

    const finalPrompt = template
      .replace(/{ETHERS_VERSION}/g, "v5")
      .replace(/{CONTRACT}/g, solSource)
      .replace(/{SCAFFOLD}/g, scaffold)
      .replace(/{SOL_VERSION}/g, solVersion)
      .replace(/{SOLIDITY_VERSION}/g, solVersion)
      .replace(/{CTOR_PARAMS}/g, ctorParams)
      .replace(/{CONSTRUCTOR_PARAMS}/g, ctorParams);

    const outPath = path.join(outDir, contractName, `${contractName}.prompt.txt`);
    write(outPath, finalPrompt);

    console.log("→", outPath);
    count++;
  }

  console.log(`
──────── SUMMARY ────────
Prompt generati: ${count}
Scaffold invalidi: ${skipName}
Contratti trovati: ${found}
Contratti non trovati: ${skipNotFound}
Template usato: ${templatePath}
Output dir: ${outDir}
  `);
}

main();