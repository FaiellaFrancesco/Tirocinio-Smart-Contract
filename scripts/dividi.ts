/**
 * divide.ts
 * 
 * Suddivide automaticamente i contratti nella cartella "contracts/" in un dataset strutturato
 * per dimensione (empty/small/medium/large) copiandoli in "dataset/".
 * 
 * Come usarlo:
 *   npx ts-node scripts/dividi.ts
 * Oppure con parametri personalizzati:
 *   npx ts-node scripts/dividi.ts small=60 medium=150
 *
 * Questo NON modifica la cartella "contracts/", utile per Hardhat.
 */

import fs from "fs";
import path from "path";

// Default values (possono essere sovrascritti da CLI)
let SMALL_MAX = 80;
let MEDIUM_MAX = 200;

// Parse CLI overrides small=XX medium=YY
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split("=");
  if (key === "small" && !isNaN(Number(value))) SMALL_MAX = Number(value);
  if (key === "medium" && !isNaN(Number(value))) MEDIUM_MAX = Number(value);
}

const CONTRACTS_DIR = "contracts";
const OUTPUT_DIR = "dataset";

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir(OUTPUT_DIR);
ensureDir(path.join(OUTPUT_DIR, "empty"));
ensureDir(path.join(OUTPUT_DIR, "small"));
ensureDir(path.join(OUTPUT_DIR, "medium"));
ensureDir(path.join(OUTPUT_DIR, "large"));

const report: Record<string, any> = {};

const files = fs.readdirSync(CONTRACTS_DIR).filter(f => f.endsWith(".sol"));

for (const file of files) {
  const filePath = path.join(CONTRACTS_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");

  const lines = content.split("\n").length;

  const importRegex = /import\s+["']([^"']+)["'];/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  let category: string;
  if (lines === 0) category = "empty";
  else if (lines <= SMALL_MAX) category = "small";
  else if (lines <= MEDIUM_MAX) category = "medium";
  else category = "large";

  const destDir = path.join(OUTPUT_DIR, category);
  const destPath = path.join(destDir, file);

  fs.copyFileSync(filePath, destPath);

  report[file] = {
    lines,
    category,
    imports
  };
}

fs.writeFileSync(
  path.join(OUTPUT_DIR, "report.json"),
  JSON.stringify(report, null, 2)
);