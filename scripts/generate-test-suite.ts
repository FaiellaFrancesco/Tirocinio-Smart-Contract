#!/usr/bin/env ts-node
/**
 * generate-test-suite.ts
 *
 * Script pulito e robusto per l'esecuzione in batch dei prompt LLM (Qwen2.5-Coder:32B)
 * focalizzato sulla generazione di test Ethers v5 funzionanti e sulla validazione di runtime.
 */
import { promises as fs } from 'fs';
import { existsSync, writeFileSync } from 'fs'; // Funzioni fs sincrone
import * as path from 'path'; // Funzioni path (percorsi)
import { spawn } from 'child_process';
import fetch from 'node-fetch';

// --- CONFIGURAZIONE GLOBALE ---
const DEFAULT_MODEL = 'qwen2.5-coder:32b';
const config = {
  promptsDir: './prompts_out/small', // Default folder to process
  outputDir: './llm-out/temp',
  validOutputDir: './llm-out/valid',
  invalidOutputDir: './llm-out/invalid',
  model: DEFAULT_MODEL,
  timeoutSeconds: 900, // 15 minuti per Ollama
  tempTestFile: './test/temp_llm_test.spec.ts' // File temporaneo per l'esecuzione
};

// --- UTILITY PER L'ESECUZIONE DEI COMANDI ---

async function runCommand(command: string, args: string[], cwd: string = process.cwd()): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd });

    let output = '';
    let error = '';

    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.stderr?.on('data', (data) => { error += data.toString(); });

    const killer = setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: 'TIMEOUT: Process killed after timeout' });
    }, config.timeoutSeconds * 1000 + 30000); // Buffer di 30s

    proc.on('close', (code) => {
      clearTimeout(killer);
      resolve({ success: code === 0, output: output + (error ? `\nERROR: ${error}` : '') });
    });
  });
}

// --- LOGICA OLLAMA/NGROK ---

async function callRemoteOllama(model: string, prompt: string): Promise<{ success: boolean; output: string }> {
  let endpoint = process.env.OLLAMA_URL || '';
  if (!endpoint) return { success: false, output: '❌ Missing OLLAMA_URL (set this environment variable).' };
  endpoint = endpoint.replace(/\/+$/, '');

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), config.timeoutSeconds * 1000);

  try {
    const url = `${endpoint}/api/generate`;
    console.log(`🔍 Invio prompt al modello ${model} (${prompt.length} caratteri)`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        // Parametri per output lungo e deterministico
        options: { temperature: 0.1, top_k: 10, top_p: 0.8, num_predict: 4096, num_ctx: 8192 }
      }),
      signal: controller.signal
    });

    const status = res.status;
    const text = await res.text();

    if (status < 200 || status >= 300) {
      clearTimeout(id);
      return { success: false, output: `HTTP ${status}: ${text.slice(0, 300)}` };
    }

    // Try parsing as NDJSON (multiple JSON objects per line)
    const lines = text.split(/\r?\n/).filter(Boolean);
    let assembled = '';
    let found = false;
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        // Ollama newer responses might include 'response' or 'content' fields
        if (typeof obj.response === 'string') { assembled += obj.response; found = true; }
        else if (typeof obj.content === 'string') { assembled += obj.content; found = true; }
      } catch { /* skip non-json lines */ }
    }

    // Fallback: try to parse full body as single JSON
    if (!found) {
      try {
        const obj = JSON.parse(text);
        if (typeof obj.response === 'string') { assembled = obj.response; found = true; }
        else if (typeof obj.output === 'string') { assembled = obj.output; found = true; }
        else if (typeof obj.content === 'string') { assembled = obj.content; found = true; }
      } catch { /* not JSON */ }
    }

    clearTimeout(id);
    return { success: true, output: assembled || text }; // Return assembled response or raw text
  } catch (err: any) {
    clearTimeout(id);
    if (err?.name === 'AbortError') return { success: false, output: 'TIMEOUT: Remote Ollama request aborted' };
    return { success: false, output: `Error calling remote Ollama: ${err?.message || String(err)}` };
  }
}

// --- POST-PROCESSING E VALIDAZIONE ---

/* Extracts pure TypeScript code from LLM output (removes markdown blocks and text) */
function extractTypeScriptBlock(content: string): string {
  const matches = [...content.matchAll(/```(?:ts|typescript)?[\s\r\n]*([\s\S]*?)```/gi)];
  if (matches.length > 0) return matches.map(m => m[1].replace(/\r\n/g, "\n").trim()).join("\n\n");
  return content.trim();
}

/** Esegue Hardhat test sul file temporaneo. */
async function validateRuntime(testContent: string): Promise<{ valid: boolean; errors: string; normalized?: string }> {
  // 1. Prepare normalized content and temp paths
  let normalizedContent = '';
  let tempPath = '';
  try {
    // Ethers v5 usa spesso import da "ethers" invece che da "hardhat" nei file .ts
    // Assicuriamo che l'import sia corretto per l'esecuzione in Hardhat.
    normalizedContent = testContent
      // import { ethers } from "ethers";
      .replace(/import\s+\{\s*ethers\s*\}\s+from\s+["']ethers["'];?/g, 'import { ethers } from "hardhat";')
      // import ethers from "ethers";
      .replace(/import\s+ethers\s+from\s+["']ethers["'];?/g, 'import { ethers } from "hardhat";')
      // import "ethers";
      .replace(/import\s+["']ethers["'];?/g, 'import { ethers } from "hardhat";');

    // Create a unique tempfile per invocation to avoid collisions and to aid debugging
    const uniq = `temp_llm_test_${Date.now()}_${Math.floor(Math.random() * 100000)}.spec.ts`;
    tempPath = path.join(path.dirname(config.tempTestFile), uniq);
    try { await fs.mkdir(path.dirname(tempPath), { recursive: true }); } catch (e) { /* ignore */ }
    writeFileSync(tempPath, normalizedContent, 'utf-8');
  } catch (e) {
    return { valid: false, errors: `Errore scrittura file temporaneo: ${e}` };
  }

  // 2. Esegue il comando Hardhat
  // Passiamo il file come argomento per eseguire solo quello.
  const result = await runCommand('npx', ['hardhat', 'test', tempPath]);

  // 3. Pulisce (opzionale: rimuove il file temporaneo)
  try {
    // Non rimuoviamo il file temporaneo per debug
  } catch {}

  if (!result.success) {
    return { valid: false, errors: `Hardhat Test Fallito:\n${result.output}`, normalized: normalizedContent };
  }

  // Parse output for passing/failing tests: look for lines like "N passing" and "M failing"
  const passingMatch = result.output.match(/(\d+)\s+passing/);
  const failingMatch = result.output.match(/(\d+)\s+failing/);
  const passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
  const failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;

  if (passed === 0) {
    return { valid: false, errors: `Hardhat Test Eseguito, ma nessun test passato (output):\n${result.output}`, normalized: normalizedContent };
  }

  return { valid: true, errors: '', normalized: normalizedContent };
}

// --- CICLO DI GENERAZIONE ---

async function generateAndValidate(promptFile: string): Promise<{ success: boolean; message: string }> {
  const promptName = path.basename(promptFile).replace('.prompt.txt', '');
  const finalValidFile = path.join(config.validOutputDir, `${promptName}.spec.ts`);
  const finalInvalidFile = path.join(config.invalidOutputDir, `${promptName}.spec.ts`);
  const errorLog = path.join(config.invalidOutputDir, `${promptName}.error.log`);

  if (existsSync(finalValidFile)) {
    console.log(`⏭️  Saltato: ${promptName} (già validato)`);
    return { success: true, message: `Test già esistente e validato: ${finalValidFile}` };
  }
  console.log(`\n🤖 Genero e valido test per: ${promptName}`);

  // 1. Chiamata LLM
  const promptContent = await fs.readFile(promptFile, 'utf8');
  let generationResult = { success: false, output: '' };
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    generationResult = await callRemoteOllama(config.model, promptContent);
    if (generationResult.success) break;
    console.log(`⚠️  Tentativo ${attempt} fallito per LLM. Output: ${generationResult.output.split('\n')[0]}`);
    // small backoff
    await new Promise(r => setTimeout(r, 1000 * attempt));
  }

  if (!generationResult.success) {
    writeFileSync(errorLog, `LLM Generation Error:\n${generationResult.output}`, 'utf-8');
    console.log(`❌ Errore LLM: ${generationResult.output.split('\n')[0]}`);
    return { success: false, message: `Errore LLM: ${generationResult.output}` };
  }

  const testContent = extractTypeScriptBlock(generationResult.output);
  if (!testContent || testContent.length < 50) {
    writeFileSync(errorLog, `LLM Output Incompleto o Vuoto: ${testContent}`, 'utf-8');
    console.log(`❌ Output Incompleto: L'LLM non ha generato codice valido.`);
    return { success: false, message: `Output Incompleto` };
  }
  
  // 2. Validazione Runtime
  console.log('🧪 Avvio validazione runtime Hardhat...');
  const validationResult = await validateRuntime(testContent);

  // 3. Routing dei file
  await fs.mkdir(validationResult.valid ? config.validOutputDir : config.invalidOutputDir, { recursive: true });
  
  if (validationResult.valid) {
    // Save the normalized content that was actually executed
    writeFileSync(finalValidFile, validationResult.normalized || testContent, 'utf-8');
    console.log(`✅ VALIDATO: Test eseguito con successo e passato: ${finalValidFile}`);
  } else {
    // Scrive il codice generato non funzionante
    writeFileSync(finalInvalidFile, validationResult.normalized || testContent, 'utf-8'); 
    // Scrive il log di errore (compilazione o runtime)
    writeFileSync(errorLog, `Hardhat Validation Error:\n${validationResult.errors}`, 'utf-8');
    console.log(`❌ NON FUNZIONANTE: Errore di compilazione/runtime. Log in ${errorLog}`);
  }

  return { success: validationResult.valid, message: validationResult.errors };
}


/* ------------------------------------ Main ------------------------------------ */

async function main() {
  // Parsing Args... (omissis)
  const promptsFolder = process.argv.find(arg => arg.startsWith('--promptsFolder='))?.split('=')[1] || config.promptsDir;
  const model = process.argv.find(arg => arg.startsWith('--model='))?.split('=')[1] || config.model;
  const target = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1] || '';
  
  config.promptsDir = promptsFolder;
  config.model = model;

  // Usa un URL di default solo se non impostato
  if (!process.env.OLLAMA_URL) {
    process.env.OLLAMA_URL = "http://localhost:11434"; 
    console.log('ℹ️  OLLAMA_URL non impostata, uso endpoint locale di default:', process.env.OLLAMA_URL);
  }

  console.log(`🚀 Generazione test LLM su ${promptsFolder} con modello ${model}`);

  try {
    await fs.access(config.promptsDir);
    await fs.mkdir(config.outputDir, { recursive: true });
    await fs.mkdir(config.validOutputDir, { recursive: true });
    await fs.mkdir(config.invalidOutputDir, { recursive: true });
  } catch (error) {
    console.error('❌ Errore accesso directory:', error);
    process.exit(1);
  }

  let promptFiles = await fs.readdir(config.promptsDir);
  promptFiles = promptFiles.filter(file => file.endsWith('.prompt.txt')).map(file => path.join(config.promptsDir, file));
  
  if (target) {
    promptFiles = promptFiles.filter(file => path.basename(file).toLowerCase().includes(target.toLowerCase()));
    console.log(`🎯 Filtrando per target: ${target}`);
  }
  
  console.log(`📁 Trovati ${promptFiles.length} prompt da processare`);

  let success = 0, fail = 0;
  for (const promptFile of promptFiles) {
    const result = await generateAndValidate(promptFile);
    if (result.success) success++; else fail++;
    // Pausa per non sovraccaricare Ollama se necessario
    // await sleep(5000); 
  }
  
  console.log(`\n🏁 Generazione completata! Successi (Test Funzionanti): ${success}, Fallimenti (Test Non Funzionanti): ${fail}`);
  console.log(`Test validi: ${config.validOutputDir}`);
  console.log(`Test con errori: ${config.invalidOutputDir}`);
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});