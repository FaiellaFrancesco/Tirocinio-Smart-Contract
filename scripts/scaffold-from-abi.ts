/**
 * How to use:
 * npx ts-node scripts/scaffold-from-abi.ts [artifacts-path] [output-path] [--include=regex] [--with-typechain=true|false]
 *
 * Examples:
 * npx ts-node scripts/scaffold-from-abi.ts                      # use defaults (./tests/llm)
 * npx ts-node scripts/scaffold-from-abi.ts artifacts/contracts  tests/llm
 * npx ts-node scripts/scaffold-from-abi.ts artifacts/contracts  tests/llm --include=Token
 * npx ts-node scripts/scaffold-from-abi.ts artifacts/contracts  tests/llm --with-typechain=false
 */

import * as fs from "fs";
import * as path from "path";

const DEFAULT_ARTIFACTS_ROOT = "./artifacts/contracts";
const DEFAULT_OUTDIR = "./tests/llm";

interface AbiItem {
  type: string;
  name?: string;
  inputs?: any[];
  outputs?: any[];
  stateMutability?: string;
}

interface ArtifactJson {
  contractName?: string;
  sourceName?: string;
  abi?: AbiItem[];
  bytecode?: string;
  metadata?: any;
}

interface ContractArtifact {
  contractName: string;
  sourceName: string;
  abi: AbiItem[];
  fullPath: string;
}

interface ArtifactCandidate {
  filePath: string;
  artifact: ArtifactJson;
  relativePath: string;
}

interface ArtifactInfo {
  contractName: string;
  sourceName: string;
  relativePath: string;
  abi: AbiItem[];
  metadata?: any;
}

interface GenerationConfig {
  withTypeChain: boolean;
}

interface ParsedArgs {
  artifactsRoot: string;
  outDir: string;
  includePattern: RegExp | null;
  withTypeChain: boolean;
}

function isReadableFile(filepath: string): boolean {
  try {
    return fs.statSync(filepath).isFile() && !path.basename(filepath).startsWith(".");
  } catch { return false; }
}

function getConstructorPlaceholder(solType: string): string {
  if (solType.endsWith("[]")) return "[]";
  if (solType.startsWith("uint") || solType.startsWith("int")) return "0n";
  if (solType === "address") return "ethers.ZeroAddress";
  if (solType === "bool") return "false";
  if (solType === "string") return '""';
  if (solType.startsWith("bytes32")) return '"0x"';
  if (solType.startsWith("bytes")) return '"0x"';
  if (solType.startsWith("tuple")) return "{}";
  return '""';
}

function getTestPlaceholder(solType: string): string {
  if (solType.endsWith("[]")) return "[] /* TODO_AI */";
  if (solType.startsWith("uint") || solType.startsWith("int")) return "1n /* TODO_AI */";
  if (solType === "address") return "addr1.address /* TODO_AI */";
  if (solType === "bool") return "true /* TODO_AI */";
  if (solType === "string") return '"example" /* TODO_AI */';
  if (solType.startsWith("bytes32")) return `"0x${"00".repeat(32)}" /* TODO_AI */`;
  if (solType.startsWith("bytes")) return '"0x" /* TODO_AI */';
  if (solType.startsWith("tuple")) return "{ /* TODO_AI tuple */ }";
  return "/* TODO_AI */";
}

function getBadTestPlaceholder(solType: string): string {
  if (solType.endsWith("[]")) return "[] /* TODO_AI: make invalid/edge */";
  if (solType.startsWith("uint") || solType.startsWith("int")) return "0n /* TODO_AI: make invalid/edge */";
  if (solType === "bool") return "false /* TODO_AI */";
  if (solType === "address") return "ethers.ZeroAddress /* TODO_AI: use zero/unauthorized */";
  if (solType.startsWith("bytes32")) return `"0x${"00".repeat(32)}" /* TODO_AI */`;
  if (solType.startsWith("bytes")) return '"0x" /* TODO_AI */';
  if (solType === "string") return '""/* TODO_AI */';
  if (solType.startsWith("tuple")) return "{ /* TODO_AI invalid tuple */ }";
  return getTestPlaceholder(solType);
}

function signatureOf(name: string, inputs: any[]): string {
  const t = (inputs ?? []).map((i: any) => i.type).join(",");
  return `${name}(${t})`;
}

function getFunctionSignature(fn: AbiItem): string {
  const inputs = fn.inputs || [];
  const types = inputs.map(i => i.type).join(",");
  const mutability = fn.stateMutability || "nonpayable";
  return `${fn.name}(${types})->${mutability}`;
}

function getEventSignature(event: AbiItem): string {
  const inputs = event.inputs || [];
  const types = inputs.map(i => i.type).join(",");
  return `${event.name}(${types})`;
}

function renderFixtureFunction(
  abi: AbiItem[], 
  contractName: string, 
  config: GenerationConfig,
  artifactInfo: ArtifactInfo
): string {
  const ctor = abi.find((f: any) => f.type === "constructor");
  const ctorArgs = (ctor?.inputs || []).map(i => getConstructorPlaceholder(i.type as string)).join(", ");
  const fqn = `${artifactInfo.sourceName}:${contractName}`;

  if (config.withTypeChain) {
    return `async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const factory = new ${contractName}__factory(owner);
    const contract = await factory.deploy(${ctorArgs});
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }`;
  } else {
    return `async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("${fqn}");
    const contract = await Contract.deploy(${ctorArgs});
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }`;
  }
}

function renderFunctionBlock(fn: AbiItem): string {
  const name = fn.name!;
  const sig = signatureOf(name, fn.inputs || []);
  const isView = fn.stateMutability === "view" || fn.stateMutability === "pure";

  if (isView) {
    return `
  describe("${sig}", function () {
    it("happy path", async function () {
      this.skip(); // TODO_AI: remove this.skip() when implementing
      // TODO_AI: Arrange -> prepare preconditions if needed
      // TODO_AI: Act -> call ${name}() with valid inputs
      // TODO_AI: Assert -> expect correct return values
    });

    it("edge cases", async function () {
      this.skip(); // TODO_AI: remove this.skip() when implementing
      // TODO_AI: Test edge cases (zero values, max values, etc.)
    });
  });
`;
  } else {
    return `
  describe("${sig}", function () {
    it("happy path", async function () {
      this.skip(); // TODO_AI: remove this.skip() when implementing
      // TODO_AI: Arrange -> prepare preconditions (e.g., fund contract if withdrawing)
      // TODO_AI: Act -> call the function with valid inputs
      // TODO_AI: Assert -> expect events/state changes
    });

    it("reverts on invalid input/role", async function () {
      this.skip(); // TODO_AI: remove this.skip() when implementing
      // TODO_AI: Arrange -> prepare preconditions
      // TODO_AI: Act -> call function with invalid inputs or unauthorized caller
      // TODO_AI: Assert -> expect revert with specific message
    });

    it("boundary cases", async function () {
      this.skip(); // TODO_AI: remove this.skip() when implementing
      // TODO_AI: Test boundary conditions (0, max values, role limits, etc.)
    });
  });
`;
  }
}

function renderFile(
  contractName: string, 
  abi: AbiItem[], 
  config: GenerationConfig,
  artifactInfo: ArtifactInfo,
  outputDir: string
): string {
  const fns = abi.filter(a => a.type === "function" && a.name);
  const events = abi.filter(a => a.type === "event");
  const functionSigs = fns.map(getFunctionSignature).join("\n *   ") || "(none)";
  const eventSigs = events.map(getEventSignature).join("\n *   ") || "(none)";
  
  // Calculate relative path to typechain-types
  const relativePath = path.relative(outputDir, ".");
  const typechainPath = path.posix.join(relativePath, "typechain-types");
  
  // Generate imports
  let imports = `import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";`;

  if (config.withTypeChain) {
    imports += `\nimport { ${contractName}, ${contractName}__factory } from "${typechainPath}";`;
  }

  // Generate FQN
  const fqn = `${artifactInfo.sourceName}:${contractName}`;

  // Generate documentation header
  const header = `/**
 * Auto-generated scaffold for ${contractName}.
 * ARTIFACT_SOURCE: ${artifactInfo.sourceName}
 * ARTIFACT_PATH: ${artifactInfo.relativePath}
 * ARTIFACT_FQN: ${fqn}
 *
 * FUNCTIONS:
 *   ${functionSigs}
 *
 * EVENTS:
 *   ${eventSigs}
 *
 * LLM NOTES (follow strictly):
 * - Remove this.skip() and fill TODO_AI blocks when implementing tests.
 * - Use Ethers v6 (no ethers.utils), bigint literals, ethers.ZeroAddress.
 * - View/Pure: assert return values. State-changing: happy path + revert + boundary.
 * - Do NOT introduce functions that are not listed above.
 */`;

  const deployFixture = renderFixtureFunction(abi, contractName, config, artifactInfo);

  return `${imports}

${header}

describe("${contractName} — AI Generated Scaffold", function () {
  ${deployFixture}

  it("deployment", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.be.properAddress;
  });

${fns.map(renderFunctionBlock).join("")}
});
`;
}

function slugFromSource(sourceName?: string): string | null {
  if (!sourceName) return null;
  // es. "contracts/tokens/v2/Token.sol" -> "tokens__v2__Token"
  const parts = sourceName.replace(/^contracts\//, "").replace(/\.sol$/,"").split("/");
  return parts.join("__");
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    artifactsRoot: DEFAULT_ARTIFACTS_ROOT,
    outDir: DEFAULT_OUTDIR,
    includePattern: null,
    withTypeChain: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith("--include=")) {
      result.includePattern = new RegExp(arg.split("=")[1]);
    } else if (arg.startsWith("--with-typechain=")) {
      result.withTypeChain = arg.split("=")[1] === "true";
    } else if (!arg.startsWith("--")) {
      if (i === 0) result.artifactsRoot = arg;
      else if (i === 1) result.outDir = arg;
    }
  }

  return result;
}

function findBestArtifact(artifacts: ArtifactCandidate[]): ArtifactCandidate {
  // Sort by deterministic criteria
  return artifacts.sort((a, b) => {
    // 1. Prefer artifacts with sourceName
    if (a.artifact.sourceName && !b.artifact.sourceName) return -1;
    if (!a.artifact.sourceName && b.artifact.sourceName) return 1;
    
    // 2. Prefer shorter source paths (main contracts vs libraries)
    if (a.artifact.sourceName && b.artifact.sourceName) {
      const aDepth = a.artifact.sourceName.split('/').length;
      const bDepth = b.artifact.sourceName.split('/').length;
      if (aDepth !== bDepth) return aDepth - bDepth;
    }
    
    // 3. Prefer alphabetically first by source name
    if (a.artifact.sourceName !== b.artifact.sourceName) {
      return (a.artifact.sourceName || "").localeCompare(b.artifact.sourceName || "");
    }
    
    // 4. Finally by file path
    return a.filePath.localeCompare(b.filePath);
  })[0];
}

function main() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  if (!fs.existsSync(config.artifactsRoot) || !fs.statSync(config.artifactsRoot).isDirectory()) {
    console.error("❌ Cannot find artifacts folder: " + config.artifactsRoot);
    process.exit(1);
  }
  
  fs.mkdirSync(config.outDir, { recursive: true });

  console.log(`🔍 Scanning artifacts in: ${config.artifactsRoot}`);
  console.log(`📁 Output directory: ${config.outDir}`);
  console.log(`🔗 TypeChain integration: ${config.withTypeChain ? 'enabled' : 'disabled'}`);
  if (config.includePattern) {
    console.log(`📋 Include pattern: ${config.includePattern.source}`);
  }

  let count = 0, skipped = 0, duplicates = 0;
  const contractArtifacts = new Map<string, ArtifactCandidate[]>();

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith(".dbg.json")) continue;
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.endsWith(".json")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const artifact = JSON.parse(content);
          
          if (artifact.abi && Array.isArray(artifact.abi) && artifact.contractName) {
            const name = artifact.contractName as string;
            
            // Skip contracts without deployable bytecode (interfaces, abstract contracts, libraries)
            if (!artifact.bytecode || artifact.bytecode === "0x" || artifact.bytecode.length <= 4) {
              skipped++;
              continue;
            }
            
            if (config.includePattern && !config.includePattern.test(name)) {
              skipped++;
              continue;
            }

            const candidate: ArtifactCandidate = {
              filePath: fullPath,
              artifact,
              relativePath: path.relative(config.artifactsRoot, fullPath)
            };

            if (!contractArtifacts.has(name)) {
              contractArtifacts.set(name, []);
            }
            contractArtifacts.get(name)!.push(candidate);
          }
        } catch (err) {
          console.error(`⚠️  Could not process ${fullPath}: ${err}`);
        }
      }
    }
  }

  scanDir(config.artifactsRoot);

  // Process each unique contract
  for (const [contractName, candidates] of contractArtifacts) {
    if (candidates.length > 1) {
      console.log(`🔄 Found ${candidates.length} artifacts for ${contractName}, selecting best...`);
      duplicates += candidates.length - 1;
    }

    const bestCandidate = findBestArtifact(candidates);
    const artifactInfo: ArtifactInfo = {
      contractName,
      sourceName: bestCandidate.artifact.sourceName || `Unknown.sol`,
      relativePath: bestCandidate.relativePath,
      abi: bestCandidate.artifact.abi as AbiItem[],
      metadata: bestCandidate.artifact.metadata
    };

    const generationConfig: GenerationConfig = {
      withTypeChain: config.withTypeChain
    };

    try {
      const content = renderFile(
        contractName, 
        bestCandidate.artifact.abi as AbiItem[], 
        generationConfig,
        artifactInfo,
        config.outDir
      );

      const fileName = bestCandidate.artifact.sourceName 
        ? `${slugFromSource(bestCandidate.artifact.sourceName)}__${contractName}.scaffold.spec.ts`
        : `${contractName}.scaffold.spec.ts`;
      
      const outPath = path.join(config.outDir, fileName);
      fs.writeFileSync(outPath, content, "utf8");
      
      console.log(`✅ Generated: ${fileName} (from ${artifactInfo.relativePath})`);
      count++;
    } catch (err) {
      console.error(`❌ Failed to generate test for ${contractName}: ${err}`);
    }
  }

  console.log(`\n� Generated ${count} test files in ${config.outDir}`);
  console.log(`📊 Skipped: ${skipped}, Duplicates resolved: ${duplicates}`);
  console.log(`💡 Next steps:`);
  console.log(`   - Review generated scaffolds in ${config.outDir}`);
  console.log(`   - Complete TODO_AI blocks`);
  console.log(`   - Run: npx tsc --noEmit (to check TypeScript)`);
  console.log(`   - Run: npm test (to execute tests)`);
}

if (require.main === module) {
  main();
}