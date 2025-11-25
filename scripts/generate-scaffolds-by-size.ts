import fs from "fs";
import path from "path";

type ContractFunction = {
  name: string;
  inputs: string;
  outputs: string;
  visibility: string;
};

type ContractEvent = {
  name: string;
  inputs: string;
};

//
// ────────────────────────────────────────────────
//   HELPERS
// ────────────────────────────────────────────────
//

// Regex extraction for functions
const functionRegex =
  /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:([a-zA-Z ]+))?\s*(?:returns\s*\(([^)]*)\))?/g;

// Regex extraction for events
const eventRegex =
  /event\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;

function extractFunctions(code: string): ContractFunction[] {
  const funcs: ContractFunction[] = [];
  let match;

  while ((match = functionRegex.exec(code)) !== null) {
    const name = match[1];
    const inputs = match[2]?.trim() || "";
    const visibility = match[3]?.trim() || "";
    const outputs = match[4]?.trim() || "";
    funcs.push({ name, inputs, outputs, visibility });
  }
  return funcs;
}

function extractEvents(code: string): ContractEvent[] {
  const events: ContractEvent[] = [];
  let match;

  while ((match = eventRegex.exec(code)) !== null) {
    events.push({
      name: match[1],
      inputs: match[2]?.trim() || "",
    });
  }

  return events;
}

function detectContractName(code: string) {
  const match = code.match(
    /contract\s+([A-Za-z_][A-Za-z0-9_]*)/
  );
  return match ? match[1] : "CONTRACT";
}

//
// ────────────────────────────────────────────────
//   SCAFFOLD GENERATION
// ────────────────────────────────────────────────
//

function makeScaffold(
  contractName: string,
  funcs: ContractFunction[],
  events: ContractEvent[]
): string {
  const fnLines = funcs
    .map((fn) => {
      return `  // function ${fn.name}(${fn.inputs})`;
    })
    .join("\n");

  const eventLines = events
    .map((ev) => {
      return `  // event ${ev.name}(${ev.inputs})`;
    })
    .join("\n");

  return `/**
 * Scaffold for ${contractName}
 * Auto-generated for LLM training.
 */

export const ${contractName}Scaffold = {
  contractName: "${contractName}",

  functions: [
${fnLines}
  ],

  events: [
${eventLines}
  ],
};
`;
}

//
// ────────────────────────────────────────────────
//   MAIN SCRIPT
// ────────────────────────────────────────────────
//

const DATASET_ROOT = "dataset";
const OUTPUT_ROOT = "scaffolds";

if (!fs.existsSync(OUTPUT_ROOT)) {
  fs.mkdirSync(OUTPUT_ROOT);
}

const sizes = ["small", "medium", "large"];

let generated = 0;

for (const size of sizes) {
  const folder = path.join(DATASET_ROOT, size);
  const outputFolder = path.join(OUTPUT_ROOT, size);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const files = fs.readdirSync(folder);

  for (const file of files) {
    if (!file.endsWith(".sol")) continue;

    const filePath = path.join(folder, file);
    const code = fs.readFileSync(filePath, "utf8");

    const contractName = detectContractName(code);
    const funcs = extractFunctions(code);
    const events = extractEvents(code);

    const scaffold = makeScaffold(contractName, funcs, events);

    const outPath = path.join(
      outputFolder,
      `${contractName}.scaffold.ts`
    );

    fs.writeFileSync(outPath, scaffold, "utf8");

    console.log(`✅ Scaffold creato: ${outPath}`);
    generated++;
  }
}

console.log(`\n📁 Scaffolds generati: ${generated}`);
console.log(`Output → ${path.resolve(OUTPUT_ROOT)}`);