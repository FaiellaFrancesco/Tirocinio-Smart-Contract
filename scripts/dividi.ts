/**
 * USAGE:
 *
 * npx ts-node scripts/dividi.ts --small=30 --medium=500 --directory=/path/to/contracts
 *
 * Parameters:
 *   --small, -s      Soglia massima di righe per la categoria 'small' (default: 70)
 *   --medium, -m     Soglia massima di righe per la categoria 'medium' (default: 200)
 *   --directory, -d  Directory da analizzare (default: ./contracts)
 *
 * Lo script suddivide i file Solidity (.sol) nelle sottocartelle 'empty', 'small', 'medium', 'large' in base al numero di righe.
 * I file vuoti (0 byte) finiscono in 'empty'.
 *
 * Esempio:
 *   npx ts-node scripts/dividi.ts --small=30 --medium=500 --directory=/Users/francescofaiella/Desktop/Tirocinio/contracts
 */
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Interfaccia per configurazione
interface Config {
  dir: string;
  empty: string[];
  small: string[];
  medium: string[];
  large: string[];
}

// Funzione per classificare i file in base al numero di righe
function classifyFilesByLines(directory: string, smallThreshold: number, mediumThreshold: number): Config {
  const empty: string[] = [];
  const small: string[] = [];
  const medium: string[] = [];
  const large: string[] = [];

  // Ricorsivamente trova tutti i file .sol nella directory e sottocartelle
  function findSolFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findSolFiles(filePath));
      } else if (file.endsWith('.sol')) {
        results.push(filePath);
      }
    }
    return results;
  }

  const files = findSolFiles(directory);

  for (const filePath of files) {
    const filename = path.basename(filePath);
    const data = fs.readFileSync(filePath, 'utf8');
    const isEmpty = !data || data.replace(/\s/g, '').length === 0;
    const lines = data.split('\n');
    const numLines = lines.length;

    if (isEmpty) {
      empty.push(filename);
    } else if (numLines < smallThreshold) {
      small.push(filename);
    } else if (numLines >= smallThreshold && numLines <= mediumThreshold) {
      medium.push(filename);
    } else {
      large.push(filename);
    }
  }

  return { dir: directory, empty, small, medium, large };
}

const main = async () => {
  const argv = await yargs(hideBin(process.argv))
    .option('small', {
      alias: 's',
      type: 'number',
      description: 'Numero di righe per i file piccoli',
      default: 70,
    })
    .option('medium', {
      alias: 'm',
      type: 'number',
      description: 'Numero di righe per i file medi',
      default: 200,
    })
    .option('directory', {
      alias: 'd',
      type: 'string',
      description: 'La directory da esaminare',
      default: './contracts',
    })
    .help()
    .parse();

  const small = argv.small as number;
  const medium = argv.medium as number;
  const directory = argv.directory as string;

  console.log(`Parametro --small: ${small}`);
  console.log(`Parametro --medium: ${medium}`);

  const { empty: emptyFiles, small: smallFiles, medium: mediumFiles, large: largeFiles } = classifyFilesByLines(directory, small, medium);

  console.log(`Contratti trovati:`);
  console.log(`  Empty:  ${emptyFiles.length}`);
  console.log(`  Small:  ${smallFiles.length}`);
  console.log(`  Medium: ${mediumFiles.length}`);
  console.log(`  Large:  ${largeFiles.length}`);

  // Crea le cartelle se non esistono
  const emptyDir = path.join(directory, 'empty');
  const smallDir = path.join(directory, 'small');
  const mediumDir = path.join(directory, 'medium');
  const largeDir = path.join(directory, 'large');
  if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir);
  if (!fs.existsSync(smallDir)) fs.mkdirSync(smallDir);
  if (!fs.existsSync(mediumDir)) fs.mkdirSync(mediumDir);
  if (!fs.existsSync(largeDir)) fs.mkdirSync(largeDir);

  // Funzione per spostare i file
  function moveFiles(fileList: string[], targetDir: string) {
    for (const filename of fileList) {
      const oldPath = path.join(directory, filename);
      const newPath = path.join(targetDir, filename);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }
  }

  moveFiles(emptyFiles, emptyDir);
  moveFiles(smallFiles, smallDir);
  moveFiles(mediumFiles, mediumDir);
  moveFiles(largeFiles, largeDir);
};

main();