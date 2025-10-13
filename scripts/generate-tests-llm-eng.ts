#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const SCAFFOLDS_DIR = './scaffolds/eng1';
const PROMPTS_DIR = './prompts_out_eng';
const TESTS_DIR = './tests/llm-eng';
const TEMPLATE_FILE = './prompts/templates/coverage-eng.txt';

// Ensure output directories exist
if (!existsSync(PROMPTS_DIR)) {
    mkdirSync(PROMPTS_DIR, { recursive: true });
}
if (!existsSync(TESTS_DIR)) {
    mkdirSync(TESTS_DIR, { recursive: true });
}

// Load the English template
const template = readFileSync(TEMPLATE_FILE, 'utf-8');

console.log('🚀 Starting English LLM test generation...');

// Get all scaffold files
const scaffolds = readdirSync(SCAFFOLDS_DIR)
    .filter(file => file.endsWith('.scaffold.spec.ts'))
    .slice(0, 5); // Start with just 5 files for testing

console.log(`📁 Found ${scaffolds.length} scaffolds to process`);

const LLM_MODELS = ['qwen2.5-coder:3b', 'codegemma:2b'];
let currentModelIndex = 0;

for (const scaffoldFile of scaffolds) {
    try {
        console.log(`\n📄 Processing: ${scaffoldFile}`);
        
        // Read the scaffold content
        const scaffoldPath = join(SCAFFOLDS_DIR, scaffoldFile);
        const scaffoldContent = readFileSync(scaffoldPath, 'utf-8');
        
        // Generate prompt by replacing the template placeholder
        const prompt = template.replace('{{SCAFFOLD_CONTENT}}', scaffoldContent);
        
        // Save the prompt
        const promptFile = scaffoldFile.replace('.scaffold.spec.ts', '.prompt.txt');
        const promptPath = join(PROMPTS_DIR, promptFile);
        writeFileSync(promptPath, prompt);
        console.log(`💾 Saved prompt: ${promptFile}`);
        
        // Use alternating LLM models
        const model = LLM_MODELS[currentModelIndex];
        currentModelIndex = (currentModelIndex + 1) % LLM_MODELS.length;
        
        console.log(`🤖 Generating test with ${model}...`);
        
        // Call Ollama to generate the test
        try {
            const ollamaCommand = `curl -s -X POST http://localhost:11434/api/generate ` +
                `-H "Content-Type: application/json" ` +
                `-d '{"model": "${model}", "prompt": ${JSON.stringify(prompt)}, "stream": false}'`;
            
            const response = execSync(ollamaCommand, { encoding: 'utf-8' });
            const result = JSON.parse(response);
            
            if (result.response) {
                // Extract the TypeScript code from the response
                let testContent = result.response;
                
                // Try to extract code from ```ts blocks
                const codeBlockMatch = testContent.match(/```ts\n([\s\S]*?)\n```/);
                if (codeBlockMatch) {
                    testContent = codeBlockMatch[1];
                } else {
                    // Try to extract from ```typescript blocks
                    const tsBlockMatch = testContent.match(/```typescript\n([\s\S]*?)\n```/);
                    if (tsBlockMatch) {
                        testContent = tsBlockMatch[1];
                    } else {
                        // Try to extract from ``` blocks
                        const genericBlockMatch = testContent.match(/```\n([\s\S]*?)\n```/);
                        if (genericBlockMatch) {
                            testContent = genericBlockMatch[1];
                        }
                    }
                }
                
                // Save the generated test
                const testFile = scaffoldFile.replace('.scaffold.spec.ts', '.spec.ts');
                const testPath = join(TESTS_DIR, testFile);
                writeFileSync(testPath, testContent);
                console.log(`✅ Generated test: ${testFile} (${model})`);
                
                // Quick syntax check
                try {
                    execSync(`npx tsc --noEmit --skipLibCheck "${testPath}"`, { stdio: 'pipe' });
                    console.log(`✅ Syntax check passed for ${testFile}`);
                } catch (error) {
                    console.log(`⚠️  Syntax issues in ${testFile}, but saved anyway`);
                }
                
            } else {
                console.log(`❌ No response from ${model} for ${scaffoldFile}`);
            }
            
        } catch (error) {
            console.log(`❌ LLM generation failed for ${scaffoldFile}: ${error.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
    } catch (error) {
        console.log(`❌ Error processing ${scaffoldFile}: ${error.message}`);
    }
}

console.log('\n🎉 English LLM test generation complete!');
console.log(`📊 Check results in:`);
console.log(`   Prompts: ${PROMPTS_DIR}`);
console.log(`   Tests: ${TESTS_DIR}`);
