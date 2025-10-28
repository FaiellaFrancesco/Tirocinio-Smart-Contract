
import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Script per eseguire tutti i test TypeScript (.spec.ts) in una cartella scelta.
 * Utilizza Hardhat per eseguire ogni test.
 * 
 * Uso:
 *   npx ts-node scripts/test-all-generated.ts <cartella_test>
 * Dove <cartella_test> è la cartella che contiene i file di test generati.
 */

/**
 * Ricorsivamente cerca tutti i file che terminano con .spec.ts nella cartella indicata.
 * @param dir Cartella di partenza
 * @returns Array di percorsi dei file di test trovati
 */
function findSpecFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      // Se è una sottocartella, cerca ricorsivamente
      results = results.concat(findSpecFiles(filePath));
    } else if (extname(file) === '.ts' && file.endsWith('.spec.ts')) {
      // Se è un file .spec.ts, aggiungilo ai risultati
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Esegue ogni file di test trovato usando Hardhat.
 * Mostra a schermo il risultato di ogni test.
 * @param testFiles Array di percorsi dei file di test
 */

function runTests(testFiles: string[]) {
  let passed = 0;
  let failed = 0;
  for (const file of testFiles) {
    console.log(`\n=== Running test: ${file} ===`);
    try {
      execSync(`npx hardhat test ${file} --no-compile`, { stdio: 'inherit' });
      passed++;
    } catch (err) {
      console.error(`Test failed: ${file}`);
      failed++;
    }
  }
  console.log(`\nResoconto finale:`);
  console.log(`Test superati: ${passed}`);
  console.log(`Test falliti: ${failed}`);
}

/**
 * Funzione principale: prende la cartella dai parametri, cerca i test e li esegue.
 */
function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: npx ts-node scripts/test-all-generated.ts <cartella_test>');
    process.exit(1);
  }
  const testFiles = findSpecFiles(folder);
  if (testFiles.length === 0) {
    console.log('Nessun file .spec.ts trovato nella cartella selezionata.');
    return;
  }
  runTests(testFiles);
}

// Avvia lo script
main();
