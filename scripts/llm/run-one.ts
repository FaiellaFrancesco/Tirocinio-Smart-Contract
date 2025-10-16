#!/usr/bin/env npx ts-node

import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

interface ScaffoldHeader {
  contractName: string;
  artifactSource: string;
  artifactPath: string;
  artifactFqn: string;
  functions: string[];
  events: string[];
}

interface CliArgs {
  scaffold: string;
  out: string;
  model: string;
  template?: string;
  timeout?: number;
  prevErrors?: string;
  skipTest: boolean;
  skipTsc: boolean;
  maxOutputChars?: number;
}

// Utility functions
async function readFileUtf8(filepath: string): Promise<string> {
  return fs.readFile(filepath, 'utf-8');
}

async function writeFileUtf8(filepath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, content, 'utf-8');
}

function extractHeader(scaffold: string): ScaffoldHeader {
  // Parse header from /** ... */ comment block
  const headerMatch = scaffold.match(/\/\*\*([\s\S]*?)\*\//);
  if (!headerMatch) {
    throw new Error('No header comment block found');
  }
  
  const header = headerMatch[1];
  
  // Extract contract name from describe line as fallback
  const describeMatch = scaffold.match(/describe\s*\(\s*["'`]([^"'`]+)\s*—/);
  let contractName = '';
  if (describeMatch) {
    contractName = describeMatch[1];
  }
  
  // Extract metadata
  const artifactSourceMatch = header.match(/ARTIFACT_SOURCE:\s*(.+)/);
  const artifactPathMatch = header.match(/ARTIFACT_PATH:\s*(.+)/);
  const artifactFqnMatch = header.match(/ARTIFACT_FQN:\s*(.+)/);
  
  // Extract functions section
  const functionsMatch = header.match(/FUNCTIONS:\s*\n([\s\S]*?)(?:\n\s*\n|\n\s*EVENTS:)/);
  const functions = functionsMatch 
    ? functionsMatch[1].split('\n').map(l => l.trim().replace(/^\*\s*/, '')).filter(l => l && l !== '(none)')
    : [];
  
  // Extract events section
  const eventsMatch = header.match(/EVENTS:\s*\n([\s\S]*?)(?:\n\s*\n|\n\s*LLM NOTES)/);
  const events = eventsMatch 
    ? eventsMatch[1].split('\n').map(l => l.trim().replace(/^\*\s*/, '')).filter(l => l && l !== '(none)')
    : [];
  
  return {
    contractName,
    artifactSource: artifactSourceMatch?.[1]?.trim() || '',
    artifactPath: artifactPathMatch?.[1]?.trim() || '',
    artifactFqn: artifactFqnMatch?.[1]?.trim() || '',
    functions,
    events
  };
}

function buildPrompt(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

function extractCodeBlock(markdown: string): string | null {
  // Try typescript first, then ts, then fallback to full content
  let match = markdown.match(/```typescript\s*\n([\s\S]*?)\n```/);
  if (!match) {
    match = markdown.match(/```ts\s*\n([\s\S]*?)\n```/);
  }
  
  if (match) {
    return match[1].replace(/\r\n/g, '\n').trim();
  }
  
  // Fallback to entire response if no code block
  return markdown.replace(/\r\n/g, '\n').trim();
}

async function callOllama(model: string, prompt: string, timeoutSec: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000);
  
  try {
    console.log(`📨 Sending → model="${model}" timeout=${timeoutSec}s prompt=${prompt.length} chars`);
    
    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,
        max_tokens: 8192,
        stream: false,
        messages: [
          {
            role: 'system',
            content: 'You are STRICTLY a Hardhat local unit-test generator (Mocha/Chai + Ethers v6). NEVER import from ethers package in tests; only import { ethers } from "hardhat". NEVER create providers or wallets (no RPC URLs). Remove all this.skip(); fill all // TODO_AI. Use only functions listed in FUNCTIONS; do not invent function names. For withdraw/claim-like functions: in the same test first fund the contract, then withdraw, assert event and balances. Each test runs in fresh fixture (loadFixture), do not rely on state from other tests.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log(`📥 Received ${content.length} chars`);
    
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runCommand(command: string, args: string[], options: { timeoutSec?: number } = {}): Promise<{ stdout: string, stderr: string, success: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { 
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true 
    });
    
    let stdout = '';
    let stderr = '';
    let killed = false;
    
    const timeout = options.timeoutSec ? setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, options.timeoutSec * 1000) : null;
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: !killed && code === 0
      });
    });
  });
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = {
    skipTest: false,
    skipTsc: false
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--scaffold=')) {
      args.scaffold = arg.split('=')[1];
    } else if (arg.startsWith('--out=')) {
      args.out = arg.split('=')[1];
    } else if (arg.startsWith('--model=')) {
      args.model = arg.split('=')[1];
    } else if (arg.startsWith('--template=')) {
      args.template = arg.split('=')[1];
    } else if (arg.startsWith('--timeout=')) {
      args.timeout = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--prev-errors=')) {
      args.prevErrors = arg.split('=')[1];
    } else if (arg.startsWith('--max-output-chars=')) {
      args.maxOutputChars = parseInt(arg.split('=')[1]);
    } else if (arg === '--skip-test') {
      args.skipTest = true;
    } else if (arg === '--skip-tsc') {
      args.skipTsc = true;
    }
  }
  
  if (!args.scaffold || !args.out || !args.model) {
    throw new Error('Required: --scaffold, --out, --model');
  }
  
  return {
    scaffold: args.scaffold,
    out: args.out,
    model: args.model,
    template: args.template || 'prompts/templates/coverage-eng.txt',
    timeout: args.timeout || 600,
    prevErrors: args.prevErrors,
    skipTest: args.skipTest || false,
    skipTsc: args.skipTsc || false,
    maxOutputChars: args.maxOutputChars || 120000
  };
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    
    console.log(`🚀 Generating test from scaffold: ${args.scaffold}`);
    console.log(`📤 Output: ${args.out}`);
    console.log(`🤖 Model: ${args.model}`);
    
    // 1. Read scaffold
    const scaffoldContent = await readFileUtf8(args.scaffold);
    
    // 2. Parse header
    const header = extractHeader(scaffoldContent);
    console.log(`📋 Contract: ${header.contractName}`);
    console.log(`📋 Functions: ${header.functions.length}`);
    console.log(`📋 Events: ${header.events.length}`);
    
    // 3. Load template
    const template = await readFileUtf8(args.template!);
    
    // 4. Handle previous errors if provided
    let prevErrors = '';
    if (args.prevErrors) {
      try {
        const errorContent = await readFileUtf8(args.prevErrors);
        // Truncate to first 80-120 lines
        const lines = errorContent.split('\n').slice(0, 100);
        prevErrors = lines.join('\n');
      } catch (e) {
        console.warn(`⚠️  Could not read prev-errors file: ${args.prevErrors}`);
      }
    }
    
    // 5. Build prompt
    const prompt = buildPrompt(template, {
      CONTRACT_NAME: header.contractName,
      FUNCTION_LIST: header.functions.join('\n'),
      EVENT_LIST: header.events.join('\n'),
      SCAFFOLD_CONTENT: scaffoldContent,
      PREV_ERRORS: prevErrors
    });
    
    // 6. Call LLM
    const response = await callOllama(args.model, prompt, args.timeout!);
    
    // 7. Extract code
    const code = extractCodeBlock(response);
    if (!code) {
      console.error('❌ No code block found in response');
      process.exit(2);
    }
    
    // Truncate if needed
    let finalCode = code;
    if (args.maxOutputChars && code.length > args.maxOutputChars) {
      finalCode = code.substring(0, args.maxOutputChars);
      console.warn(`⚠️  Code truncated to ${args.maxOutputChars} chars`);
    }
    
    // Basic validation
    if (!finalCode.includes('import { ethers } from "hardhat"') || !finalCode.includes('}')) {
      console.error('❌ Generated code missing required imports or malformed');
      // Save raw output for debugging
      const rawPath = args.out.replace(/\.ts$/, '.raw.md');
      await writeFileUtf8(rawPath, response);
      console.log(`🔍 Raw response saved to: ${rawPath}`);
      process.exit(2);
    }
    
    // 8. Write output
    await writeFileUtf8(args.out, finalCode);
    console.log(`📝 Wrote ${args.out} (${finalCode.length} chars)`);
    
    // 9. Gate G1 (TypeScript)
    if (!args.skipTsc) {
      console.log('🧪 TSC: Running TypeScript check...');
      const tscResult = await runCommand('npx', ['tsc', '--noEmit', '--skipLibCheck', args.out], { timeoutSec: 120 });
      
      if (!tscResult.success) {
        const errorPath = args.out + '.ts-errors.txt';
        await writeFileUtf8(errorPath, tscResult.stderr + '\n' + tscResult.stdout);
        console.log(`🧪 TSC: FAIL (${errorPath})`);
        process.exit(3);
      } else {
        console.log('🧪 TSC: PASS');
      }
    }
    
    // 10. Gate G2 (Hardhat test)
    if (!args.skipTest) {
      console.log('🧪 TEST: Running Hardhat test...');
      const testResult = await runCommand('npx', ['hardhat', 'test', args.out], { timeoutSec: 300 });
      
      if (!testResult.success) {
        const errorPath = args.out + '.test-errors.txt';
        // Truncate output to 2-3k chars for logs
        const truncatedOutput = (testResult.stdout + '\n' + testResult.stderr).substring(0, 3000);
        await writeFileUtf8(errorPath, truncatedOutput);
        console.log(`🧪 TEST: FAIL (${errorPath})`);
        process.exit(4);
      } else {
        console.log('🧪 TEST: PASS');
      }
    }
    
    // 11. Success
    console.log(`✅ Success! Generated and validated ${args.out}`);
    const stats = await fs.stat(args.out);
    console.log(`📊 File size: ${stats.size} bytes`);
    
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}