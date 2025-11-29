#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import solc from 'solc';

// ---------------- CONFIGURAZIONE ---------------------
const CONFIG = {
  initialTemplate: "prompts/templates/only-sol.template.txt", 
  retryTemplate: "prompts/templates/retry_template.txt",     
  outDir: "prompts_out",
  datasetRoot: "dataset", 
  reportFile: "dataset/report.json",
  separator: "==========RETRY_TEMPLATE_SPLIT=========="
};

let contractMetadata: any = {};

// ---------------- UTILS ---------------------

function read(p: string) { return fs.readFileSync(p, "utf-8"); }
function write(p: string, s: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf-8");
}

// Rimuove commenti per risparmiare token
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').replace(/^\s*[\r\n]/gm, '');
}

/**
 * RECURSIVE FLATTENER
 * Risolve gli import locali (./File.sol) iniettando il codice.
 */
function resolveLocalImports(sourceCode: string, currentFilePath: string, importedSet = new Set<string>()): string {
  const importRegex = /import\s+(?:["'])([\.\/][^"']+)["'];/g;

  return sourceCode.replace(importRegex, (match, importPath) => {
    try {
      const currentDir = path.dirname(currentFilePath);
      const resolvedPath = path.resolve(currentDir, importPath);

      if (importedSet.has(resolvedPath)) return `// SKIP LOOP: ${importPath}`;
      importedSet.add(resolvedPath);

      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
        const cleanContent = fileContent.replace(/\/\/ SPDX-License-Identifier:.*\n?/g, '').replace(/pragma solidity.*\n?/g, '');
        const flattenedChild = resolveLocalImports(cleanContent, resolvedPath, importedSet);
        return `\n// --- START: ${importPath} ---\n${flattenedChild}\n// --- END: ${importPath} ---\n`;
      } else {
        return match; 
      }
    } catch (e) { return match; }
  });
}

function* walk(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.endsWith(".sol")) yield full;
  }
}

// ---------------- METADATA & ANALISI ---------------------

function loadMetadata() {
  const reportPath = path.resolve(CONFIG.reportFile);
  if (fs.existsSync(reportPath)) {
    try { contractMetadata = JSON.parse(read(reportPath)); } 
    catch (e) { console.error(`❌ Error parsing report:`, e); }
  }
}

function analyzeContractSolc(source: string): string[] {
  const codeCleaned = source.replace(/^\s*import\s+[^;]+;/gm, ''); 
  try {
    const input = { language: 'Solidity', sources: { 'C.sol': { content: codeCleaned } }, settings: { outputSelection: { '*': { '*': ['abi'] } } } };
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (!output.contracts || !output.contracts['C.sol']) return [];
    return Object.keys(output.contracts['C.sol']);
  } catch { return []; }
}

function extractContractNameFallback(code: string): string | null {
  const match = code.match(/(?:abstract\s+)?(?:contract|interface|library)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  return match ? match[1] : null;
}

// ---------------- MAIN ---------------------

function fillTemplate(template: string, data: any): string {
  let content = template;
  for (const [key, value] of Object.entries(data)) {
    content = content.split(`{${key}}`).join(String(value));
  }
  return content;
}

function detectSizeFromPath(f: string): string {
  const parts = f.split(path.sep).map(x => x.toLowerCase());
  if (parts.includes("small")) return "small";
  if (parts.includes("medium")) return "medium";
  if (parts.includes("large")) return "large";
  return "other";
}

async function main() {
  console.log("🚀 Starting build-prompts with FLATTENER & UNIQUE NAMES...");
  loadMetadata(); 

  const tplInitial = read(CONFIG.initialTemplate);
  const tplRetry = read(CONFIG.retryTemplate);

  let generated = 0;

  for (const f of walk(CONFIG.datasetRoot)) {
    const rawSolCode = read(f);
    const filename = path.basename(f); 
    const size = detectSizeFromPath(f);

    // 1. Flattening
    const flattenedCode = resolveLocalImports(rawSolCode, f);

    // 2. Analisi Nome
    let contractNames = analyzeContractSolc(flattenedCode);
    let contractName = contractNames.length > 0 ? contractNames[0] : extractContractNameFallback(rawSolCode);

    if (!contractName) continue;

    // 3. FQN Relativo alla Root (Fondamentale per HH700)
    const relativePath = path.relative(process.cwd(), f).split(path.sep).join('/');
    const fqn = `${relativePath}:${contractName}`;

    // 4. Estrazione Dati
    const solVersion = (rawSolCode.match(/pragma\s+solidity\s+([^;]+)/) || [])[1] || '0.8.0';
    const ctorParams = (rawSolCode.match(/constructor\s*\(([^)]*)\)/) || [])[1] || 'None.';

    // 5. Context (Minificato per risparmiare token sui Large)
    const cleanCode = stripComments(flattenedCode);

    const contextData = {
      CONTRACT: cleanCode,          
      CONTRACT_CONTENT: cleanCode,  
      SOL_VERSION: solVersion,
      ETHERS_VERSION: "v5",
      CTOR_PARAMS: ctorParams,
      FQN_LABEL: fqn              
    };

    const finalContent = `${fillTemplate(tplInitial, contextData)}\n\n${CONFIG.separator}\n\n${fillTemplate(tplRetry, contextData)}`;
    
    // 6. NOME FILE UNIVOCO (ID Originale + Nome Contratto)
    const originalId = filename.replace('.sol', ''); 
    const safeContractName = contractName.replace(/[^a-z0-9_]/gi, '');
    const uniqueName = `${originalId}_${safeContractName}`;

    const outPath = path.join(CONFIG.outDir, size, `${uniqueName}.prompt.txt`);
    
    write(outPath, finalContent);
    generated++;
    
    if (generated % 50 === 0) process.stdout.write(".");
  }

  console.log(`\n✅ Finished! Generated: ${generated} prompts.`);
}

main().catch(e => console.error(e));