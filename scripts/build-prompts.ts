#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";

const DATASET_DIR = "dataset";
const SCAFFOLDS_DIR = "scaffolds";
const OUTPUT_DIR = "prompts_out_scaffold";
const TEMPLATE_PATH = "prompts/templates/sol-and-scaffold.txt";

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

function extractContractName(src: string): string | null {
  const m = src.match(/contract\s+([A-Za-z0-9_]+)/);
  return m ? m[1] : null;
}

function extractSolidityVersion(src: string): string {
  const m = src.match(/pragma\s+solidity\s+([^;]+)/);
  return m ? m[1].trim() : "unknown";
}

function extractCtorParams(src: string): string {
  const m = src.match(/constructor\s*\(([^)]*)\)/);
  if (!m) return "None.";
  const inside = m[1].trim();
  return inside.length > 0 ? inside : "None.";
}

function detectSizeFromPath(p: string): string {
  const parts = p.split(path.sep).map((x) => x.toLowerCase());
  if (parts.includes("small")) return "small";
  if (parts.includes("medium")) return "medium";
  if (parts.includes("large")) return "large";
  return "other";
}

function findScaffold(size: string, name: string): string {
  const p = path.join(SCAFFOLDS_DIR, size, `${name}.scaffold.ts`);
  return fs.existsSync(p) ? read(p) : "";
}

async function main() {
  const template = read(TEMPLATE_PATH);

  let generated = 0;
  let skipInvalid = 0;

  for (const f of walk(DATASET_DIR)) {
    if (!f.endsWith(".sol")) continue;

    const size = detectSizeFromPath(f);
    if (size === "other") continue;

    const contractSource = read(f);
    const contractName = extractContractName(contractSource);
    if (!contractName) {
      skipInvalid++;
      continue;
    }

    const solVersion = extractSolidityVersion(contractSource);
    const ctorParams = extractCtorParams(contractSource);

    const scaffold = findScaffold(size, contractName);

    const finalPrompt = template
      .replace(/{CONTRACT}/g, contractSource)
      .replace(/{SCAFFOLD}/g, scaffold)
      .replace(/{SOL_VERSION}/g, solVersion)
      .replace(/{SOLIDITY_VERSION}/g, solVersion)
      .replace(/{CTOR_PARAMS}/g, ctorParams)
      .replace(/{CONSTRUCTOR_PARAMS}/g, ctorParams)
      .replace(/{ETHERS_VERSION}/g, "v5");

    const outPath = path.join(
      OUTPUT_DIR,
      size,
      `${contractName}.prompt.txt`
    );

    write(outPath, finalPrompt);
    console.log("→", outPath);
    generated++;
  }

  console.log(`
──────── SUMMARY ────────
Prompt generati: ${generated}
Contratti invalidi: ${skipInvalid}
`);
}

main();