#!/usr/bin/env ts-node

/**
 * LLM runner (singolo file) — OpenAI-compatible.
 * - Legge un .prompt.txt
 * - Chiama /v1/chat/completions (Ollama/LM Studio/vLLM)
 * - Estrae il blocco ```ts (anche se non chiuso) o, in fallback, il codice "nudo"
 * - Scrive .spec.ts; salva sempre anche il .raw.md per debug
 *
 * Uso:
 *   npx ts-node scripts/llm/run-one.ts \
 *     --input=prompts_out/coverage/Foo.coverage.prompt.txt \
 *     --out=test/ai/coverage/Foo.coverage.ollama.spec.ts \
 *     --model=qwen2.5-coder:3b \
 *     --retries=2 --timeout=90
 */

import * as fs from "fs";
import * as path from "path";

// Types
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  stop?: string[];
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Polyfill per fetch se non disponibile (Node.js < 18)
if (typeof fetch === 'undefined') {
  try {
    // @ts-ignore
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error("❌ fetch non disponibile. Installa node-fetch: npm install node-fetch");
    process.exit(1);
  }
}

// ---------- Config ----------
const BASE_URL = process.env.OPENAI_BASE_URL || "http://localhost:11434/v1";
const API_KEY  = process.env.OPENAI_API_KEY  || "ollama";

// ---------- CLI ----------
const args = process.argv.slice(2);
function getArg(name: string, def?: string) {
  const p = `--${name}=`;
  const hit = args.find(a => a.startsWith(p));
  return hit ? hit.slice(p.length) : def;
}
function getNum(name: string, def: number) {
  const v = getArg(name);
  return v ? Number(v) : def;
}

const inputPath = getArg("input");
const outPath   = getArg("out");
const modelArg  = getArg("model", "qwen2.5-coder:3b");
const retries   = getNum("retries", 2);
const timeoutS  = getNum("timeout", 90);

if (!inputPath || !outPath) {
  console.error("Uso: --input=<prompt.txt> --out=<output.spec.ts> [--model=qwen2.5-coder:3b] [--retries=2] [--timeout=90]");
  process.exit(1);
}

// Type assertions dopo la validazione
const validInputPath = inputPath as string;
const validOutPath = outPath as string;
const model = modelArg || "qwen2.5-coder:3b"; // fallback garantito

// ---------- FS helpers ----------
function readFile(p: string) { return fs.readFileSync(p, "utf-8"); }
function writeFile(p: string, s: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf-8");
}

// ---------- Estrazione codice ----------
function extractTsBlock(s: string): { code: string | null, raw: string } {
  // 1) blocco ```ts ... ```
  let m = /```ts\s*([\s\S]*?)```/m.exec(s);
  if (m) return { code: m[1].trim(), raw: s };

  // 2) blocco ```typescript ... ```
  m = /```typescript\s*([\s\S]*?)```/m.exec(s);
  if (m) return { code: m[1].trim(), raw: s };

  // 3) blocco ``` ... ``` generico
  m = /```\s*([\s\S]*?)```/m.exec(s);
  if (m) {
    const content = m[1].trim();
    // Verifica se sembra TypeScript
    if (content.includes('import') && (content.includes('chai') || content.includes('hardhat') || content.includes('ethers'))) {
      return { code: content, raw: s };
    }
  }

  // 4) blocco ```ts NON CHIUSO → prendi tutto dopo l'apertura
  let start = s.indexOf("```ts");
  if (start >= 0) {
    let rest = s.slice(start + 5);      // toglie ```ts
    return { code: rest.trim(), raw: s };
  }

  // 5) blocco ```typescript NON CHIUSO
  start = s.indexOf("```typescript");
  if (start >= 0) {
    let rest = s.slice(start + 13);     // toglie ```typescript
    return { code: rest.trim(), raw: s };
  }

  // 6) Fallback: se sembra un file di test TS, prendi tutto
  if (
    /\bimport\b.+from\s+["']chai["']/.test(s) ||
    /\bimport\b.+from\s+["']hardhat["']/.test(s) ||
    /\bdescribe\s*\(/.test(s) ||
    /\bexpect\s*\(/.test(s)
  ) {
    return { code: s.trim(), raw: s };
  }

  // 7) Cerca pattern TypeScript specifici nel testo
  if (/import.*ethers.*hardhat/s.test(s) || /describe\s*\(\s*["']/s.test(s)) {
    // Prova a estrarre solo la parte che sembra codice TypeScript
    const lines = s.split('\n');
    let codeStart = -1;
    let codeEnd = lines.length;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import') && (lines[i].includes('chai') || lines[i].includes('hardhat'))) {
        codeStart = i;
        break;
      }
    }
    
    if (codeStart >= 0) {
      const code = lines.slice(codeStart, codeEnd).join('\n').trim();
      return { code, raw: s };
    }
  }

  return { code: null, raw: s };
}

// ---------- HTTP ----------
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function callChatCompletions(model: string, prompt: string, attempt: number, maxAttempts: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Timeout")), timeoutS * 1000);

  const body: ChatCompletionRequest = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a TypeScript code generator for Hardhat tests. IMPORTANT: Your response must start with ```ts and end with ```. Generate ONLY TypeScript code for Hardhat/Mocha/Chai tests. Use imports like 'import { expect } from \"chai\"' and 'import { ethers } from \"hardhat\"'. Do NOT write any explanatory text, comments outside code, or other languages. Output format: ```ts\n[YOUR TYPESCRIPT CODE HERE]\n```"
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 2048
  };

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }

    const json = await res.json() as ChatCompletionResponse;
    return String(json?.choices?.[0]?.message?.content ?? "");
  } catch (err: any) {
    // retry su errori di rete / 5xx
    if (attempt < maxAttempts) {
      const backoff = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s...
      console.warn(`⚠️ Tentativo ${attempt + 1}/${maxAttempts} fallito (${err?.message || err}). Retry tra ${backoff}ms...`);
      await sleep(backoff);
      return callChatCompletions(model, prompt, attempt + 1, maxAttempts);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Main ----------
(async () => {
  const prompt = readFile(validInputPath);
  console.log(`📨 Invio → ${BASE_URL}  model="${model}"  file="${path.basename(validInputPath)}"`);

  const started = Date.now();
  const content = await callChatCompletions(model, prompt, 0, retries);
  const took = ((Date.now() - started) / 1000).toFixed(1);

  // Salva sempre il RAW per debug/audit
  const rawOut = validOutPath.replace(/\.spec\.ts$/i, ".raw.md");
  writeFile(rawOut, content);

  // Estrai codice
  const { code } = extractTsBlock(content);

  if (code) {
    // normalizza fine-riga e newline finale
    const normalized = code.replace(/\r\n/g, "\n").trimEnd() + "\n";
    writeFile(validOutPath, normalized);
    console.log(`✅ Generato: ${validOutPath}  (in ${took}s)`);
    console.log(`📝 RAW salvato per debug: ${rawOut}`);
  } else {
    console.warn(`⚠️ Nessun blocco TS estratto. Controlla il RAW: ${rawOut}`);
  }
})().catch(err => {
  console.error("❌ Errore:", err?.message || err);
  process.exit(1);
});