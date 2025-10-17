/**
 * Batch version of scaffold generator to avoid token limit issues
 * Usage: npx ts-node scripts/scaffold-batch.ts [batch-size] [start-offset]
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

async function main() {
  const batchSize = parseInt(process.argv[2]) || 50;
  const startOffset = parseInt(process.argv[3]) || 0;
  
  console.log(`🚀 Running scaffold generation in batches of ${batchSize}, starting from ${startOffset}`);
  
  // Get total number of existing scaffolds
  const existingCount = await getScaffoldCount();
  console.log(`📊 Currently have ${existingCount} scaffolds`);
  
  // Create batch patterns based on hex address ranges
  const hexRanges = [
    '0x000000', '0x000001', '0x000002', '0x000003', '0x000004', 
    '0x000005', '0x000006', '0x000007', '0x000008', '0x000009',
    '0x00000a', '0x00000b', '0x00000c', '0x00000d', '0x00000e', '0x00000f',
    '0x000010', '0x000020', '0x000030', '0x000040', '0x000050',
    '0x000060', '0x000070', '0x000080', '0x000090', '0x0000a0',
    '0x0000b0', '0x0000c0', '0x0000d0', '0x0000e0', '0x0000f0',
    '0x000100', '0x001000', '0x002000', '0x003000', '0x004000',
    '0x005000', '0x006000', '0x007000', '0x008000', '0x009000',
    '0x00a000', '0x00b000', '0x00c000', '0x00d000', '0x00e000',
    'Mock', 'ERC', 'Token', 'USDT', 'USDC', 'WETH', 'DAI'
  ];
  
  let processedBatches = 0;
  
  for (let i = startOffset; i < hexRanges.length; i++) {
    const pattern = hexRanges[i];
    console.log(`\n🔄 Processing batch ${i + 1}/${hexRanges.length}: pattern "${pattern}"`);
    
    try {
      const { stdout, stderr } = await execAsync(
        `npx ts-node scripts/scaffold-from-abi.ts --include="${pattern}"`,
        { maxBuffer: 1024 * 1024 } // 1MB buffer
      );
      
      if (stdout) {
        const lines = stdout.split('\n').filter(line => line.includes('Generated:'));
        console.log(`✅ Generated ${lines.length} scaffolds for pattern "${pattern}"`);
      }
      
      if (stderr && stderr.trim()) {
        console.warn(`⚠️ Warnings for pattern "${pattern}":`, stderr.substring(0, 200));
      }
      
      processedBatches++;
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing pattern "${pattern}":`, error instanceof Error ? error.message.substring(0, 200) : String(error));
      continue;
    }
  }
  
  // Final count
  const finalCount = await getScaffoldCount();
  console.log(`\n📈 Final scaffold count: ${finalCount} (was ${existingCount})`);
  console.log(`🎯 Processed ${processedBatches} batches successfully`);
}

async function getScaffoldCount(): Promise<number> {
  try {
    const { stdout } = await execAsync('find tests/llm/ -name "*.scaffold.spec.ts" | wc -l');
    return parseInt(stdout.trim());
  } catch {
    return 0;
  }
}

if (require.main === module) {
  main().catch(console.error);
}
