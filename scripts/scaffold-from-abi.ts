#!/usr/bin/env ts-node

/**
 * Genera uno scaffold di test (Mocha/Chai per Hardhat) a partire da un artifact Hardhat
 * o da un file che contiene direttamente l'ABI.
 *
 * USO:
 *   npx ts-node scripts/scaffold-from-abi.ts <artifactOrAbiPath> <ContractName> [outDir]
 *
 * ESEMPI:
 *   npx ts-node scripts/scaffold-from-abi.ts artifacts/contracts/MyERC20.sol/MyERC20.json MyERC20
 *   npx ts-node scripts/scaffold-from-abi.ts abi/MyERC20.abi.json MyERC20 test/llm
 *
 * OUTPUT:
 *   - Di default: test/llm/<ContractName>.scaffold.spec.ts
 *   - Se passi [outDir]: <outDir>/<ContractName>.scaffold.spec.ts
 */

import * as fs from "fs";
import * as path from "path";

type AbiItem = {
  type: string;
  name?: string;
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
  inputs?: { name: string; type: string; internalType?: string; components?: any[] }[];
  outputs?: any[];
};

function readAbi(inputPath: string): AbiItem[] {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const json = JSON.parse(raw);
  // Se è un artifact Hardhat, l'ABI sta in json.abi; se è un file ABI puro, json è un array
  const abi: AbiItem[] = Array.isArray(json) ? json : json.abi;
  if (!abi) {
    throw new Error(`Nel file '${inputPath}' non trovo il campo 'abi'.`);
  }
  return abi;
}

function tsDefaultFor(solType: string): string {
  // Valori placeholder ragionevoli per compilare e guidare l'LLM (TODO_AI da rivedere)
  if (solType.endsWith("[]")) return "[] /* TODO_AI */";
  if (solType.startsWith("uint") || solType.startsWith("int")) return "1n /* TODO_AI */";
  if (solType === "bool") return "true /* TODO_AI */";
  if (solType === "address") return "addr1.address /* TODO_AI */";
  if (solType.startsWith("bytes32")) return `"0x${"00".repeat(64)}" /* TODO_AI */`;
  if (solType.startsWith("bytes")) return `"0x" /* TODO_AI */`;
  if (solType === "string") return `"example" /* TODO_AI */`;
  if (solType.startsWith("tuple")) return "{ /* TODO_AI tuple */ }";
  return "/* TODO_AI value */";
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
    : `// TODO_AI: verifica stato/eventi dopo la tx (bilanci, storage, ecc.)`;

  return `
  describe("${sig}", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      ${isView ? `// chiamata di sola lettura` : `// transazione che modifica lo stato`}
      const result = ${callLine};
      ${expectLine}
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      await expect(
        contract.${name}(${(fn.inputs || []).map(_ => "/* TODO_AI bad */").join(", ")})
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // TODO_AI: prova 0, max, address(0), limiti di ruolo, overflow safe, ecc.
    });

    // TODO_AI: se la funzione emette eventi, usa:
    // await expect(tx).to.emit(contract, "Evento").withArgs(/* ... */);
  });
`;
}

function renderFile(contractName: string, abi: AbiItem[]): string {
  const fns = abi.filter(a => a.type === "function" && a.name);
  const events = abi.filter(a => a.type === "event").map(e => e.name).join(", ") || "—";

  // Costruttore (se presente)
  const ctor = abi.find(a => a.type === "constructor");
  const ctorArgs = (ctor?.inputs || []).map(i => tsDefaultFor(i.type)).join(", ");

  return `import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per ${contractName}.
 * I blocchi marcati con // TODO_AI vanno completati dall'LLM (asserzioni, input, revert, eventi).
 * Non modificare imports/describe di base: mantieni questo formato per coerenza.
 */

describe("${contractName} — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("${contractName}");
    // TODO_AI: completa i parametri di deploy se il costruttore ne ha
    const contract = await Factory.deploy(${ctorArgs});
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi presenti nell'ABI: ${events}

  ${fns.map(renderFunctionBlock).join("\n")}
});
`;
}

function main() {
  const [,, inputPath, contractName, outDirArg] = process.argv;

  if (!inputPath || !contractName) {
    console.error("Uso: ts-node scripts/scaffold-from-abi.ts <artifactOrAbiPath> <ContractName> [outDir]");
    process.exit(1);
  }

  const outDir = outDirArg || "test/llm";
  const abi = readAbi(inputPath);
  const content = renderFile(contractName, abi);

  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${contractName}.scaffold.spec.ts`);
  fs.writeFileSync(outPath, content, "utf-8");

  console.log(`✅ Creato scaffold: ${outPath}`);
}

main();