#!/usr/bin/env ts-node
/**
 * build-prompts.ts
 *
 * Versione Definitiva "Dual Prompt" con FQN Relativo alla Root.
 * * Funzionalità:
 * 1. Legge i contratti dalla cartella 'dataset'.
 * 2. Calcola l'FQN basato sul percorso relativo alla root del progetto
 * (es: "dataset/small/0x123.sol:ContractName").
 * 3. Compila due template (Initial + Retry).
 * 4. Unisce i due template in un unico file .prompt.txt pronto per l'uso.
 */

import * as fs from 'fs';
import * as path from 'path';
import solc from 'solc';

// ---------------- CONFIGURAZIONE ---------------------
const CONFIG = {
  // Template esistente
  initialTemplate: "prompts/templates/only-sol.template.txt", 
  // Template che devi creare
  retryTemplate: "prompts/templates/retry_template.txt",     
  
  outDir: "prompts_out",
  datasetRoot: "dataset", // La cartella dove risiedono i sorgenti .sol
  reportFile: "dataset/report.json", // Metadata
  
  separator: "==========RETRY_TEMPLATE_SPLIT=========="
};

// Mappa globale dei metadati
let contractMetadata: any = {};

// ---------------- UTILS ---------------------

function read(p: string) { return fs.readFileSync(p, "utf-8"); }
function write(p: string, s: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf-8");
}

// Cammina ricorsivamente nelle directory
function* walk(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && e.name.endsWith(".sol")) {
      yield full;
    }
  }
}

// ---------------- METADATA & ANALISI ---------------------

function loadMetadata() {
  const reportPath = path.resolve(CONFIG.reportFile);
  if (fs.existsSync(reportPath)) {
    try {
      contractMetadata = JSON.parse(read(reportPath));
      console.log(`✅ Loaded metadata from ${CONFIG.reportFile}`);
    } catch (e) {
      console.error(`❌ Error parsing ${CONFIG.reportFile}:`, e);
    }
  } else {
    console.warn(`⚠️  WARNING: ${CONFIG.reportFile} not found.`);
  }
}

// Analisi AST con Solc per trovare il nome esatto del contratto
function analyzeContractSolc(source: string): string[] {
  const codeWithoutImports = source.replace(/^\s*import\s+[^;]+;/gm, ''); 
  try {
    const input = {
      language: 'Solidity',
      sources: { 'C.sol': { content: codeWithoutImports } },
      settings: { outputSelection: { '*': { '*': ['abi'] } } }
    };
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (!output.contracts || !output.contracts['C.sol']) return [];
    return Object.keys(output.contracts['C.sol']);
  } catch { return []; }
}

function extractContractNameFallback(code: string): string | null {
  const match = code.match(/(?:abstract\s+)?(?:contract|interface|library)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  return match ? match[1] : null;
}

// ---------------- PROMPT BUILDER ---------------------

function fillTemplate(template: string, data: any): string {
  let content = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    // Sostituzione globale di tutte le occorrenze
    content = content.split(placeholder).join(String(value));
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

// ---------------- MAIN ---------------------

async function main() {
  console.log("🚀 Starting build-prompts...");
  loadMetadata(); 

  // Check template existence
  if (!fs.existsSync(CONFIG.initialTemplate)) {
    console.error(`❌ Initial template missing: ${CONFIG.initialTemplate}`);
    process.exit(1);
  }
  if (!fs.existsSync(CONFIG.retryTemplate)) {
    console.error(`❌ Retry template missing: ${CONFIG.retryTemplate}`);
    process.exit(1);
  }

  const tplInitial = read(CONFIG.initialTemplate);
  const tplRetry = read(CONFIG.retryTemplate);

  let generated = 0;

  // Itera su tutti i file nella cartella dataset
  for (const f of walk(CONFIG.datasetRoot)) {
    const solCode = read(f);
    const filename = path.basename(f); 
    const size = detectSizeFromPath(f);

    // 1. Trova Nome Contratto
    let contractNames = analyzeContractSolc(solCode);
    let contractName = contractNames.length > 0 ? contractNames[0] : extractContractNameFallback(solCode);

    if (!contractName) {
      console.log(`⚠ Skip invalid contract: ${filename}`);
      continue;
    }

    // 2. Calcola FQN (Fully Qualified Name) RELATIVO ALLA ROOT
    // Questo è il passaggio cruciale per far funzionare Hardhat senza spostare i file.
    // Restituirà qualcosa come: "dataset/small/0x123.sol"
    const relativePath = path.relative(process.cwd(), f).split(path.sep).join('/');
    const fqn = `${relativePath}:${contractName}`;

    // 3. Estrai Dati Aggiuntivi
    const solVersion = (solCode.match(/pragma\s+solidity\s+([^;]+)/) || [])[1] || '0.8.0';
    const ctorParams = (solCode.match(/constructor\s*\(([^)]*)\)/) || [])[1] || 'None.';

    // 4. Prepara il contesto dati per i template
    const contextData = {
      CONTRACT: solCode,          // Per only-sol.template.txt
      CONTRACT_CONTENT: solCode,  // Per retry_template.txt
      SOL_VERSION: solVersion,
      ETHERS_VERSION: "v5",
      CTOR_PARAMS: ctorParams,
      FQN_LABEL: fqn              // FQN corretto iniettato ovunque
    };

    // 5. Compila i template
    const prompt1 = fillTemplate(tplInitial, contextData);
    const prompt2 = fillTemplate(tplRetry, contextData);

    // 6. Unisci e Salva
    const finalContent = `${prompt1}\n\n${CONFIG.separator}\n\n${prompt2}`;
    
    const safeName = contractName.replace(/[^a-z0-9_]/gi, '');
    const outPath = path.join(CONFIG.outDir, size, `${safeName}.prompt.txt`);
    
    write(outPath, finalContent);
    generated++;
    
    if (generated % 20 === 0) console.log(`... generated ${generated} prompts.`);
  }

  console.log(`\n✅ Done! Generated ${generated} prompts in '${CONFIG.outDir}'.`);
}

main().catch(e => console.error(e));