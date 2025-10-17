#!/usr/bin/env npx ts-node

import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

interface CliArgs {
  scaffold: string;
  out: string;
  model: string;
  template?: string;
  timeout?: number;
  prevErrors?: string;
  skipTest?: boolean;
  skipTsc?: boolean;
  maxOutputChars?: number;
  maxRetries?: number;
}

interface AttemptResult {
  success: boolean;
  code?: string;
  errors: string[];
  warnings: string[];
  attemptNumber: number;
  templateUsed: string;
}

interface ScaffoldHeader {
  contractName: string;
  artifactSource: string;
  artifactPath: string;
  artifactFqn: string;
  functions: string[];
  events: string[];
}

// Utility functions
async function readFileUtf8(filepath: string): Promise<string> {
  return fs.readFile(filepath, 'utf-8');
}

async function writeFileUtf8(filepath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, content, 'utf-8');
}

function parseCliArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {};
  
  for (const arg of args) {
    if (arg.startsWith('--scaffold=')) {
      parsed.scaffold = arg.split('=')[1];
    } else if (arg.startsWith('--out=')) {
      parsed.out = arg.split('=')[1];
    } else if (arg.startsWith('--model=')) {
      parsed.model = arg.split('=')[1];
    } else if (arg.startsWith('--template=')) {
      parsed.template = arg.split('=')[1];
    } else if (arg.startsWith('--timeout=')) {
      parsed.timeout = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--prev-errors=')) {
      parsed.prevErrors = arg.split('=')[1];
    } else if (arg.startsWith('--max-output-chars=')) {
      parsed.maxOutputChars = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-retries=')) {
      parsed.maxRetries = parseInt(arg.split('=')[1]);
    } else if (arg === '--skip-test') {
      parsed.skipTest = true;
    } else if (arg === '--skip-tsc') {
      parsed.skipTsc = true;
    }
  }
  
  // Required parameters
  if (!parsed.scaffold || !parsed.out || !parsed.model) {
    console.error('❌ Missing required parameters for run-all.ts');
    console.error('');
    console.error('USAGE:');
    console.error('  npx ts-node scripts/llm/run-all.ts \\');
    console.error('    --scaffold=tests/llm/<Name>.scaffold.spec.ts \\');
    console.error('    --out=tests/ai/gen/<Name>.spec.ts \\');
    console.error('    --model=qwen2.5-coder:3b \\');
    console.error('    [--template=prompts/templates/coverage-eng.txt] \\');
    console.error('    [--timeout=600] \\');
    console.error('    [--prev-errors=path/to/errors.txt] \\');
    console.error('    [--skip-test] \\');
    console.error('    [--skip-tsc] \\');
    console.error('    [--max-output-chars=120000] \\');
    console.error('    [--max-retries=3]');
    console.error('');
    console.error('DESCRIPTION:');
    console.error('  Process a single scaffold file through LLM to generate complete tests.');
    console.error('  Uses retry system with progressive templates and smart error feedback.');
    console.error('  Validates with TypeScript compilation and Hardhat tests unless skipped.');
    console.error('');
    console.error('EXIT CODES:');
    console.error('  0 - Success');
    console.error('  1 - Fatal error (missing files, network, etc.)');
    console.error('  2 - Policy violation or code extraction failure');
    console.error('  3 - TypeScript compilation failure');
    console.error('  4 - Hardhat test execution failure');
    process.exit(1);
  }
  
  return {
    scaffold: parsed.scaffold!,
    out: parsed.out!,
    model: parsed.model!,
    template: parsed.template || 'prompts/templates/coverage-eng.txt',
    timeout: parsed.timeout || 600,
    prevErrors: parsed.prevErrors,
    skipTest: parsed.skipTest || false,
    skipTsc: parsed.skipTsc || false,
    maxOutputChars: parsed.maxOutputChars || 120000,
    maxRetries: parsed.maxRetries || 3
  };
}

function extractHeader(scaffoldContent: string, scaffoldPath?: string): ScaffoldHeader {
  // Find the FIRST /** ... */ comment block after imports
  const headerMatch = scaffoldContent.match(/\/\*\*([\s\S]*?)\*\//);
  if (!headerMatch) {
    console.log('⚠️  No header comment block found, using fallbacks');
  }
  
  const comment = headerMatch ? headerMatch[1] : "";
  
  const readField = (label: string): string => {
    const rx = new RegExp(`${label}:\\s*(.+)`);
    const match = comment.match(rx);
    return match?.[1]?.trim() ?? "";
  };

  // CONTRACT_NAME: first from comment, then from describe("Name — ..."), then from filename
  let contractName = readField("CONTRACT_NAME");
  if (!contractName) {
    const describeMatch = scaffoldContent.match(/describe\s*\(\s*["'`]([^"'`]+?)\s*(?:—|-)\s*.*(?:LLM Scaffold|AI Generated Scaffold)/i);
    if (describeMatch) {
      contractName = describeMatch[1];
    }
  }
  if (!contractName && scaffoldPath) {
    const baseName = path.basename(scaffoldPath).replace(/\.scaffold\.spec\.ts$/i, "");
    const parts = baseName.split("__");
    contractName = parts[parts.length - 1] || baseName;
  }

  // FUNCTIONS
  let functions: string[] = [];
  const functionsMatch = comment.match(/FUNCTIONS:\s*\n([\s\S]*?)(?:\n\s*\n|\n\s*EVENTS:|$)/i);
  if (functionsMatch) {
    functions = functionsMatch[1]
      .split("\n")
      .map(l => l.replace(/^\s*\*\s?/, "").trim())
      .filter(l => l && l.toLowerCase() !== "(none)");
  }

  // EVENTS
  let events: string[] = [];
  const eventsMatch = comment.match(/EVENTS:\s*\n([\s\S]*?)(?:\n\s*\n|$)/i);
  if (eventsMatch) {
    events = eventsMatch[1]
      .split("\n")
      .map(l => l.replace(/^\s*\*\s?/, "").trim())
      .filter(l => l && l.toLowerCase() !== "(none)");
  }

  if (functions.length === 0) {
    console.log('⚠️  FUNCTIONS list empty; prompt may be weaker');
  }

  return {
    contractName: contractName || 'UnknownContract',
    artifactSource: readField("ARTIFACT_SOURCE"),
    artifactPath: readField("ARTIFACT_PATH"),
    artifactFqn: readField("ARTIFACT_FQN"),
    functions,
    events,
  };
}

function buildPrompt(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

function validateGeneratedCodePolicy(tsCode: string): string[] {
  const errs: string[] = [];
  
  // Banned patterns
  const bannedPatterns = [
    { pattern: /from\s+["']ethers["']/, message: 'BANNED: import from "ethers" package (use "hardhat" instead)' },
    { pattern: /new\s+ethers\.(JsonRpcProvider|Wallet|Contract)\b/, message: 'BANNED: external provider/wallet creation' },
    { pattern: /\bethers\.providers\b/, message: 'BANNED: ethers.providers usage' },
    { pattern: /\bethers\.utils\./, message: 'BANNED: ethers.utils.* (use ethers.parseEther, etc.)' },
    { pattern: /\b\d+n\b/, message: 'BANNED: BigInt literals (100n) - use ethers.parseEther("100") instead' },
    { pattern: /\.properAddress\b/, message: 'BANNED: .properAddress - use .to.be.a("string") instead' },
    { pattern: /\.revertedWithCustomError\b/, message: 'BANNED: .revertedWithCustomError - use .to.be.revertedWith("reason") instead' },
    { pattern: /0x0{40}/i, message: 'BANNED: hardcoded zero address (use ethers.ZeroAddress)' }
  ];
  
  for (const { pattern, message } of bannedPatterns) {
    if (pattern.test(tsCode)) {
      errs.push(message);
    }
  }
  
  // Check for skipped tests (ignore in comments)
  const skipInCode = tsCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  if (skipInCode.includes("this.skip(") || skipInCode.includes(".skip(")) {
    errs.push("Found skipped tests (this.skip / .skip). Must be removed.");
  }
  
  // Check for TODO_AI markers (ignore in comments)
  if (skipInCode.includes("TODO_AI")) {
    errs.push("Found TODO_AI markers. Must be fully replaced.");
  }
  
  // Check required imports
  if (!tsCode.includes('import { ethers } from "hardhat"')) {
    errs.push('Missing required import: import { ethers } from "hardhat"');
  }
  
  // Check loadFixture usage
  if (!/loadFixture\s*\(\s*deployFixture\s*\)/.test(tsCode)) {
    errs.push("Missing loadFixture(deployFixture) usage.");
  }
  
  // Check for common undefined variable patterns
  const undefinedVarPatterns = [
    { pattern: /\baddr1\b/, varName: 'addr1' },
    { pattern: /\baddr2\b/, varName: 'addr2' },
    { pattern: /\bowner\b/, varName: 'owner' },
    { pattern: /\bcontract\b/, varName: 'contract' }
  ];
  
  for (const { pattern, varName } of undefinedVarPatterns) {
    if (pattern.test(tsCode) && !new RegExp(`const\\s*\\{[^}]*\\b${varName}\\b[^}]*\\}\\s*=\\s*await\\s+loadFixture`).test(tsCode)) {
      errs.push(`Variable '${varName}' used but not destructured from loadFixture. Add: const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);`);
    }
  }
  
  // Check deployFixture returns all required variables
  if (/async\s+function\s+deployFixture/.test(tsCode) && !/return\s*\{[^}]*contract[^}]*owner[^}]*addr1[^}]*addr2[^}]*\}/.test(tsCode)) {
    errs.push("deployFixture must return { contract, owner, addr1, addr2 } with ALL signers");
  }
  
  return errs;
}

function basicCompletenessCheck(tsCode: string): string[] {
  const issues: string[] = [];
  
  const trimmed = tsCode.trim();
  if (!trimmed.endsWith("}") && !trimmed.endsWith("});")) {
    issues.push("File seems truncated (does not end with '}' or '});').");
  }
  
  // More flexible regex for it blocks
  const itBlocks = tsCode.match(/it\s*\(\s*["'`][^"'`]+["'`]\s*,\s*async.*?\{/gs) || [];
  if (itBlocks.length === 0) {
    issues.push("No async it() test blocks found.");
  }
  
  return issues;
}

function checkFunctionUsage(tsCode: string, allowedFunctions: string[]): string[] {
  const warnings: string[] = [];
  
  if (allowedFunctions.length === 0) return warnings;
  
  const allowed = new Set(allowedFunctions.map(l => l.split("(")[0]));
  // Add always-allowed methods
  allowed.add("getAddress");
  allowed.add("waitForDeployment"); 
  allowed.add("connect");
  
  // Find contract method calls: contract.<method>(
  const methodCalls = tsCode.match(/contract\.\w+\(/g) || [];
  for (const call of methodCalls) {
    const methodName = call.replace(/^contract\./, '').replace(/\($/, '');
    if (!allowed.has(methodName)) {
      warnings.push(`WARNING: Method '${methodName}' not in allowed functions list`);
    }
  }
  
  return warnings;
}

function extractCodeBlock(markdown: string): { code: string | null; hasCodeBlock: boolean } {
  // Try typescript first, then ts
  let match = markdown.match(/```typescript\s*\n([\s\S]*?)\n```/);
  if (!match) {
    match = markdown.match(/```ts\s*\n([\s\S]*?)\n```/);
  }
  
  if (match) {
    return {
      code: match[1].replace(/\r\n/g, '\n').trim(),
      hasCodeBlock: true
    };
  }
  
  // Fallback to entire response if no code block
  return {
    code: markdown.replace(/\r\n/g, '\n').trim(),
    hasCodeBlock: false
  };
}

function getTemplateForAttempt(attemptNumber: number, originalTemplate: string): string {
  // Use original template for attempt 1, then progression based on template type
  if (attemptNumber === 1) {
    return originalTemplate;
  }
  
  // Determine template family from original template
  let templates: string[];
  if (originalTemplate.includes('simple')) {
    // Simple template family
    templates = [
      'prompts/templates/coverage-eng-simple.txt',
      'prompts/templates/coverage-eng-simple-retry.txt', 
      'prompts/templates/coverage-eng-simple-final.txt'
    ];
  } else {
    // Original/detailed template family  
    templates = [
      'prompts/templates/coverage-eng.txt',
      'prompts/templates/coverage-eng-retry.txt',
      'prompts/templates/coverage-eng-final.txt'
    ];
  }
  
  const index = Math.min(attemptNumber - 1, templates.length - 1);
  return templates[index];
}

function getTimeoutForAttempt(attemptNumber: number, baseTimeout: number): number {
  // Progressive timeout increase: base, base*1.5, base*2
  const multipliers = [1, 1.5, 2];
  const index = Math.min(attemptNumber - 1, multipliers.length - 1);
  return Math.floor(baseTimeout * multipliers[index]);
}

// 🔧 SMART ERROR ACCUMULATION: Only pass relevant errors to next attempt
function formatPreviousErrors(errors: string[], warnings: string[], attemptNumber: number): string {
  if (errors.length === 0 && warnings.length === 0) return '';
  
  let result = 'PREVIOUS ATTEMPT ERRORS:\n';
  
  if (errors.length > 0) {
    result += 'CRITICAL ERRORS (must fix):\n';
    errors.forEach(err => result += `- ${err}\n`);
  }
  
  if (warnings.length > 0) {
    result += 'WARNINGS (should address):\n';
    warnings.forEach(warn => result += `- ${warn}\n`);
  }
  
  // Add specific guidance based on attempt number
  if (attemptNumber >= 3) {
    result += '\n🚨 FINAL ATTEMPT - Apply these specific fixes:\n';
    result += '- Replace ALL BigInt literals (100n) with ethers.parseEther("100")\n';
    result += '- Declare missing variables: const { owner, addr1, addr2, contract } = await loadFixture(deployFixture);\n';
    result += '- Use correct Chai syntax: .to.be.revertedWith("message") NOT .revertedWithCustomError\n';
    result += '- Fix import: import { ethers } from "hardhat"; (NOT from "ethers")\n';
  } else {
    result += '\nPlease fix ALL errors above. Pay special attention to:\n';
    result += '- Missing variable declarations (owner, addr1, addr2 should be from loadFixture)\n';
    result += '- Correct imports and TypeScript syntax\n';
    result += '- Proper Chai assertion syntax (.to.be.revertedWith, .to.emit, etc.)\n';
  }
  
  return result + '\n';
}

async function callOllama(model: string, prompt: string, timeoutSec: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏰ Request timed out after ${timeoutSec}s, aborting...`);
    controller.abort();
  }, timeoutSec * 1000);
  
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
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from Ollama API');
    }
    
    console.log(`📥 Received ${content.length} chars`);
    
    return content;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutSec}s. Try increasing --timeout or check if Ollama model "${model}" is running.`);
      }
      if (error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to Ollama at localhost:11434. Is Ollama running?\nOriginal: ${error.message}`);
      }
    }
    throw error;
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

async function attemptGeneration(
  args: CliArgs, 
  header: ScaffoldHeader, 
  scaffoldContent: string, 
  attemptNumber: number,
  previousErrors: string[] = [],
  previousWarnings: string[] = []
): Promise<AttemptResult> {
  
  const templatePath = getTemplateForAttempt(attemptNumber, args.template!);
  const timeout = getTimeoutForAttempt(attemptNumber, args.timeout!);
  
  console.log(`\n🔄 ATTEMPT ${attemptNumber}/${args.maxRetries}`);
  console.log(`📋 Template: ${path.basename(templatePath)}`);
  console.log(`⏱️  Timeout: ${timeout}s`);
  
  try {
    // 1. Load template
    const template = await readFileUtf8(templatePath);
    
    // 2. Format previous errors with smart accumulation
    const prevErrorsContent = formatPreviousErrors(previousErrors, previousWarnings, attemptNumber);
    
    // 3. Build prompt
    const prompt = buildPrompt(template, {
      CONTRACT_NAME: header.contractName,
      FUNCTION_LIST: header.functions.join('\n'),
      EVENT_LIST: header.events.join('\n'),
      SCAFFOLD_CONTENT: scaffoldContent,
      PREV_ERRORS: prevErrorsContent
    });
    
    // 4. Save prompt for debugging
    const promptPath = args.out.replace(/\.spec\.ts$/i, `.attempt${attemptNumber}.prompt.txt`);
    await writeFileUtf8(promptPath, prompt);
    console.log(`📝 Prompt saved to ${promptPath}`);
    
    // 5. Call LLM
    console.log(`📨 Calling model="${args.model}" with ${prompt.length} chars...`);
    const response = await callOllama(args.model, prompt, timeout);
    
    // 6. Apply max output chars limit
    const truncatedResponse = args.maxOutputChars && response.length > args.maxOutputChars 
      ? response.substring(0, args.maxOutputChars)
      : response;
    
    console.log(`📥 Received ${response.length} chars${response.length !== truncatedResponse.length ? ` (truncated to ${truncatedResponse.length})` : ''}`);
    
    // 7. Extract code block
    const { code: extractedCode, hasCodeBlock } = extractCodeBlock(truncatedResponse);
    console.log(`📥 Code extraction: ${hasCodeBlock ? 'success' : 'fallback'}`);
    
    if (!extractedCode) {
      const rawPath = args.out.replace(/\.ts$/, `.attempt${attemptNumber}.raw.md`);
      await writeFileUtf8(rawPath, truncatedResponse);
      return {
        success: false,
        errors: ['No code block found in response'],
        warnings: [],
        attemptNumber,
        templateUsed: templatePath
      };
    }
    
    // 8. Policy validation
    const policyErrors = validateGeneratedCodePolicy(extractedCode);
    const completenessErrors = basicCompletenessCheck(extractedCode);
    const functionWarnings = checkFunctionUsage(extractedCode, header.functions);
    
    const allErrors = [...policyErrors, ...completenessErrors];
    
    console.log(`📊 Validation: ${allErrors.length} errors, ${functionWarnings.length} warnings`);
    
    // Save raw response for debugging
    const rawPath = args.out.replace(/\.ts$/, `.attempt${attemptNumber}.raw.md`);
    await writeFileUtf8(rawPath, truncatedResponse);
    
    return {
      success: allErrors.length === 0,
      code: extractedCode,
      errors: allErrors,
      warnings: functionWarnings,
      attemptNumber,
      templateUsed: templatePath
    };
    
  } catch (error) {
    console.error(`❌ Attempt ${attemptNumber} failed:`, error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
      attemptNumber,
      templateUsed: templatePath
    };
  }
}

async function main() {
  const args = parseCliArgs();
  
  console.log(`🚀 Starting LLM generation with up to ${args.maxRetries} attempts`);
  console.log(`📁 Scaffold: ${args.scaffold}`);
  console.log(`📄 Output: ${args.out}`);
  console.log(`🤖 Model: ${args.model}`);
  
  try {
    // 1. Read scaffold
    const scaffoldContent = await readFileUtf8(args.scaffold);
    
    // 2. Parse header
    const header = extractHeader(scaffoldContent, args.scaffold);
    
    // 3. Smart retry loop with progressive error handling
    let lastResult: AttemptResult | null = null;
    let currentErrors: string[] = [];  // 🎯 Current level errors only
    let currentWarnings: string[] = [];
    const maxRetries = args.maxRetries!;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await attemptGeneration(
        args, 
        header, 
        scaffoldContent, 
        attempt,
        currentErrors,    // Only pass current-level errors
        currentWarnings
      );
      
      lastResult = result;
      
      if (result.success && result.code) {
        console.log(`✅ Attempt ${attempt} policy validation succeeded!`);
        
        // 🎯 RESET errors since we passed policy - now test compilation/runtime
        console.log(`🔄 Policy passed - now testing gates with fresh error context`);
        currentErrors = [];
        currentWarnings = [];
        
        // Write the code for validation gates
        await writeFileUtf8(args.out, result.code);
        console.log(`📝 Code written to ${args.out}`);
        
        // Test Gate G1 (TypeScript compilation)
        let tscPassed = true;
        if (!args.skipTsc) {
          console.log('🧪 TSC: Running TypeScript compilation...');
          const tscResult = await runCommand('npx', ['tsc', '--noEmit', '--skipLibCheck', args.out]);
          
          if (!tscResult.success) {
            console.log('🧪 TSC: FAIL - Will retry with TypeScript errors');
            tscPassed = false;
            // Only pass TypeScript errors, not old policy errors
            currentErrors = [
              'TypeScript compilation failed - fix these specific errors:',
              tscResult.stdout,
              tscResult.stderr
            ];
            
            const errorPath = args.out + `.attempt${attempt}.ts-errors.txt`;
            await writeFileUtf8(errorPath, `STDOUT:\n${tscResult.stdout}\n\nSTDERR:\n${tscResult.stderr}`);
          } else {
            console.log('🧪 TSC: PASS');
          }
        }
        
        // Test Gate G2 (Hardhat test)  
        let testPassed = true;
        if (tscPassed && !args.skipTest) {
          console.log('🧪 TEST: Running Hardhat test...');
          const testResult = await runCommand('npx', ['hardhat', 'test', args.out]);
          
          if (!testResult.success) {
            console.log('🧪 TEST: FAIL - Will retry with test errors');
            testPassed = false;
            currentErrors = [
              'Hardhat test execution failed - fix these runtime errors:',
              testResult.stderr,
              testResult.stdout.slice(0, 1000)
            ];
            
            const errorPath = args.out + `.attempt${attempt}.test-errors.txt`;
            const truncatedOutput = (testResult.stdout + '\n' + testResult.stderr).slice(0, 3000);
            await writeFileUtf8(errorPath, truncatedOutput);
          } else {
            console.log('🧪 TEST: PASS');
          }
        }
        
        // Complete success
        if (tscPassed && testPassed) {
          console.log(`🎉 Attempt ${attempt} COMPLETE SUCCESS!`);
          break;
        }
        
        // Continue retry if we have more attempts
        if (attempt >= maxRetries) {
          console.error(`💀 All ${maxRetries} attempts exhausted.`);
          if (!tscPassed) {
            console.log(`📝 TypeScript errors saved to ${args.out}.attempt${attempt}.ts-errors.txt`);
            process.exit(3);
          } else if (!testPassed) {
            console.log(`📝 Test errors saved to ${args.out}.attempt${attempt}.test-errors.txt`);
            process.exit(4);
          }
        }
        
      } else {
        console.log(`❌ Attempt ${attempt} failed policy validation`);
        
        // Accumulate only policy errors for next policy attempt
        currentErrors = result.errors;
        currentWarnings = result.warnings;
        
        // Save errors for this attempt
        const errorsPath = args.out + `.attempt${attempt}.errors.txt`;
        await writeFileUtf8(errorsPath, [...result.errors, ...result.warnings].join('\n'));
        
        if (attempt >= maxRetries) {
          console.error(`💀 All ${maxRetries} attempts failed policy validation`);
          console.log('📋 Files created for debugging:');
          for (let i = 1; i <= maxRetries; i++) {
            console.log(`   - ${args.out.replace(/\.ts$/, `.attempt${i}.prompt.txt`)} (prompt)`);
            console.log(`   - ${args.out.replace(/\.ts$/, `.attempt${i}.raw.md`)} (raw response)`);
            console.log(`   - ${args.out + `.attempt${i}.errors.txt`} (errors)`);
          }
          process.exit(2);
        } else {
          console.log(`🔄 Retrying with policy error feedback...`);
        }
      }
    }
    
    // Final success
    const stats = await fs.stat(args.out);
    console.log(`\n🎉 SUCCESS! Generated ${stats.size} bytes at ${args.out}`);
    console.log(`📋 Files created:`);
    console.log(`   - ${args.out} (final test file)`);
    
    // Show all attempt files
    for (let i = 1; i <= (lastResult?.attemptNumber || 1); i++) {
      console.log(`   - ${args.out.replace(/\.ts$/, `.attempt${i}.prompt.txt`)} (attempt ${i} prompt)`);
      console.log(`   - ${args.out.replace(/\.ts$/, `.attempt${i}.raw.md`)} (attempt ${i} response)`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ FATAL ERROR (exit code 1):');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.message.includes('timeout') || error.message.includes('Ollama')) {
        console.error('\n💡 TROUBLESHOOTING:');
        console.error('   - Check if Ollama is running: curl http://localhost:11434/api/tags');
        console.error('   - Verify model exists: ollama list');
        console.error('   - Try increasing --timeout (current: ' + args.timeout + 's)');
        console.error('   - For large prompts, try --max-output-chars to reduce complexity');
      }
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted by user');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
