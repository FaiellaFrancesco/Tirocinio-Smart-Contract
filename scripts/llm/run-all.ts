#!/usr/bin/env npx ts-node

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { spawn } from 'child_process';
//npx ts-node scripts/llm/run-all.ts
interface Config {
  promptsDir: string;
  outputDir: string;
  model: string;
  retries: number;
  timeout: number;
  maxConcurrent: number;
}

const config: Config = {
  promptsDir: './prompts_out/coverage',
  outputDir: './prova1-lllm',
  model: 'qwen2.5-coder:3b',
  retries: 2,
  timeout: 90,
  maxConcurrent: 3 // Processa 3 contratti alla volta per non sovraccaricare Ollama
};

async function runCommand(command: string, args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { 
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let output = '';
    let error = '';
    
    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr?.on('data', (data) => {
      error += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output + (error ? '\nERROR: ' + error : '')
      });
    });
    
    // Timeout di sicurezza
    setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        output: 'TIMEOUT: Process killed after timeout'
      });
    }, config.timeout * 1000 + 10000);
  });
}

async function generateTest(promptFile: string): Promise<{ success: boolean; message: string }> {
  const promptName = basename(promptFile, '.coverage.prompt.txt'); //file input
  const outputFile = join(config.outputDir, `${promptName}.spec.ts`); //file output
  
  console.log(`🔄 Generando test per: ${promptName}`);
  
  const result = await runCommand('npx', [
    'ts-node',
    'scripts/llm/run-one.ts',
    `--input=${promptFile}`,
    `--out=${outputFile}`,
    `--model=${config.model}`,
    `--retries=${config.retries}`,
    `--timeout=${config.timeout}`
  ]);
  
  if (result.success) {
    console.log(`✅ Completato: ${promptName}`);
    return { success: true, message: `Generated: ${outputFile}` };
  } else {
    console.log(`❌ Fallito: ${promptName} - ${result.output.slice(0, 200)}...`);
    return { success: false, message: `Failed: ${result.output}` };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Avvio generazione automatica test con prompt in inglese...');
  
  // Verifica che le directory esistano
  try {
    await fs.access(config.promptsDir);
    await fs.mkdir(config.outputDir, { recursive: true });
  } catch (error) {
    console.error('❌ Errore accesso directory:', error);
    process.exit(1);
  }
  
  // Leggi tutti i file prompt
  const promptFiles = await fs.readdir(config.promptsDir);
  const coveragePrompts = promptFiles
    .filter(file => file.endsWith('.coverage.prompt.txt'))
    .map(file => join(config.promptsDir, file));
  
  console.log(`📁 Trovati ${coveragePrompts.length} prompt da processare`);
  
  const results = {
    total: coveragePrompts.length,
    success: 0,
    failed: 0,
    processed: 0
  };
  
  // Processa i prompt in batch per non sovraccaricare il sistema
  for (let i = 0; i < coveragePrompts.length; i += config.maxConcurrent) {
    const batch = coveragePrompts.slice(i, i + config.maxConcurrent);
    
    console.log(`\n🔄 Processando batch ${Math.floor(i / config.maxConcurrent) + 1}/${Math.ceil(coveragePrompts.length / config.maxConcurrent)}`);
    console.log(`📊 Progresso: ${results.processed}/${results.total} (${Math.round(results.processed / results.total * 100)}%)`);
    
    // Esegui il batch in parallelo
    const batchPromises = batch.map(promptFile => generateTest(promptFile));
    const batchResults = await Promise.all(batchPromises);
    
    // Aggiorna statistiche
    batchResults.forEach(result => {
      results.processed++;
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
    });
    
    // Pausa tra i batch per dare respiro al sistema
    if (i + config.maxConcurrent < coveragePrompts.length) {
      console.log('⏸️  Pausa di 5 secondi prima del prossimo batch...');
      await sleep(5000);
    }
  }
  
  console.log('\n🏁 Generazione completata!');
  console.log(`📊 Statistiche finali:`);
  console.log(`   ✅ Successi: ${results.success}`);
  console.log(`   ❌ Fallimenti: ${results.failed}`);
  console.log(`   📁 Totale: ${results.total}`);
  console.log(`   📈 Tasso successo: ${Math.round(results.success / results.total * 100)}%`);
  
  if (results.success > 0) {
    console.log(`\n🎉 Test generati nella directory: ${config.outputDir}`);
  }
}

// Gestione interruzione da tastiera
process.on('SIGINT', () => {
  console.log('\n⚠️  Processo interrotto dall\'utente');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
