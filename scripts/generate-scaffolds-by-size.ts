#!/usr/bin/env ts-node
/**
 * generate-scaffolds-by-size.ts
 *
 * Genera scaffold di test per OGNI contratto trovato nei dataset suddivisi per size.
 * Estrae i nomi dei contratti, le funzioni pubbliche/esterne e i require tramite solc (fallback regex).
 * Produce uno scaffold pulito, ordinato e perfetto per la generazione LLM di test completi.
 *
 * OUTPUT:
 *   scaffolds/<size>/<ContractName>.scaffold.ts
 */

import * as fs from "fs";
import * as path from "path";
import solc from "solc";

// Percorsi dataset + contracts
const DATASET_DIR = "dataset";
const CONTRACTS_DIR = "contracts";
const SIZES = ["small", "medium", "large"];

// Output scaffolds
const OUTPUT_DIR = "scaffolds";

// Pulizia nome contratto
function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "");
}

// Cerca funzioni pubbliche/esterne via regex
function extractFunctionsRegex(src: string): string[] {
  const matches = [...src.matchAll(/function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:public|external)/g)];
  return matches.map(m => m[1]);
}

// Estrai require + messaggi
function extractRevertsRegex(src: string): Array<{ func: string; msg: string }> {
  const results: Array<{ func: string; msg: string }> = [];

  const functionBlocks = [...src.matchAll(/function\s+([A-Za-z0-9_]+)[\s\S]*?{([\s\S]*?)}/g)];

  for (const match of functionBlocks) {
    const func = match[1];
    const body = match[2];
    const reverts = [...body.matchAll(/require\s*\([^,]+,\s*["'`](.*?)["'`]\)/g)];
    for (const r of reverts) {
      results.push({ func, msg: r[1] });
    }
  }

  return results;
}

// Estrai nomi contratti
function extractContractsRegex(src: string): string[] {
  const matches = [...src.matchAll(/contract\s+([A-Za-z0-9_]+)/g)];
  return matches.map(m => m[1]);
}

// Scaffold generator
function generateScaffold(
  contractName: string,
  functions: string[],
  reverts: Array<{ func: string; msg: string }>
): string {
  let out = `
import { ethers } from "hardhat";
import { expect } from "chai";

describe("${contractName}", function () {
  async function deployFixture() {
    const factory = await ethers.getContractFactory("${contractName}");
    const contract = await factory.deploy();
    return { contract };
  }
`;

  // Descrizioni funzioni
  for (const fn of functions) {
    out += `
  describe("${fn}", function () {
    it("should execute ${fn}");
`;

    for (const r of reverts.filter(e => e.func === fn)) {
      out += `    it("should revert: ${r.msg}");\n`;
    }

    out += `  });\n`;
  }

  out += `
});
`;

  return out;
}

// Compila con solc — fallback regex se fallisce
function analyzeContractSolc(source: string): { contracts: any; abi: Record<string, any[]> } | null {
  try {
    const input = {
      language: "Solidity",
      sources: { "C.sol": { content: source } },
      settings: {
        optimizer: { enabled: false },
        outputSelection: { "*": { "*": ["abi"] } }
      }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (!output.contracts || !output.contracts["C.sol"]) return null;

    const names = Object.keys(output.contracts["C.sol"]);
    const abiMap: Record<string, any[]> = {};

    for (const name of names) {
      abiMap[name] = output.contracts["C.sol"][name].abi || [];
    }

    return { contracts: names, abi: abiMap };
  } catch {
    return null;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const LIMIT_ARG = argv.find((a) => a.startsWith("--limit="));
  const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) || 0 : 0;
  const FORCE = argv.includes("--force");

  let totalContracts = 0;
  let totalScaffolds = 0;
  let solcSuccess = 0;
  let solcFail = 0;

  const generated = new Set<string>(); // track generated contract names

  for (const size of SIZES) {
    const sizeDir = path.join(DATASET_DIR, size);
    if (!fs.existsSync(sizeDir)) continue;

    const outDir = path.join(OUTPUT_DIR, size);
    fs.mkdirSync(outDir, { recursive: true });

    const files = fs.readdirSync(sizeDir).filter(f => f.endsWith(".sol"));

    for (const file of files) {
      const filePath = path.join(sizeDir, file);
      const source = fs.readFileSync(filePath, "utf8");

      // Tenta solc
      const solcResult = analyzeContractSolc(source);

      let contractNames: string[] = [];
      let functionsByContract: Record<string, string[]> = {};
      let revertsByContract: Record<string, Array<{ func: string; msg: string }>> = {};

      if (solcResult) {
        solcSuccess++;
        contractNames = solcResult.contracts;

        for (const cname of contractNames) {
          const abi = solcResult.abi[cname] || [];
          functionsByContract[cname] = abi
            .filter(x => x.type === "function")
            .map(f => f.name);

          revertsByContract[cname] = extractRevertsRegex(source);
        }
      } else {
        solcFail++;
        // fallback regex
        contractNames = extractContractsRegex(source);

        for (const cname of contractNames) {
          functionsByContract[cname] = extractFunctionsRegex(source);
          revertsByContract[cname] = extractRevertsRegex(source);
        }
      }

      for (const cname of contractNames) {
        totalContracts++;
        if (LIMIT > 0 && totalContracts > LIMIT) break;
        if (generated.has(cname) && !FORCE) continue;

        const scaffoldContent = generateScaffold(
          cname,
          functionsByContract[cname] || [],
          revertsByContract[cname] || []
        );

        const outPath = path.join(outDir, `${sanitizeName(cname)}.scaffold.ts`);
        fs.writeFileSync(outPath, scaffoldContent, "utf8");
        totalScaffolds++;
        generated.add(cname);

        console.log(`✔ Scaffold generato: ${outPath}`);
      }
    }
  }

  // --- Process any .sol files that live in `contracts/` (flattened sources)
  if (fs.existsSync(CONTRACTS_DIR)) {
    const outDirOther = path.join(OUTPUT_DIR, "other");
    fs.mkdirSync(outDirOther, { recursive: true });

    function collectSolFiles(dir: string): string[] {
      const acc: string[] = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) acc.push(...collectSolFiles(p));
        else if (e.isFile() && p.endsWith('.sol')) acc.push(p);
      }
      return acc;
    }

    const contractFiles = collectSolFiles(CONTRACTS_DIR);
    for (const filePath of contractFiles) {
      // skip files that are inside the dataset folders (already processed)
      if (filePath.includes(path.join(DATASET_DIR, path.sep))) continue;

      const source = fs.readFileSync(filePath, 'utf8');
      const solcResult = analyzeContractSolc(source);

      let contractNames: string[] = [];
      let functionsByContract: Record<string, string[]> = {};
      let revertsByContract: Record<string, Array<{ func: string; msg: string }>> = {};

      if (solcResult) {
        solcSuccess++;
        contractNames = solcResult.contracts;
        for (const cname of contractNames) {
          const abi = solcResult.abi[cname] || [];
          functionsByContract[cname] = abi.filter(x => x.type === 'function').map((f: any) => f.name);
          revertsByContract[cname] = extractRevertsRegex(source);
        }
      } else {
        solcFail++;
        contractNames = extractContractsRegex(source);
        for (const cname of contractNames) {
          functionsByContract[cname] = extractFunctionsRegex(source);
          revertsByContract[cname] = extractRevertsRegex(source);
        }
      }

      for (const cname of contractNames) {
        totalContracts++;
        if (LIMIT > 0 && totalContracts > LIMIT) break;
        if (generated.has(cname) && !FORCE) continue;

        const scaffoldContent = generateScaffold(
          cname,
          functionsByContract[cname] || [],
          revertsByContract[cname] || []
        );

        const outPath = path.join(outDirOther, `${sanitizeName(cname)}.scaffold.ts`);
        fs.writeFileSync(outPath, scaffoldContent, 'utf8');
        totalScaffolds++;
        generated.add(cname);
        console.log(`✔ Scaffold generato (contracts/): ${outPath}`);
      }
    }
  }

  console.log(`
────────── SUMMARY ──────────
Contratti analizzati: ${totalContracts}
Scaffolds generati: ${totalScaffolds}
Compilazioni solc OK: ${solcSuccess}
Compilazioni solc FALLITE (fallback regex): ${solcFail}
Output: ${OUTPUT_DIR}/<size>/
  `);
}

main();