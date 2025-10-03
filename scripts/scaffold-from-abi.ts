/**
 * Come usare:
 * npx ts-node scripts/scaffold-from-abi.ts [artifacts-path] [output-path] [--include=regex]
 *
 * Esempi:
 * npx ts-node scripts/scaffold-from-abi.ts                      # usa defaults
 * npx ts-node scripts/scaffold-from-abi.ts artifacts/contracts  test/llm
 * npx ts-node scripts/scaffold-from-abi.ts artifacts/contracts  test/llm --include=Token
 */

import * as fs from "fs";
import * as path from "path";

const DEFAULT_ARTIFACTS_ROOT = "./artifacts/contracts";
const DEFAULT_OUTDIR = "./tests/llm";


interface AbiItem {
  type: string;
  name?: string;
  inputs?: any[];
  stateMutability?: string;
}
interface ArtifactJson {
  contractName?: string;
  sourceName?: string;
  abi?: AbiItem[];
  bytecode?: string; // "0x..." se deployabile, "0x" se interfaccia/astratto
}

function isReadableFile(filepath: string): boolean {
  try {
    return fs.statSync(filepath).isFile() && !path.basename(filepath).startsWith(".");
  } catch { return false; }
}

function tsDefaultFor(solType: string): string {
  if (solType.endsWith("[]")) return "[] /* TODO_AI */";
  if (solType.startsWith("uint") || solType.startsWith("int")) return "1n /* TODO_AI */";
  if (solType === "address") return "addr1.address /* TODO_AI */";
  if (solType === "bool") return "true /* TODO_AI */";
  if (solType === "string") return '"example" /* TODO_AI */';
  if (solType.startsWith("bytes32")) return `"0x${"00".repeat(64)}" /* TODO_AI */`;
  if (solType.startsWith("bytes")) return '"0x" /* TODO_AI */';
  if (solType.startsWith("tuple")) return "{ /* TODO_AI tuple */ }";
  return "/* TODO_AI */";
}

function signatureOf(name: string, inputs: any[]): string {
  const t = (inputs ?? []).map((i: any) => i.type).join(",");
  return `${name}(${t})`;
}

function renderFunctionBlock(fn: AbiItem): string {
  const name = fn.name!;
  const sig = signatureOf(name, fn.inputs || []);
  const argsList = (fn.inputs || []).map(i => tsDefaultFor(i.type)).join(", ");
  const isView = fn.stateMutability === "view" || fn.stateMutability === "pure";
  const isPayable = fn.stateMutability === "payable";
  const callLine = isView
    ? `await contract.${name}(${argsList})`
    : `await contract.${name}(${argsList}${isPayable ? (argsList ? ", " : "") + "{ value: 1n /* TODO_AI in wei */ }" : ""})`;
  const expectLine = isView
    ? `// TODO_AI: expect(await contract.${name}(${argsList})).to.equal(/* atteso */);`
    : `// TODO_AI: verifica stato/eventi dopo la tx`;
  const badArgs = (fn.inputs || []).map(_ => "/* TODO_AI bad */").join(", ");
  const stateComment = isView ? "// chiamata di sola lettura" : "// transazione che modifica lo stato";

  return `
  describe("${sig}", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      ${stateComment}
      const result = ${callLine};
      ${expectLine}
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.${name}(${badArgs})
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });
`;
}

function renderFile(contractName: string, abi: AbiItem[]): string {
  const fns = abi.filter(a => a.type === "function" && a.name);
  const events = abi.filter(a => a.type === "event").map(e => (e as any).name).join(", ") || "—";
  const ctor = abi.find(a => a.type === "constructor");
  const ctorArgs = (ctor?.inputs || []).map(i => tsDefaultFor(i.type as string)).join(", ");

  return `import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per ${contractName}.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("${contractName} — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("${contractName}");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy(${ctorArgs});
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi in ABI: ${events}

  ${fns.map(renderFunctionBlock).join("\n")}
});
`;
}

function slugFromSource(sourceName?: string): string | null {
  if (!sourceName) return null;
  // es. "contracts/tokens/v2/Token.sol" -> "tokens__v2__Token"
  const parts = sourceName.replace(/^contracts\//, "").replace(/\.sol$/,"").split("/");
  return parts.join("__");
}

function main() {
  const args = process.argv.slice(2);
  const artifactsRoot = args[0] && !args[0].startsWith("--") ? args[0] : DEFAULT_ARTIFACTS_ROOT;
  const outDir = args[1] && !args[1].startsWith("--") ? args[1] : DEFAULT_OUTDIR;
  const includeReArg = args.find(a => a.startsWith("--include="));
  const includeRe = includeReArg ? new RegExp(includeReArg.split("=")[1]) : null;

  if (!fs.existsSync(artifactsRoot) || !fs.statSync(artifactsRoot).isDirectory()) {
    console.error("❌ Non trovo la cartella artifact: " + artifactsRoot);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  let count = 0, skipped = 0;

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith(".dbg.json")) continue; // ignora debug
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
        continue;
      }
      if (!entry.endsWith(".json") || !isReadableFile(fullPath)) continue;

      const rawData = fs.readFileSync(fullPath, "utf-8");
      let art: ArtifactJson;
      try { art = JSON.parse(rawData) as ArtifactJson; }
      catch { continue; }

      // requisito minimo: ABI presente
      if (!art.abi || !Array.isArray(art.abi) || art.abi.length === 0) { skipped++; continue; }
      // **filtro chiave**: solo contratti deployabili (no interfacce/librerie/astratti)
      if (typeof art.bytecode !== "string" || art.bytecode === "0x") { skipped++; continue; }

      const name = (art.contractName ?? path.basename(entry, ".json")).trim();
      if (includeRe && !includeRe.test(name)) { skipped++; continue; }

      // evita sovrascritture se esistono duplicati
      let outPath = path.join(outDir, `${name}.scaffold.spec.ts`);
      if (isReadableFile(outPath)) {
        const slug = slugFromSource(art.sourceName) ?? path.basename(fullPath, ".json");
        outPath = path.join(outDir, `${name}__${slug}.scaffold.spec.ts`);
      }

      const content = renderFile(name, art.abi as AbiItem[]);
      fs.writeFileSync(outPath, content, "utf-8");
      console.log(`✅ ${name}  →  ${outPath}`);
      count++;
    }
  }

  scanDir(artifactsRoot);
  console.log(`\n📁 Creati ${count} scaffold. Saltati ${skipped} artifact (interfacce/astratti/bytecode "0x" o senza ABI).`);
  console.log(`Artifact root: ${path.resolve(artifactsRoot)}  |  Output: ${path.resolve(outDir)}`);
}

main();