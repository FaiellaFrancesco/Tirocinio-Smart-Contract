#!/usr/bin/env npx ts-node

import { promises as fs } from 'fs';
import * as fssync from 'fs';
import { join, basename } from 'path';
import * as path from 'path';
import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import fetch from 'node-fetch';

/**
 * run-all.ts
 *
 * Questo script esegue la generazione automatica dei test per tutti i contratti Solidity usando i prompt generati.
 * Per ogni prompt nella cartella scelta, invia la richiesta al modello LLM (locale o remoto) e salva il test generato.
 *
 * Uso:
 *   npx ts-node scripts/run-all.ts
 *
 * Puoi modificare la cartella dei prompt o la configurazione LLM direttamente nel codice o tramite opzioni (se previste).
 */

// Configurazione base, modificabile da CLI
const DEFAULT_FOLDER = 'small';
const DEFAULT_MODEL = 'qwen2.5-coder:32b';
const config = {
  promptsDir: '', // impostato dopo aver letto CLI
  outputDir: './llm-out/temp',
  validOutputDir: './llm-out/valid',
  invalidOutputDir: './llm-out/invalid',
  // tempDir rimosso, non serve più
  artifactsRoot: './artifacts/contracts',
  model: DEFAULT_MODEL,
  timeout: 900 // 15 minuti
};

/* --------------------------- Utilities & helpers --------------------------- */

function normalizeSpec(content: string): string {
  return content
    // Import must come from ethers v5
    .replace(/^import\s+\{\s*ethers\s*\}\s+from\s+["']hardhat["'];?/m, 'import { ethers } from "ethers";')
    // ethers v6 -> v5
    .replace(/ethers\.parseUnits/g, 'ethers.utils.parseUnits')
    .replace(/ethers\.parseEther/g, 'ethers.utils.parseEther')
    .replace(/ethers\.ZeroAddress/g, 'ethers.constants.AddressZero')
    .replace(/ethers\.MaxUint256/g, 'ethers.constants.MaxUint256')
    // chai matcher fix
    .replace(/\.to\.properAddress/g, '.to.be.properAddress');
}

function findBannedPatterns(spec: string): string[] {
  const errors: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/\bnew\s+ethers\.(providers\.)?JsonRpcProvider\s*\(/i, 'External provider creation is forbidden. Use Hardhat network and ethers.getSigners().'],
    [/\bnew\s+ethers\.Wallet\s*\(/i, 'External wallet creation is forbidden. Use ethers.getSigners().'],
    [/\bhttps?:\/\/[^\s\'"]+/i, 'External endpoints (RPC URLs) are forbidden in unit tests.'],
    [/\bInfura|Alchemy|YOUR_INFURA|YOUR_ALCHEMY/i, 'Do not reference external RPC providers (Infura/Alchemy placeholders found).'],
    [/\bnew\s+ethers\.Contract\s*\(/i, 'Do not instantiate raw ethers.Contract in tests. Use Hardhat factories and deploy in a fixture.'],
  ];
  for (const [re, msg] of rules) {
    if (re.test(spec)) errors.push(msg);
  }
  if (/^import\s+\{\s*ethers\s*\}\s+from\s+['"]ethers['"];?/m.test(spec)) {
    errors.push('Import must be from "hardhat": use `import { ethers } from "hardhat";`.');
  }
  return errors;
}

function abiValidateSpecCalls(spec: string, abi: any[]): { ok: boolean; errors: string[] } {
  const abiFns = new Set(abi.filter(a => a.type === 'function').map(a => a.name));
  const abiEvents = new Set(abi.filter(a => a.type === 'event').map(a => a.name));

  const ethersSystemFunctions = new Set([
    'waitForDeployment','getAddress','connect','attach','deployed','deployTransaction','interface',
    'provider','signer','target','runner','getFunction','getEvent','queryFilter','on','off',
    'removeAllListeners','listenerCount','listeners','addListener','removeListener','emit'
  ]);

  const fnUse = Array.from(spec.matchAll(/contract\.(\w+)\s*\(/g)).map(m => m[1]);
  // Ignora eventi nelle righe con TODO_AI
  const lines = spec.split('\n');
  const evUse: string[] = [];
  for (const line of lines) {
    if (line.includes('TODO_AI')) continue; // Salta righe con TODO_AI
    const matches = Array.from(line.matchAll(/to\.emit\(\s*contract\s*,\s*["'`](\w+)["'`]\s*\)/g));
    evUse.push(...matches.map(m => m[1]));
  }

  const errors: string[] = [];
  for (const f of fnUse) {
    if (!ethersSystemFunctions.has(f) && !abiFns.has(f)) errors.push(`Function not in ABI: ${f}`);
  }
  for (const e of evUse) if (!abiEvents.has(e)) errors.push(`Event not in ABI: ${e}`);
  return { ok: errors.length === 0, errors };
}

async function validateTypeScript(filePath: string): Promise<{ valid: boolean; errors: string }> {
  try {
    const result = await runCommand('npx', ['tsc', '--noEmit', '--skipLibCheck', filePath]);
    return { valid: result.success, errors: result.output };
  } catch (error) {
    return { valid: false, errors: `Validation error: ${error}` };
  }
}

async function isTestComplete(content: string): Promise<boolean> {
  if (content.includes('TODO_AI')) return false;

  const hasDescribe = content.includes('describe(');
  const hasFixture = content.includes('loadFixture');
  const endsCorrectly = content.trim().endsWith('});');
  if (!hasDescribe || !hasFixture || !endsCorrectly) return false;

  const lines = content.split('\n');
  const minLength = lines.length > 30;
  const hasExpectStatements = content.includes('expect(') && content.includes('.to.');

  const itBlocks = content.match(/it\([^{]+\{[\s\S]*?\}\);/g) || [];
  const hasRealTests = itBlocks.some(block => {
    const hasExpect = block.includes('expect(');
    const hasAwait = block.includes('await');
    const isNotJustDeployment = !block.includes('basic deployment') || block.length > 200;
    return hasExpect && hasAwait && isNotJustDeployment;
  });

  return minLength && hasExpectStatements && hasRealTests;
}

async function runCommand(command: string, args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: process.cwd() });

    let output = '';
    let error = '';

    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.stderr?.on('data', (data) => { error += data.toString(); });

    const killer = setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: 'TIMEOUT: Process killed after timeout' });
    }, config.timeout * 1000 + 60000); // +60s buffer

    proc.on('close', (code) => {
      clearTimeout(killer);
      resolve({ success: code === 0, output: output + (error ? '\nERROR: ' + error : '') });
    });
  });
}


/* ------------------------------- ABI helpers ------------------------------- */

function extractFunctionNamesFromScaffold(scaffold: string): Set<string> {
  const s = new Set<string>();
  // Più tollerante: consente lettere, numeri, underscore, $; e prende la virgola dopo il titolo del describe
  const regex = /describe\(\s*["'`]([\w$]+)["'`]\s*,/g;
  let match;
  while ((match = regex.exec(scaffold)) !== null) s.add(match[1]);
  return s;
}

function listArtifactsByName(contractName: string, root: string): Array<{ path: string; abi: any[]; sourceName: string }> {
  const out: Array<{ path: string; abi: any[]; sourceName: string }> = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fssync.Dirent[];
    try {
      entries = fssync.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && full.endsWith('.json')) {
        try {
          const js = JSON.parse(fssync.readFileSync(full, 'utf-8'));
          if (js?.contractName?.toLowerCase() === contractName.toLowerCase() && Array.isArray(js?.abi)) {
            out.push({ path: full, abi: js.abi, sourceName: js.sourceName || '' });
          }
        } catch {}
      }
    }
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

function scoreArtifactForScaffold(abi: any[], describedFns: Set<string>): number {
  if (!describedFns.size) return 0;
  const abiFns = new Set(abi.filter(a => a.type === 'function').map((a: any) => a.name as string));
  let score = 0;
  for (const fn of describedFns) if (abiFns.has(fn)) score += 10;
  return score;
}

function findBestArtifactForScaffold(contractName: string, scaffoldOrSpec: string, root: string): { path: string; abi: any[] } | null {
  const candidates = listArtifactsByName(contractName, root);
  if (!candidates.length) return null;
  const describedFns = extractFunctionNamesFromScaffold(scaffoldOrSpec);
  let best = candidates[0];
  let bestScore = scoreArtifactForScaffold(best.abi, describedFns);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const s = scoreArtifactForScaffold(c.abi, describedFns);
    if (s > bestScore) { best = c; bestScore = s; }
  }
  return { path: best.path, abi: best.abi };
}

/* ------------------------ Remote Ollama HTTP invocation ------------------------ */

/**
 * Chiama Ollama remoto via Flask/ngrok su Colab.
 * Supporta sia risposte testuali "plain" sia lo streaming NDJSON dell'API /api/generate (campi "response").
 */
async function callRemoteOllama(model: string, prompt: string): Promise<{ success: boolean; output: string }> {
  // 1. Normalize endpoint (remove trailing slash)
  let endpoint = process.env.OLLAMA_URL || '';
  if (!endpoint) {
    return { success: false, output: '❌ Missing OLLAMA_URL (remote Colab endpoint).' };
  }
  endpoint = endpoint.replace(/\/+$/, '');

  // Timeout support (config.timeout in seconds)
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), config.timeout * 1000);

  try {
    const url = `${endpoint}/api/generate`;
    console.log(`🔍 Invio prompt al modello ${model} (${prompt.length} caratteri)`);
    console.log(`🌐 Endpoint: ${url}`);

    // 2. Remove stream: false from request body
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        options: {
          temperature: 0.1,
          top_k: 10,
          top_p: 0.8,
          num_predict: 2048,
          num_ctx: 4096
        }
      }),
      signal: controller.signal
    });

    const status = res.status;
    const text = await res.text();

    // 4. Error handling for non-2xx responses
    if (status < 200 || status >= 300) {
      clearTimeout(id);
      return { success: false, output: `HTTP ${status}: ${text.slice(0, 300)}` };
    }

    // 5. NDJSON support: collect all "response" fields
    const lines = text.split(/\r?\n/).filter(Boolean);
    let ndjsonOutput = '';
    let foundNdjson = false;
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (typeof obj.response === 'string') {
          ndjsonOutput += obj.response;
          foundNdjson = true;
        }
      } catch { /* skip non-JSON lines */ }
    }
    if (foundNdjson) {
      clearTimeout(id);
      return { success: true, output: ndjsonOutput };
    }

    // Try single JSON response
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object') {
        if (typeof obj.response === 'string') { clearTimeout(id); return { success: true, output: obj.response }; }
        if (typeof obj.message === 'string')  { clearTimeout(id); return { success: true, output: obj.message }; }
      }
    } catch {
      // Not a single JSON object, fallback to plain text
    }

    // Fallback: plain text
    clearTimeout(id);
    return { success: true, output: text };

  } catch (err: any) {
    clearTimeout(id);
    if (err?.name === 'AbortError') return { success: false, output: 'TIMEOUT: Remote Ollama request aborted' };
    return { success: false, output: `Error calling remote Ollama: ${err?.message || String(err)}` };
  }
}

/* ----------------------- Post-processing & file routing ----------------------- */


/* ---------------------------- Generation with retry --------------------------- */

// Genera test per un prompt (solo un tentativo, modello e template selezionabili)
async function generateTest(promptFile: string): Promise<{ success: boolean; message: string }> {
  const promptName = basename(promptFile);
  const tempOutputFile = join(config.outputDir, `${promptName}.spec.ts`);
  const validFile = join(config.validOutputDir, `${promptName}.spec.ts`);
  if (existsSync(validFile)) {
    console.log(`⏭️  Saltato: ${promptName} (già generato)`);
    return { success: true, message: `Test già esistente: ${validFile}` };
  }
  console.log(`� Genero test per: ${promptName} usando modello ${config.model}`);
  try {
    // Leggi direttamente il prompt dal file
    const promptContent = await fs.readFile(promptFile, 'utf8');
    // Salva una copia del prompt inviato per tracciabilità/debug
    await fs.mkdir(config.outputDir, { recursive: true });
    const tempPromptFile = join(config.outputDir, `${promptName}.sent-prompt.txt`);
    await fs.writeFile(tempPromptFile, promptContent, 'utf-8');
    // Chiamata a Ollama remoto direttamente con il prompt
    const result = await callRemoteOllama(config.model, promptContent);
    if (result.success) {
      // Salva direttamente il test generato
      const testContent = extractTypeScriptBlock(result.output);
      await fs.mkdir(config.validOutputDir, { recursive: true });
      await fs.writeFile(validFile, testContent, 'utf-8');
      console.log(`✅ Test generato: ${validFile}`);
      return { success: true, message: `Test generato: ${validFile}` };
    } else {
      await fs.mkdir(config.invalidOutputDir, { recursive: true });
      await fs.writeFile(join(config.invalidOutputDir, `${promptName}.error.txt`), result.output);
      console.log(`❌ Errore generazione: ${result.output.slice(0, 200)}`);
      return { success: false, message: `Errore generazione: ${result.output}` };
    }
  } catch (error) {
    console.log(`❌ Errore: ${error}`);
    return { success: false, message: `Errore: ${error}` };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ------------------------------------ Main ------------------------------------ */

// MAIN: semplice, chiaro, con parametri da CLI
async function main() {
  // Help
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`\nUsage: npx ts-node scripts/run-all.ts [--folder=small|medium|large] [--model=qwen|codellama|...] [--target=NomeContratto]\n`);
    console.log('Default: folder=small, model=qwen2.5-coder:3b');
    return;
  }
  // Leggi parametri da CLI
  const promptsFolderArg = process.argv.find(arg => arg.startsWith('--promptsFolder='));
  const modelArg = process.argv.find(arg => arg.startsWith('--model='));
  const targetArg = process.argv.find(arg => arg.startsWith('--target='));
  const templatesArg = process.argv.find(arg => arg.startsWith('--templates='));
  const promptsFolder = promptsFolderArg ? promptsFolderArg.split('=')[1] : `./prompts_out/${DEFAULT_FOLDER}`;
  const model = modelArg ? modelArg.split('=')[1] : DEFAULT_MODEL;
  const target = targetArg ? targetArg.split('=')[1] : '';
  config.promptsDir = promptsFolder;
  config.model = model;

  // Imposta OLLAMA_URL di default se non è già impostata
  if (!process.env.OLLAMA_URL) {
    process.env.OLLAMA_URL = "https://pomologically-unexpunged-nicolette.ngrok-free.dev";
    console.log('ℹ️  OLLAMA_URL non impostata, uso endpoint ngrok di default:', process.env.OLLAMA_URL);
  }

  console.log(`🚀 Generazione test LLM su ${promptsFolder} con modello ${model}`);

  try {
    await fs.access(config.promptsDir);
    await fs.mkdir(config.outputDir, { recursive: true });
    await fs.mkdir(config.validOutputDir, { recursive: true });
    await fs.mkdir(config.invalidOutputDir, { recursive: true });
    // temp-prompts non viene più creata
  } catch (error) {
    console.error('❌ Errore accesso directory:', error);
    process.exit(1);
  }

  let promptFiles = await fs.readdir(config.promptsDir);
  promptFiles = promptFiles.filter(file => file.endsWith('.prompt.txt')).map(file => join(config.promptsDir, file));
  if (target) {
    promptFiles = promptFiles.filter(file => file.toLowerCase().includes(target.toLowerCase()));
    console.log(`🎯 Filtrando per target: ${target}`);
  }
  console.log(`📁 Trovati ${promptFiles.length} prompt da processare`);

  let success = 0, fail = 0;
  for (const promptFile of promptFiles) {
    const result = await generateTest(promptFile);
    if (result.success) success++; else fail++;
  }
  console.log(`\n🏁 Generazione completata! Successi: ${success}, Errori: ${fail}`);
  console.log(`Test validi: ${config.validOutputDir}`);
  console.log(`Test con errori: ${config.invalidOutputDir}`);
}

process.on('SIGINT', () => {
  console.log('\n⚠️  Processo interrotto dall\'utente');
  process.exit(0);
});
/* Extracts pure TypeScript code from LLM output (removes markdown blocks and text) */
function extractTypeScriptBlock(content: string): string {
  // Match ```ts ... ``` or ```typescript ... ``` or generic ```
  const matches = [...content.matchAll(/```(?:ts|typescript)?[\s\r\n]*([\s\S]*?)```/gi)];
  if (matches.length > 0) {
    return matches.map(m => m[1].replace(/\r\n/g, "\n").trim()).join("\n\n");
  }
  // If no block found, return raw content
  return content.trim();
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});