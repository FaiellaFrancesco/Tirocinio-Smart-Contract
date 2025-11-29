#!/usr/bin/env ts-node
/**
 * generate-test-suite.ts
 *
 * Script ESECUTORE con Logica di Retry Intelligente (Dual Prompt).
 *
 * Correzioni apportate:
 * - Fix TypeScript error: definita esplicitamente la variabile `files` come `string[]`.
 * - Logica Init/Retry confermata.
 */

import { promises as fs } from 'fs';
import { existsSync, writeFileSync } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

// --- CONFIGURAZIONE ---
const CONFIG = {
  promptsDir: './prompts_out/small',
  outputDir: './llm-out/temp',
  validOutputDir: './llm-out/valid',
  invalidOutputDir: './llm-out/invalid',
  // Modello di default (può essere sovrascritto da --model)
  model: 'qwen2.5-coder:32b', 
  timeoutSeconds: 900, // 15 minuti per Ollama
  tempTestFile: './test/temp_llm_test.spec.ts',
  // Deve coincidere con quello usato in build-prompts.ts
  separator: '==========RETRY_TEMPLATE_SPLIT==========' 
};

// --- UTILITY ---

async function runCommand(command: string, args: string[], cwd: string = process.cwd()): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd });
    let output = '';
    let error = '';
    
    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.stderr?.on('data', (data) => { error += data.toString(); });
    
    // Timeout di sicurezza
    const killer = setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: 'TIMEOUT: Process killed after timeout' });
    }, CONFIG.timeoutSeconds * 1000 + 30000);

    proc.on('close', (code) => {
      clearTimeout(killer);
      // Hardhat ritorna 0 solo se tutti i test passano
      resolve({ success: code === 0, output: output + (error ? `\nSTDERR: ${error}` : '') });
    });
  });
}

async function callRemoteOllama(model: string, prompt: string): Promise<{ success: boolean; output: string }> {
  let endpoint = process.env.OLLAMA_URL || "http://localhost:11434";
  endpoint = endpoint.replace(/\/+$/, '');
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), CONFIG.timeoutSeconds * 1000);

  try {
    console.log(`🔍 Invio prompt a ${model} (${prompt.length} chars)...`);
    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        // Parametri ottimizzati per codice
        options: { temperature: 0.1, top_k: 10, top_p: 0.8, num_predict: 8192, num_ctx: 32768 /*10000*/ },
        stream: false
      }),
      signal: controller.signal
    });

    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json() as any;
    clearTimeout(id);
    
    // Supporto per diverse versioni API Ollama
    const content = data.response || data.content || '';
    return { success: true, output: content };

  } catch (err: any) {
    clearTimeout(id);
    return { success: false, output: err.message || String(err) };
  }
}

function extractTypeScriptBlock(content: string): string {
  // Cerca blocchi ```ts o ```typescript
  const matches = [...content.matchAll(/```(?:ts|typescript)?[\s\r\n]*([\s\S]*?)```/gi)];
  if (matches.length > 0) return matches.map(m => m[1].trim()).join("\n\n");
  // Se non trova blocchi code, ritorna tutto (fallback)
  return content.trim();
}

/** Salva il codice in un file temp, esegue hardhat, ritorna esito e log */
async function validateRuntime(testContent: string): Promise<{ valid: boolean; errors: string; normalized: string }> {
  // 1. Normalizza gli import per Hardhat
  const normalizedContent = testContent
    .replace(/import\s+\{\s*ethers\s*\}\s+from\s+["']ethers["'];?/g, 'import { ethers } from "hardhat";')
    .replace(/import\s+ethers\s+from\s+["']ethers["'];?/g, 'import { ethers } from "hardhat";')
    .replace(/import\s+["']ethers["'];?/g, 'import { ethers } from "hardhat";');

  // 2. Crea file temporaneo univoco
  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const tempPath = path.join(path.dirname(CONFIG.tempTestFile), `temp_test_${uniqueId}.spec.ts`);
  
  try {
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, normalizedContent, 'utf-8');
  } catch (e: any) {
    return { valid: false, errors: `FS Error: ${e.message}`, normalized: normalizedContent };
  }

  // 3. Esegui Hardhat
  const result = await runCommand('npx', ['hardhat', 'test', tempPath]);

  // 4. Pulizia
  try { await fs.unlink(tempPath); } catch {}

  // 5. Analisi risultato
  // Check: deve avere exit code 0 E trovare stringa "passing" nell'output
  const hasPassing = result.output.match(/(\d+)\s+passing/);
  const passedCount = hasPassing ? parseInt(hasPassing[1]) : 0;
  
  if (!result.success || passedCount === 0) {
    return { valid: false, errors: result.output, normalized: normalizedContent };
  }

  return { valid: true, errors: '', normalized: normalizedContent };
}

// --- LOGICA CORE: GESTIONE SINGOLO PROMPT ---

async function processPromptFile(promptPath: string): Promise<boolean> {
  const promptName = path.basename(promptPath).replace('.prompt.txt', '');
  const finalValidFile = path.join(CONFIG.validOutputDir, `${promptName}.spec.ts`);
  const finalInvalidFile = path.join(CONFIG.invalidOutputDir, `${promptName}.spec.ts`);
  const errorLogFile = path.join(CONFIG.invalidOutputDir, `${promptName}.error.log`);

  if (existsSync(finalValidFile)) {
    console.log(`⏭️  Saltato: ${promptName} (già valido)`);
    return true;
  }

  console.log(`\n🤖 Processing: ${promptName}`);

  // 1. Leggi e Dividi il Prompt
  const rawContent = await fs.readFile(promptPath, 'utf8');
  const parts = rawContent.split(CONFIG.separator);
  
  const initialPrompt = parts[0].trim();
  const retryTemplate = parts.length > 1 ? parts[1].trim() : null;

  if (!retryTemplate) {
    console.warn(`⚠️  Nessun template di retry trovato per ${promptName}. Eseguirò solo 1 tentativo.`);
  }

  // Imposta max tentativi: 3 se c'è il template, 1 altrimenti
  const MAX_ATTEMPTS = retryTemplate ? 3 : 1;

  let currentPrompt = initialPrompt;
  let lastCode = '';
  let lastErrors = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`   🔄 Tentativo ${attempt}/${MAX_ATTEMPTS}...`);

    // A. Chiamata LLM
    const llmRes = await callRemoteOllama(CONFIG.model, currentPrompt);
    if (!llmRes.success) {
      console.error(`   ❌ Errore API LLM: ${llmRes.output}`);
      // Se fallisce la rete, aspettiamo un po' e riproviamo lo stesso prompt
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const code = extractTypeScriptBlock(llmRes.output);
    lastCode = code;

    if (code.length < 50) {
      console.warn(`   ⚠️  Output LLM troppo breve o vuoto.`);
      lastErrors = "Output LLM vuoto/invalido.";
      continue; 
    }

    // B. Validazione Hardhat
    const valRes = await validateRuntime(code);

    if (valRes.valid) {
      console.log(`   ✅ Successo! Test valido.`);
      await fs.writeFile(finalValidFile, valRes.normalized, 'utf-8');
      return true; // Stop, successo
    }

    // C. Fallimento -> Preparazione Retry
    console.log(`   ❌ Validazione fallita.`);
    lastErrors = valRes.errors;

    // Se abbiamo ancora tentativi e un template di retry, prepariamo il prossimo prompt
    if (attempt < MAX_ATTEMPTS && retryTemplate) {
      console.log(`   🔧 Preparazione Prompt di Correzione...`);
      currentPrompt = retryTemplate
        .replace('{{FAILED_CODE_PLACEHOLDER}}', lastCode)
        .replace('{{ERROR_LOG_PLACEHOLDER}}', lastErrors);
    }
  }

  // Se arriviamo qui, tutti i tentativi sono falliti
  console.log(`   🏁 Fallimento definitivo per ${promptName}.`);
  await fs.writeFile(finalInvalidFile, lastCode, 'utf-8');
  await fs.writeFile(errorLogFile, lastErrors, 'utf-8');
  
  return false;
}

// --- MAIN ---

async function main() {
  // Parsing Argomenti base
  const args = process.argv.slice(2);
  const promptsFolderArg = args.find(a => a.startsWith('--promptsFolder='));
  const modelArg = args.find(a => a.startsWith('--model='));
  const targetArg = args.find(a => a.startsWith('--target='));

  if (promptsFolderArg) CONFIG.promptsDir = promptsFolderArg.split('=')[1];
  if (modelArg) CONFIG.model = modelArg.split('=')[1];
  const target = targetArg ? targetArg.split('=')[1].toLowerCase() : '';

  console.log(`🚀 Avvio Generazione Test Suite`);
  console.log(`📁 Folder: ${CONFIG.promptsDir}`);
  console.log(`🧠 Model:  ${CONFIG.model}`);

  // Setup Directory
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  await fs.mkdir(CONFIG.validOutputDir, { recursive: true });
  await fs.mkdir(CONFIG.invalidOutputDir, { recursive: true });

  // Lettura File Prompt con tipizzazione corretta
  let files: string[] = []; // <--- FIX QUI: Dichiarazione esplicita del tipo array di stringhe
  try {
    const dirContent = await fs.readdir(CONFIG.promptsDir);
    files = dirContent.filter(f => f.endsWith('.prompt.txt'));
  } catch (e) {
    console.error(`❌ Errore lettura directory prompts: ${e}`);
    process.exit(1);
  }

  if (target) {
    console.log(`🎯 Filtro target: "${target}"`);
    files = files.filter(f => f.toLowerCase().includes(target));
  }

  console.log(`📝 Trovati ${files.length} file da processare.`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const fullPath = path.join(CONFIG.promptsDir, file);
    const success = await processPromptFile(fullPath);
    if (success) successCount++; else failCount++;
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`🏁 RIEPILOGO FINALE`);
  console.log(`✅ Successi: ${successCount}`);
  console.log(`❌ Falliti:  ${failCount}`);
  console.log(`📂 Output Validi:   ${CONFIG.validOutputDir}`);
  console.log(`📂 Output Invalidi: ${CONFIG.invalidOutputDir}`);
  console.log(`══════════════════════════════════════\n`);
}

main().catch(e => {
  console.error("❌ Fatal Error:", e);
  process.exit(1);
});