#!/usr/bin/env npx ts-node

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { spawn } from 'child_process';

// Lista di contratti di test - puoi modificare questa lista
const TEST_CONTRACTS = [
  'PEPE__0x69420352854b7ea451122c4c66baa754b09fd705.coverage.prompt.txt',
  'AIAstroNet.coverage.prompt.txt',
  'BasicToken.coverage.prompt.txt',
  'ERC20.coverage.prompt.txt',
  'StandardToken.coverage.prompt.txt'
];

const config = {
  promptsDir: './prompts_out/coverage',
  outputDir: './test-lllm',
  model: 'qwen2.5-coder:3b',
  retries: 2,
  timeout: 90
};

async function runCommand(command: string, args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    console.log(`🔧 Comando: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, { 
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let output = '';
    let error = '';
    
    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      // Mostra l'output in tempo reale
      process.stdout.write(text);
    });
    
    proc.stderr?.on('data', (data) => {
      const text = data.toString();
      error += text;
      process.stderr.write(text);
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
  const promptName = basename(promptFile, '.coverage.prompt.txt');
  const outputFile = join(config.outputDir, `${promptName}.spec.ts`);
  const fullPromptPath = join(config.promptsDir, promptFile);
  
  console.log(`\n🔄 Generando test per: ${promptName}`);
  console.log(`📝 Prompt: ${fullPromptPath}`);
  console.log(`📄 Output: ${outputFile}`);
  
  // Verifica che il prompt esista
  try {
    await fs.access(fullPromptPath);
  } catch (error) {
    return { success: false, message: `Prompt file not found: ${fullPromptPath}` };
  }
  
  const result = await runCommand('npx', [
    'ts-node',
    'scripts/llm/run-one.ts',
    `--input=${fullPromptPath}`,
    `--out=${outputFile}`,
    `--model=${config.model}`,
    `--retries=${config.retries}`,
    `--timeout=${config.timeout}`
  ]);
  
  if (result.success) {
    console.log(`✅ Completato: ${promptName}`);
    
    // Verifica che il file sia stato creato
    try {
      const stats = await fs.stat(outputFile);
      console.log(`📊 File creato: ${stats.size} bytes`);
      return { success: true, message: `Generated: ${outputFile} (${stats.size} bytes)` };
    } catch (error) {
      return { success: false, message: `File not created: ${outputFile}` };
    }
  } else {
    console.log(`❌ Fallito: ${promptName}`);
    return { success: false, message: `Failed: ${result.output}` };
  }
}

async function main() {
  console.log('🧪 Test di generazione con prompt in inglese...');
  
  // Verifica che le directory esistano
  try {
    await fs.access(config.promptsDir);
    await fs.mkdir(config.outputDir, { recursive: true });
  } catch (error) {
    console.error('❌ Errore accesso directory:', error);
    process.exit(1);
  }
  
  console.log(`📁 Testando ${TEST_CONTRACTS.length} contratti selezionati`);
  
  const results = {
    total: TEST_CONTRACTS.length,
    success: 0,
    failed: 0
  };
  
  // Processa i contratti uno alla volta per debug
  for (const promptFile of TEST_CONTRACTS) {
    const result = await generateTest(promptFile);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      console.log(`❌ Errore dettagli: ${result.message}`);
    }
    
    console.log(`\n📊 Progresso: ${results.success + results.failed}/${results.total}`);
    
    // Pausa di 2 secondi tra i test
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 Test completato!');
  console.log(`📊 Risultati:`);
  console.log(`   ✅ Successi: ${results.success}`);
  console.log(`   ❌ Fallimenti: ${results.failed}`);
  console.log(`   📈 Tasso successo: ${Math.round(results.success / results.total * 100)}%`);
  
  if (results.success > 0) {
    console.log(`\n🎉 Test generati nella directory: ${config.outputDir}`);
    console.log('📁 File generati:');
    
    // Lista i file generati
    try {
      const files = await fs.readdir(config.outputDir);
      const testFiles = files.filter(f => f.endsWith('.spec.ts'));
      testFiles.forEach(file => console.log(`   📄 ${file}`));
    } catch (error) {
      console.log('   (impossibile listare i file)');
    }
  }
  
  if (results.success === results.total) {
    console.log('\n🚀 Tutti i test sono passati! Puoi ora usare run-all.ts per processare tutti i contratti.');
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
