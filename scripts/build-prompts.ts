#!/usr/bin/env ts-node
/**
 * build-prompts.ts
 *
 * Versione Definitiva e Stabile.
 *
 * Obiettivo: Iterare su OGNI file .sol nel dataset, estrarre il nome del contratto
 * in modo affidabile (usando solc come fallback), e creare un prompt.
 *
 * USCITA: File di prompt con nome leggibile: [ContractName].prompt.txt.
 *
 * LEGGE: Tutti i file .sol in dataset/.
 * CERCA: Il file scaffold corrispondente in scaffolds/<size> (opzionale).
 */

import * as fs from 'fs';
import * as path from 'path';
// Solc è necessario per l'analisi robusta dei contratti (identificazione del nome corretto)
import solc from 'solc'; 

// ---------------- CONFIG ---------------------
const DEFAULT_SCAFFOLD_DIR = "scaffolds";
const DEFAULT_OUT_DIR = "prompts_out";
const DEFAULT_TEMPLATE = "prompts/templates/only-sol.template.txt";
// Radice dove si trovano i contratti sorgente
const DATASET_ROOT = "dataset"; 

// ---------------------------------------------

function read(p: string) {
  return fs.readFileSync(p, "utf-8");
}

function write(p: string, s: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf-8");
}

function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

// -------------------------- HELPER SOLC/ANALISI ------------------------------------

/**
 * Pulisce il nome del contratto per l'uso nel nome del file (rimuove hash e caratteri speciali).
 */
function sanitizeName(name: string): string {
  // Consente solo lettere, numeri e underscore
  return name.replace(/[^A-Za-z0-9_]/g, "");
}

/**
 * Analizza il codice sorgente usando solc per estrarre i nomi dei contratti.
 * Questo è il metodo più affidabile per trovare il nome corretto.
 */
function analyzeContractSolc(source: string): { contracts: string[] } | null {
  // Solc richiede che il codice non abbia dipendenze non risolte
  const codeWithoutImports = source.replace(/^\s*import\s+[^;]+;/gm, ''); 

  try {
    const input = {
      language: 'Solidity',
      sources: { 'C.sol': { content: codeWithoutImports } },
      settings: {
        optimizer: { enabled: false },
        outputSelection: { '*': { '*': ['abi'] } }
      }
    };
    // Compilazione sincrona e gestione output
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (!output.contracts || !output.contracts['C.sol']) return null;
    
    // I nomi dei contratti sono le chiavi dell'oggetto contracts['C.sol']
    const names = Object.keys(output.contracts['C.sol']);
    return { contracts: names };
  } catch (e) {
    // console.error("Solc analysis failed:", e); // Utile per debug
    return null;
  }
}

/**
 * Estrae il nome del contratto tramite regex come fallback.
 */
function extractContractNameFromSourceFallback(code: string): string | null {
    const regex = /(?:abstract\s+)?(?:contract|interface|library)\s+([A-Za-z_][A-Za-z0-9_]*)/i;
    const match = code.match(regex);
    return match ? match[1] : null;
}


function extractSolidityVersion(content: string): string {
  const m = content.match(/pragma\s+solidity\s+([^;]+)/);
  return m ? m[1].trim() : 'unknown';
}

function extractConstructorParams(content: string): string {
  const m = content.match(/constructor\s*\(([^)]*)\)/);
  if (!m) return 'None.';
  const inside = m[1].trim();
  return inside.length > 0 ? inside : 'None.';
}

/**
 * Cerca il file scaffold per nome e dimensione. Se trovato, restituisce il contenuto.
 */
function findScaffoldByContractName(name: string, targetSize: string): string | null {
  const scaffoldPath = path.join(DEFAULT_SCAFFOLD_DIR, targetSize, `${name}.scaffold.ts`);
  
  if (fs.existsSync(scaffoldPath)) {
    console.log(`✅ Trovato scaffold per ${name}`);
    return read(scaffoldPath);
  }
  return null;
}


function detectSizeFromPath(f: string): "small" | "medium" | "large" | "other" {
  // Deduce la dimensione dalla path: es. dataset/small/file.sol -> 'small'
  const parts = f.split(path.sep).map((x) => x.toLowerCase());
  if (parts.includes("small")) return "small";
  if (parts.includes("medium")) return "medium";
  if (parts.includes("large")) return "large";
  return "other";
}

// ------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const templatePath =
    args.find((a) => a.startsWith("--template="))?.split("=")[1] ||
    DEFAULT_TEMPLATE;

  const scaffoldDir =
    args.find((a) => a.startsWith("--scaffolds="))?.split("=")[1] ||
    DEFAULT_SCAFFOLD_DIR;

  const outDir =
    args.find((a) => a.startsWith("--out="))?.split("=")[1] ||
    DEFAULT_OUT_DIR;

  const target =
    args.find((a) => a.startsWith("--target="))?.split("=")[1] || "";

  const templateAbs = path.resolve(templatePath);
  const template = read(templateAbs);

  console.log(`📁 Template: ${templateAbs}`);
  console.log(`📁 Scaffold dir: ${scaffoldDir}`);
  console.log(`📁 Output dir: ${outDir}`);
  if (target) console.log(`🎯 Filtrando solo: ${target}`);

  let generated = 0;
  let skipInvalidName = 0;
  let skipNoScaffold = 0;

  // 💡 ITERIAMO ORA SU TUTTI I CONTRATTI SORGENTE NEL DATASET
  for (const f of walk(DATASET_ROOT)) {
    if (!f.endsWith(".sol")) continue;

    const solCode = read(f);
    const size = detectSizeFromPath(f);

    // 1. ESTRAZIONE NOME CONTRATTO (Usa solc, fallback su regex)
    let contractName = null as string | null;
    const solcRes = analyzeContractSolc(solCode);
    if (solcRes && solcRes.contracts && solcRes.contracts.length > 0) {
      // Solc è il metodo più affidabile. Prendiamo il primo contratto trovato.
      contractName = solcRes.contracts[0]; 
    } else {
      // Fallback a regex (meno affidabile, ma necessario)
      contractName = extractContractNameFromSourceFallback(solCode);
    }
    
    if (!contractName) { 
      console.log(`⚠ Skip contratto non definibile → ${f}`);
      skipInvalidName++;
      continue;
    }
    
    // Normalizzazione del nome per i file di output
    const safeContract = sanitizeName(contractName);
    if (!safeContract) {
       console.log(`⚠ Skip: Nome contratto sanitizzato vuoto per → ${f}`);
       skipInvalidName++;
       continue;
    }


    if (target && !safeContract.toLowerCase().includes(target.toLowerCase())) {
      continue;
    }

    // 2. RICERCA SCAFFOLD CORRISPONDENTE (Opzionale)
    const scaffoldContent = findScaffoldByContractName(safeContract, size);
    
    let finalScaffold = "";
    if (scaffoldContent) {
        // Se lo scaffold è stato trovato, usiamo il suo contenuto
        finalScaffold = scaffoldContent;
    } else {
        // Se lo scaffold non è stato trovato (la maggior parte dei casi)
        // Usiamo un placeholder generico e incrementiamo il contatore
        finalScaffold = "// WARNING: Scaffold non trovato. L'LLM deve generare l'intera struttura di test Hardhat e le chiamate alle funzioni.";
        skipNoScaffold++;
    }


    // 3. SOSTITUZIONE PLACEHOLDER E CREAZIONE PROMPT
    const solVersion = extractSolidityVersion(solCode);
    const ctorParams = extractConstructorParams(solCode);

    const finalPrompt = template
      .replace(/{CONTRACT}/g, solCode)
      .replace(/{SCAFFOLD}/g, finalScaffold)
      .replace(/{SOLIDITY_VERSION}/g, solVersion)
      .replace(/{SOL_VERSION}/g, solVersion)
      .replace(/{CTOR_PARAMS}/g, ctorParams)
      .replace(/{CONSTRUCTOR_PARAMS}/g, ctorParams)
      .replace(/{ETHERS_VERSION}/g, "v5");

    // L'outPath USA SOLO il nome del contratto pulito (safeContract) per la leggibilità!
    const outPath = path.join(
      outDir,
      size,
      `${safeContract}.prompt.txt` 
    );

    write(outPath, finalPrompt);

    console.log(`→ ${outPath}`);
    generated++;
  }

  console.log("\n──────── SUMMARY ──────────");
  console.log(`Prompt generati: ${generated}`);
  console.log(`Skip contratti con nome invalido: ${skipInvalidName}`);
  console.log(`Skip contratti senza scaffold trovato: ${skipNoScaffold}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("❌ Errore fatale:", err);
  process.exit(1);
});