#!/usr/bin/env npx ts-node

import { promises as fs } from 'fs';
import * as fssync from 'fs';
import { join, basename } from 'path';
import * as path from 'path';
import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';

interface Config {
  promptsDir: string;
  templatesDir: string;
  outputDir: string;
  validOutputDir: string;
  invalidOutputDir: string;
  tempDir: string;
  artifactsRoot: string;
  model: string;
  retries: number;
  timeout: number;        // seconds
  maxConcurrent: number;
}

interface QualityMetrics {
  total: number;
  successful: number;
  compilationErrors: number;
  incomplete: number;
  timeouts: number;
  abiErrors: number;
  bannedPatternErrors: number;
}

const config: Config = {
  promptsDir: './prompts_out_eng/coverage',
  templatesDir: './prompts/templates',
  outputDir: './prova-generazione-llm/temp',
  validOutputDir: './prova-generazione-llm/prova4-valid',
  invalidOutputDir: './prova-generazione-llm/prova4-invalid',
  tempDir: './prova-generazione-llm/temp-prompts',
  artifactsRoot: './artifacts/contracts',
  model: 'codellama:13b-code',
  retries: 3,
  timeout: 900,            // 15 minuti per Colab lento
  maxConcurrent: 1
};

const metrics: QualityMetrics = {
  total: 0,
  successful: 0,
  compilationErrors: 0,
  incomplete: 0,
  timeouts: 0,
  abiErrors: 0,
  bannedPatternErrors: 0,
};

/* --------------------------- Utilities & helpers --------------------------- */

function normalizeSpec(content: string): string {
  return content
    // Import must come from hardhat
    .replace(/^import\s+\{\s*ethers\s*\}\s+from\s+['"]ethers['"];?/m, 'import { ethers } from "hardhat";')
    // ethers v5 -> v6
    .replace(/ethers\.utils\.parseUnits/g, 'ethers.parseUnits')
    .replace(/ethers\.utils\.parseEther/g, 'ethers.parseEther')
    .replace(/ethers\.constants\.AddressZero/g, 'ethers.ZeroAddress')
    .replace(/ethers\.constants\.MaxUint256/g, 'ethers.MaxUint256')
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

/* --------------------- Prompt assembly (scaffold + template) --------------------- */

async function generatePromptWithTemplate(promptFile: string, templateFile: string, previousErrors: string = ''): Promise<string> {
  const originalPrompt = await fs.readFile(promptFile, 'utf8');
  const templateContent = await fs.readFile(templateFile, 'utf8');

  const m = originalPrompt.match(/```ts\s*([\s\S]*?)\s*```/);
  if (!m) throw new Error(`Cannot extract scaffold content from ${promptFile}`);
  const scaffold = m[1];

  const base = path.basename(promptFile, '.coverage.prompt.txt');
  const contractName = base.replace(/\.coverage$/i, '');

  const best = findBestArtifactForScaffold(contractName, scaffold, config.artifactsRoot);
  let functionList = '';
  let eventList = '—';
  if (best) {
    const abi = best.abi;
    const describedFns = extractFunctionNamesFromScaffold(scaffold);
    const fns = abi.filter((a: any) => a.type === 'function');
    const evs = abi.filter((a: any) => a.type === 'event');
    const chosenFns = describedFns.size ? fns.filter((f: any) => describedFns.has(f.name)) : fns;
    functionList = chosenFns
      .map((f: any) => `${f.name}(${(f.inputs || []).map((i: any) => i.type).join(',')})->${f.stateMutability || 'nonpayable'}`)
      .join('\n');
    eventList = evs.map((e: any) => e.name).join(', ') || '—';
  } else {
    console.warn(`⚠️  No artifact candidates for ${contractName}: proceeding without FUNCTION_LIST/EVENT_LIST.`);
  }

  return templateContent
    .replace('{{CONTRACT_NAME}}', contractName)
    .replace('{{FUNCTION_LIST}}', functionList)
    .replace('{{EVENT_LIST}}', eventList)
    .replace('{{PREV_ERRORS}}', previousErrors)
    .replace('{{SCAFFOLD_CONTENT}}', scaffold);
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
  const endpoint = process.env.OLLAMA_URL || '';
  if (!endpoint) {
    return { success: false, output: '❌ Missing OLLAMA_URL (remote Colab endpoint).' };
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), config.timeout * 1000);

  try {
    console.log(`🔍 DEBUG - Inviando al modello ${model}:`);
    console.log(`📏 Lunghezza prompt: ${prompt.length} caratteri`);
    console.log(`📝 Prime 200 caratteri: ${prompt.substring(0, 200)}...`);
    console.log(`📝 Ultime 200 caratteri: ...${prompt.substring(prompt.length - 200)}`);
    
    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model, 
        prompt,
        stream: false,
        options: {
          temperature: 0.1,    // Più deterministico
          top_k: 10,          // Meno opzioni = più veloce
          top_p: 0.8,         
          num_predict: 2048,  // Limite ragionevole
          num_ctx: 4096       // Contesto più piccolo
        }
      }),
      signal: controller.signal
    });

    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (status < 200 || status >= 300) {
      return { success: false, output: `HTTP ${status}: ${text.slice(0, 500)}` };
    }

    // 1) Prova JSON singolo
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object') {
        if (typeof obj.response === 'string') return { success: true, output: obj.response };
        if (typeof obj.message === 'string')  return { success: true, output: obj.message };
      }
    } catch {
      // non JSON singolo, potrebbe essere NDJSON
    }

    // 2) Prova NDJSON (una JSON per riga) – tipico di Ollama streaming
    const lines = text.split(/\r?\n/).filter(Boolean);
    let acc = '';
    let parsedSomething = false;
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        if (typeof j.response === 'string') { acc += j.response; parsedSomething = true; }
      } catch { /* non-json line, skip */ }
    }
    if (parsedSomething) return { success: true, output: acc };

    // 3) Fallback: plain text
    return { success: true, output: text };

  } catch (err: any) {
    if (err?.name === 'AbortError') return { success: false, output: 'TIMEOUT: Remote Ollama request aborted' };
    return { success: false, output: `Error calling remote Ollama: ${err?.message || String(err)}` };
  } finally {
    clearTimeout(id);
  }
}

/* ----------------------- Post-processing & file routing ----------------------- */

async function processSuccessfulTest(tempOutputFile: string, promptName: string, testContent: string): Promise<{ success: boolean; message: string }> {
  const validation = await validateTypeScript(tempOutputFile);
  if (!validation.valid) {
    console.log(`❌ Compilazione Fallita: ${promptName}`);
    const invalidFile = join(config.invalidOutputDir, `${promptName}.compilation-error.spec.ts`);
    await fs.mkdir(config.invalidOutputDir, { recursive: true });
    await fs.writeFile(invalidFile, testContent);
    await fs.writeFile(invalidFile + '.errors', validation.errors);
    metrics.compilationErrors++;
    return { success: false, message: `Compilation failed: ${validation.errors.slice(0, 200)}` };
  }

  const validFile = join(config.validOutputDir, `${promptName}.spec.ts`);
  await fs.mkdir(config.validOutputDir, { recursive: true });
  await fs.rename(tempOutputFile, validFile);

  console.log(`✅ Test Valido: ${promptName}`);
  metrics.successful++;
  return { success: true, message: `Valid test generated: ${validFile}` };
}

/* ---------------------------- Generation with retry --------------------------- */

async function generateTestWithRetry(promptFile: string): Promise<{ success: boolean; message: string }> {
  const promptName = basename(promptFile, '.coverage.prompt.txt');
  const tempOutputFile = join(config.outputDir, `${promptName}.spec.ts`);

  const validFile = join(config.validOutputDir, `${promptName}.spec.ts`);
  if (existsSync(validFile)) {
    console.log(`⏭️  Saltando ${promptName} - test valido già esistente`);
    return { success: true, message: `Test already exists: ${validFile}` };
  }

  console.log(`🔄 Generando test per: ${promptName}`);
  metrics.total++;

  const templates = [
    'attempt-1.txt',
    'attempt-2.txt',
    'attempt-3.txt'
  ];

  const modelConfigs = [{ model: config.model, timeout: config.timeout }];

  let totalAttempts = 0;
  let previousErrors = '';

  for (let templateIndex = 0; templateIndex < templates.length; templateIndex++) {
    const templateFileName = templates[templateIndex];
    const templateFile = join(config.templatesDir, templateFileName);
    const templateName = basename(templateFileName, '.txt');
    console.log(`   📝 Template ${templateIndex + 1}/${templates.length}: ${templateName}`);

    const modelsToTry = [modelConfigs[0]];

    for (const { model, timeout } of modelsToTry) {
      totalAttempts++;
      console.log(`      🤖 Tentativo ${totalAttempts} con ${model} (timeout: ${timeout}s)`);

      try {
        const customPrompt = await generatePromptWithTemplate(promptFile, templateFile, previousErrors);
        await fs.mkdir(config.tempDir, { recursive: true });
        const tempPromptFile = join(config.tempDir, `prompt_${promptName}_${templateIndex}_${Date.now()}.txt`);
        await fs.writeFile(tempPromptFile, customPrompt);

        // → Chiamata diretta a Ollama remoto
        const promptContent = await fs.readFile(tempPromptFile, 'utf-8');
        const result = await callRemoteOllama(model, promptContent);

        // pulizia prompt solo se andato a buon fine
        const keepPrompt = !result.success;
        if (!keepPrompt && existsSync(tempPromptFile)) {
          await fs.unlink(tempPromptFile);
        }

        if (result.success) {
          await fs.writeFile(tempOutputFile, result.output, 'utf-8');
          await sleep(500); // assicurati che il file sia flushato
          if (!existsSync(tempOutputFile)) {
            console.log(`      ❌ File output mancante dopo scrittura`);
            continue;
          }

          let testContent = readFileSync(tempOutputFile, 'utf-8');
          testContent = extractTypeScriptBlock(testContent);
          testContent = normalizeSpec(testContent);
          writeFileSync(tempOutputFile, testContent, 'utf-8');
          await sleep(300);

          // BANNED patterns
          const banned = findBannedPatterns(testContent);
          if (banned.length) {
            console.log('         - BANNED patterns detected:\n           • ' + banned.join('\n           • '));
            const invalidBase = join(config.invalidOutputDir, `${promptName}.banned`);
            await fs.mkdir(config.invalidOutputDir, { recursive: true });
            await fs.writeFile(`${invalidBase}.spec.ts`, testContent);
            await fs.writeFile(`${invalidBase}.errors`, banned.join('\n'));
            metrics.bannedPatternErrors++;
            
            // Aggiungi agli errori per il prossimo tentativo
            previousErrors += (previousErrors ? '\n\n' : '') + 
              `Tentativo ${templateIndex + 1} (${templateName}):\n` + 
              `Pattern bannati rilevati: ${banned.join(', ')}`;
            
            try { await fs.unlink(tempOutputFile); } catch {}
            continue;
          }

          // ABI validation
          const bestForValidation = findBestArtifactForScaffold(promptName, testContent, config.artifactsRoot);
          if (bestForValidation) {
            console.log(`         🔍 ABI path: ${bestForValidation.path}`);
            const abi = bestForValidation.abi;
            const functionNames = abi.filter((item: any) => item.type === 'function').map((item: any) => item.name);
            console.log(`         📋 Functions in ABI: ${functionNames.slice(0, 5).join(', ')}${functionNames.length > 5 ? '...' : ''} (${functionNames.length} total)`);
            const abiCheck = abiValidateSpecCalls(testContent, abi);
            if (!abiCheck.ok) {
              console.log('         - ABI validator errors:\n           • ' + abiCheck.errors.join('\n           • '));
              const invalidBase = join(config.invalidOutputDir, `${promptName}.abi-error`);
              await fs.mkdir(config.invalidOutputDir, { recursive: true });
              await fs.writeFile(`${invalidBase}.spec.ts`, testContent);
              await fs.writeFile(`${invalidBase}.errors`, abiCheck.errors.join('\n'));
              metrics.abiErrors++;
              
              // Aggiungi agli errori per il prossimo tentativo
              previousErrors += (previousErrors ? '\n\n' : '') + 
                `Tentativo ${templateIndex + 1} (${templateName}):\n` + 
                `Errori ABI: ${abiCheck.errors.join(', ')}`;
              
              try { await fs.unlink(tempOutputFile); } catch {}
              continue;
            }
          }

          const complete = await isTestComplete(testContent);
          const tsCheck = await validateTypeScript(tempOutputFile);

          console.log(`         📊 Test generato: ${testContent.length} caratteri`);
          console.log(`         🔍 Completo: ${complete ? 'SÌ' : 'NO'}`);
          console.log(`         ✅ TypeScript: ${tsCheck.valid ? 'SÌ' : 'NO'}`);

          if (complete && tsCheck.valid) {
            console.log('      ✅ SUCCESSO! Test completo generato');
            return await processSuccessfulTest(tempOutputFile, promptName, testContent);
          } else {
            // Raccogliamo gli errori per il prossimo tentativo
            const errors: string[] = [];
            if (!complete) {
              metrics.incomplete++;
              const todoCount = (testContent.match(/TODO_AI/g) || []).length;
              console.log(`      ⚠️  Test incompleto (TODO_AI: ${todoCount})`);
              errors.push(`Test incompleto: ${todoCount} TODO_AI non sostituiti`);
            }
            if (!tsCheck.valid) {
              console.log(`      ⚠️  Errori TypeScript: ${tsCheck.errors.slice(0, 200)}...`);
              errors.push(`Errori TypeScript: ${tsCheck.errors}`);
            }
            
            // Aggiorna gli errori per il prossimo tentativo
            previousErrors += (previousErrors ? '\n\n' : '') + 
              `Tentativo ${templateIndex + 1} (${templateName}):\n` + 
              errors.join('\n');
            
            // salva primo parziale
            const partialFile = join(config.invalidOutputDir, `${promptName}.partial.spec.ts`);
            await fs.mkdir(config.invalidOutputDir, { recursive: true });
            await fs.writeFile(partialFile, testContent);
            try { await fs.unlink(tempOutputFile); } catch {}
          }
        } else {
          console.log(`      ❌ Generazione fallita: ${result.output.slice(0, 200)}...`);
          if (result.output.includes('TIMEOUT')) {
            console.log(`         ⏰ Timeout dopo ${timeout}s`);
            metrics.timeouts++;
          }
        }
      } catch (error) {
        console.log(`      ❌ Errore: ${error}`);
      }
    }
  }

  console.log(`   ❌ FALLIMENTO totale dopo ${totalAttempts} tentativi`);
  return { success: false, message: `Failed after ${totalAttempts} attempts with all templates` };
}

async function generateTest(promptFile: string): Promise<{ success: boolean; message: string }> {
  return await generateTestWithRetry(promptFile);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ------------------------------------ Main ------------------------------------ */

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🚀 Sistema Generazione Test LLM con Retry Intelligente (remoto)

Usage: npx ts-node scripts/llm/run-all.ts [options]

Options:
  --target=<name>   Genera test solo per contratti che contengono <name>
  --force           Rigenera anche test già completati
  --help, -h        Mostra questa guida

Env:
  OLLAMA_URL        Endpoint remoto (es. https://xxxx.ngrok-free.app)

Examples:
  export OLLAMA_URL="https://...ngrok-free.app"
  npx ts-node scripts/llm/run-all.ts --target=DonationRegistry
  npx ts-node scripts/llm/run-all.ts --force
    `);
    return;
  }

  if (!process.env.OLLAMA_URL) {
    console.error('❌ OLLAMA_URL non impostata. Esempio: export OLLAMA_URL="https://<ngrok>.ngrok-free.app"');
    process.exit(1);
  }

  console.log('🚀 Avvio generazione automatica test con retry intelligente (Ollama remoto)...');

  const targetFile = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1];
  const skipCompleted = !process.argv.includes('--force');

  try {
    await fs.access(config.promptsDir);
    await fs.mkdir(config.outputDir, { recursive: true });
    await fs.mkdir(config.validOutputDir, { recursive: true });
    await fs.mkdir(config.invalidOutputDir, { recursive: true });
    await fs.mkdir(config.tempDir, { recursive: true });
  } catch (error) {
    console.error('❌ Errore accesso directory:', error);
    process.exit(1);
  }

  let promptFiles = await fs.readdir(config.promptsDir);
  let coveragePrompts = promptFiles
    .filter(file => file.endsWith('.coverage.prompt.txt'))
    .map(file => join(config.promptsDir, file));

  if (targetFile) {
    coveragePrompts = coveragePrompts.filter(file => {
      const baseName = basename(file, '.coverage.prompt.txt');
      return baseName.toLowerCase().includes(targetFile.toLowerCase());
    });
    console.log(`🎯 Filtrando per target: ${targetFile}`);
  }

  if (skipCompleted) {
    const initialCount = coveragePrompts.length;
    coveragePrompts = coveragePrompts.filter(file => {
      const promptName = basename(file, '.coverage.prompt.txt');
      const validFile = join(config.validOutputDir, `${promptName}.spec.ts`);
      return !existsSync(validFile);
    });
    const skippedCount = initialCount - coveragePrompts.length;
    if (skippedCount > 0) {
      console.log(`⏭️  Saltati ${skippedCount} test già completati (usa --force per rigenerare)`);
    }
  }

  console.log(`📁 Trovati ${coveragePrompts.length} prompt da processare`);

  const results = {
    total: coveragePrompts.length,
    success: 0,
    failed: 0,
    processed: 0,
  };

  for (let i = 0; i < coveragePrompts.length; i += config.maxConcurrent) {
    const batch = coveragePrompts.slice(i, i + config.maxConcurrent);

    console.log(`\n🔄 Processando batch ${Math.floor(i / config.maxConcurrent) + 1}/${Math.ceil(coveragePrompts.length / config.maxConcurrent)}`);
    console.log(`📊 Progresso: ${results.processed}/${results.total} (${results.total ? Math.round(results.processed / results.total * 100) : 0}%)`);

    const batchPromises = batch.map(promptFile => generateTest(promptFile));
    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(result => {
      results.processed++;
      if (result.success) results.success++; else results.failed++;
    });

    if (i + config.maxConcurrent < coveragePrompts.length) {
      console.log('⏸️  Pausa di 5 secondi prima del prossimo batch...');
      await sleep(5000);
    }
  }

  console.log('\n🏁 Generazione completata!');
  console.log(`📊 Statistiche dettagliate:`);
  console.log(`   📁 Totale prompt processati: ${metrics.total}`);
  console.log(`   ✅ Test validi (compilabili e completi): ${metrics.successful}`);
  console.log(`   ⚠️  Test incompleti (con TODO_AI): ${metrics.incomplete}`);
  console.log(`   ❌ Errori di compilazione: ${metrics.compilationErrors}`);
  console.log(`   🧩 Errori ABI (funzioni/eventi non in ABI): ${metrics.abiErrors}`);
  console.log(`   🛑 Banned patterns (external provider/wallet/RPC): ${metrics.bannedPatternErrors}`);
  console.log(`   ⏰ Timeout LLM: ${metrics.timeouts}`);
  console.log(`   📈 Tasso successo: ${metrics.total ? Math.round(metrics.successful / metrics.total * 100) : 0}%`);
  console.log(`   🔧 Tasso compilazione: ${metrics.total ? Math.round((metrics.successful + metrics.incomplete) / metrics.total * 100) : 0}%`);

  const metricsFile = join(config.outputDir, 'quality-metrics.json');
  await fs.writeFile(metricsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    config,
    metrics,
    qualityAnalysis: {
      successRate: metrics.total ? metrics.successful / metrics.total : 0,
      compilationRate: metrics.total ? (metrics.successful + metrics.incomplete) / metrics.total : 0,
      completionRate: (metrics.successful + metrics.incomplete) ? (metrics.successful / (metrics.successful + metrics.incomplete)) : 0
    }
  }, null, 2));

  if (metrics.successful > 0) {
    console.log(`\n🎉 Test validi salvati in: ${config.validOutputDir}`);
    console.log(`📋 Metriche salvate in: ${metricsFile}`);
  }
  if (metrics.compilationErrors > 0 || metrics.incomplete > 0) {
    console.log(`\n🔍 Test problematici in: ${config.invalidOutputDir}`);
  }
}

process.on('SIGINT', () => {
  console.log('\n⚠️  Processo interrotto dall\'utente');
  process.exit(0);
});

/* Rimuove blocchi markdown e testo extra, restituisce solo TypeScript puro */
function extractTypeScriptBlock(content: string): string {
  // Cerca blocco ```ts ... ``` oppure ```typescript ... ```
  const match = content.match(/```(?:ts|typescript)?[\s\r\n]*([\s\S]*?)```/i);
  if (match) return match[1].trim();
  // Se non trova blocco, restituisce tutto il contenuto (già pulito)
  return content.trim();
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});