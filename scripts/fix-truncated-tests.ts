#!/usr/bin/env npx ts-node

import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const TESTS_DIR = './prova2-eng';

console.log('🔍 Checking for truncated test files...');

const testFiles = readdirSync(TESTS_DIR).filter(f => f.endsWith('.spec.ts'));

for (const file of testFiles) {
    const filePath = join(TESTS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Check if file is truncated (ends with incomplete address)
    const isTruncated = content.includes('"0x0000000000000000000000000000000') && 
                       !content.trim().endsWith('});');
    
    // Check if file is just a fragment (no proper structure)
    const isFragment = !content.includes('describe(') || 
                      !content.includes('loadFixture') ||
                      content.split('\n').length < 20;
    
    if (isTruncated || isFragment) {
        console.log(`🗑️  Removing truncated/incomplete: ${file}`);
        unlinkSync(filePath);
    } else {
        console.log(`✅ Complete: ${file}`);
    }
}

console.log('🧹 Cleanup completed! Run the generator again for better results.');
