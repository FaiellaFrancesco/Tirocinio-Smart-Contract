/**
 * USAGE: Generates test scaffolds for all Solidity contracts, organized by size.
 *
 * Quick start:
 *   npx ts-node scripts/generate-scaffolds-by-size.ts
 *
 * Options:
 *   [artifacts-path]   Hardhat artifacts root path (default: ./artifacts/contracts)
 *   [output-path]      Output folder for test scaffolds (default: ./scaffolds)
 *   --include=regex    Only contracts matching the regex
 *
 * Examples:
 *   npx ts-node scripts/generate-scaffolds-by-size.ts
 *   npx ts-node scripts/generate-scaffolds-by-size.ts artifacts/contracts scaffolds --include=Token
 *
 * The output folder is deleted and recreated on each run.
 * Generated files contain test stubs for every function, comments for events/errors, and TODO_AI blocks for LLM completion.
 */

import * as fs from "fs";
import * as path from "path";

const DEFAULT_ARTIFACTS_ROOT = "./artifacts/contracts";
const DEFAULT_OUTDIR = "./scaffolds";


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
  if (solType.includes("tuple")) return "{ /* TODO_AI tuple */ }";
  return "/* TODO_AI */";
}
function badTsDefaultFor(solType: string): string {
  // "edge/zero" arguments valid at syntax level
  if (solType.endsWith("[]")) return "[] /* TODO_AI: make invalid/edge */";
  if (solType.startsWith("uint") || solType.startsWith("int")) return "0n /* TODO_AI: make invalid/edge */";
  if (solType === "bool") return "false /* TODO_AI */";
  if (solType === "address") return '"0x0000000000000000000000000000000000000000" /* TODO_AI: use zero/unauthorized */';
  if (solType.startsWith("bytes32")) return `"0x${"00".repeat(64)}" /* TODO_AI */`;
  if (solType.startsWith("bytes")) return '"0x" /* TODO_AI */';
  if (solType === "string") return '"" /* TODO_AI */';
  if (solType.includes("tuple")) return "{ /* TODO_AI invalid tuple */ }";
  return tsDefaultFor(solType);
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
  const badArgs = (fn.inputs || []).map((i: any) => badTsDefaultFor(i.type)).join(", ");
  const stateComment = isView ? "// read-only call" : "// state-changing transaction";

  return `
  describe("${sig}", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      ${stateComment}
      const result = ${callLine};
      ${expectLine}
    });

    ${!isView ? `it("reverts on invalid input/role", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.${name}(${badArgs})
      ).to.be.revertedWith(/* TODO_AI: inserire messaggio */);
    });` : ""}

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), role limits, etc.
    });

    // TODO_AI: if emits events: await expect(tx).to.emit(contract, "Event").withArgs(...)
  });
`;
}

function renderFile(contractName: string, abi: AbiItem[], sourceName?: string): string {
  const fns = abi.filter(a => a.type === "function" && a.name);
  const events = abi.filter(a => a.type === "event").map(e => (e as any).name).join(", ") || "—";
  const ctor = abi.find(a => a.type === "constructor");
  const ctorArgs = (ctor?.inputs || []).map(i => tsDefaultFor(i.type as string)).join(", ");
  const fqName = sourceName ? `${sourceName}:${contractName}` : contractName;

  // Always use contractName for Hardhat getContractFactory
  const factoryName = contractName;


  let fileContent = `import { expect } from "chai";
  import hre from "hardhat";
  import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

  /**
   * Scaffold automatically generated for ${fqName}.
   * Blocks marked // TODO_AI must be completed by the LLM.
   */

  describe("${fqName} — LLM Scaffold", function () {
    async function deployFixture() {
      const { ethers } = (await import("hardhat")).default;
      const [owner, addr1, addr2] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("${factoryName}");
      // TODO_AI: complete constructor parameters if present
      const contract = await Factory.deploy();
      await contract.waitForDeployment();
      return { contract, owner, addr1, addr2 };
    }

    it("basic deployment", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.getAddress()).to.match(/^0x[a-fA-F0-9]{40}$/);
    });

    // Events in ABI: ${events}

    ${fns.length > 0 ? fns.map(renderFunctionBlock).join("\n") : `it("placeholder", async function () { /* TODO_AI: No functions in ABI */ });`}
  });
`;
  // Add final newline for linter compliance
  if (!fileContent.endsWith("\n")) fileContent += "\n";
  return fileContent;
}

function slugFromSource(sourceName?: string): string | null {
  if (!sourceName) return null;
  // e.g. "contracts/tokens/v2/Token.sol" -> "tokens__v2__Token"
  const parts = sourceName.replace(/^contracts\//, "").replace(/\.sol$/, "").split("/");
  return parts.join("__");
}

function removeOutputBase(outDirBase: string) {
  if (fs.existsSync(outDirBase)) {
    fs.rmSync(outDirBase, { recursive: true, force: true });
  }
}


function main() {
  const args = process.argv.slice(2);
  const artifactsRoot = args[0] && !args[0].startsWith("--") ? args[0] : DEFAULT_ARTIFACTS_ROOT;
  const outDirBase = args[1] && !args[1].startsWith("--") ? args[1] : DEFAULT_OUTDIR;

  // Output folder cleaning: only if --clean is provided
  const cleanFlag = args.includes("--clean");
  if (cleanFlag) {
    removeOutputBase(outDirBase);
  }

  const outDirs = {
    empty: path.join(outDirBase, "empty"),
    small: path.join(outDirBase, "small"),
    medium: path.join(outDirBase, "medium"),
    large: path.join(outDirBase, "large"),
  };
  Object.values(outDirs).forEach(dir => fs.mkdirSync(dir, { recursive: true }));

  // Safe regex handling for --include
  const includeReArg = args.find(a => a.startsWith("--include="));
  let includeRe: RegExp | null = null;
  if (includeReArg) {
    try {
      includeRe = new RegExp(includeReArg.split("=")[1]);
    } catch (err) {
      console.error("❌ Invalid --include regex:", err);
      includeRe = null;
    }
  }

  if (!fs.existsSync(artifactsRoot) || !fs.statSync(artifactsRoot).isDirectory()) {
    console.error("❌ Artifact folder not found: " + artifactsRoot);
    process.exit(1);
  }
  fs.mkdirSync(outDirBase, { recursive: true });

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

      // Minimum requirement: ABI present
      if (!art.abi || !Array.isArray(art.abi) || art.abi.length === 0) { skipped++; continue; }
      // Key filter: only deployable contracts (no interfaces/libraries/abstract)
      if (typeof art.bytecode !== "string" || art.bytecode === "0x") { skipped++; continue; }

      const name = (art.contractName ?? path.basename(entry, ".json")).trim();
      if (includeRe && !includeRe.test(name)) { skipped++; continue; }

      // Determine output folder by source path
      let sizeFolder: string | undefined = undefined;
      if (art.sourceName?.includes("/empty/")) sizeFolder = "empty";
      else if (art.sourceName?.includes("/small/")) sizeFolder = "small";
      else if (art.sourceName?.includes("/medium/")) sizeFolder = "medium";
      else if (art.sourceName?.includes("/large/")) sizeFolder = "large";
      const outDir = sizeFolder ? outDirs[sizeFolder] : outDirBase;

      // Always generate a unique output filename using the source slug
      const slug = slugFromSource(art.sourceName) ?? path.basename(fullPath, ".json");
      const outPath = path.join(outDir, `${name}__${slug}.scaffold.spec.ts`);

      const content = renderFile(name, art.abi as AbiItem[], art.sourceName);
      try {
        fs.writeFileSync(outPath, content, "utf-8");
        console.log(`✅ ${name} (${art.sourceName})  →  ${outPath}`);
        count++;
      } catch (err) {
        console.error(`❌ Write failed for ${outPath}:`, err);
        skipped++;
        continue;
      }
    }
  }

  scanDir(artifactsRoot);
  console.log(`\n📁 Created ${count} scaffolds. Skipped ${skipped} artifacts (interfaces/abstract/bytecode '0x' or missing ABI, or write errors).`);
  console.log(`Artifact root: ${path.resolve(artifactsRoot)}  |  Output base: ${path.resolve(outDirBase)}`);
}

main();