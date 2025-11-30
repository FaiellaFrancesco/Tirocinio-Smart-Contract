#!/usr/bin/env ts-node
/**
 * setup-sumo.ts (PATCHED VERSION)
 * * Oltre a copiare i file, questo script ora "PATCHA" i test suite.
 * Sostituisce i vecchi percorsi (es. "dataset/small/...") con il nuovo percorso
 * del laboratorio ("sumo_lab/contracts/..."), garantendo che Hardhat trovi gli artefatti.
 */
import * as fs from 'fs';
import * as path from 'path';

// CONFIGURAZIONE
const CONFIG = {
    // Percorso assoluto dei test validi
   validTestsDir: path.join(process.cwd(), 'Second_Gen', 'llm-out_small_2', 'valid'), 
	  
    // Percorso assoluto del dataset originale
    datasetDir: path.join(process.cwd(), 'dataset'),          
    // Cartella del laboratorio (Target)
    sumoDir: path.join(process.cwd(), 'sumo_lab'),            
    
    sampleSize: 0 // 0 = Tutti
};

function findSolidityFile(rootDir: string, filenameNoExt: string): string | null {
    const files = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(rootDir, file.name);
        if (file.isDirectory()) {
            const found = findSolidityFile(fullPath, filenameNoExt);
            if (found) return found;
        } else if (file.name === filenameNoExt + '.sol') {
            return fullPath;
        }
    }
    return null;
}

/**
 * Funzione che legge il contenuto del test e corregge l'FQN
 */
function patchTestContent(content: string, solidityFileName: string): string {
    // Regex per trovare: getContractFactory("QUALCOSA/NomeFile.sol:NomeContratto")
    // Vogliamo sostituire "QUALCOSA/NomeFile.sol" con "sumo_lab/contracts/NomeFile.sol"
    
    // Cerchiamo il pattern: "path/to/file.sol:ContractName"
    // Sostituiamo la parte del path con "sumo_lab/contracts/"
    
    // Strategia sicura: Sostituire l'intero argomento di getContractFactory
    // Assumiamo che l'LLM abbia scritto "....sol:ContractName"
    
    const newPath = `sumo_lab/contracts/${solidityFileName}`;
    
    // Pattern: Qualsiasi cosa che finisce con .sol, seguita da :NomeContratto
    // Esempio match: "dataset/small/0x123.sol:Token"
    // Replacement: "sumo_lab/contracts/0x123.sol:Token"
    
    // Nota: Usiamo una regex che cattura (Path)(.sol:ContractName)
    return content.replace(
        /["']([^"']+\.sol)(:[^"']+)["']/g, 
        `"${newPath}$2"`
    );
}

async function main() {
    console.log("🧪 Preparazione Laboratorio SuMo (con Auto-Patching)...");

    // 1. Pulisci e Crea Directory
    if (fs.existsSync(CONFIG.sumoDir)) {
        fs.rmSync(CONFIG.sumoDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(CONFIG.sumoDir, 'contracts'), { recursive: true });
    fs.mkdirSync(path.join(CONFIG.sumoDir, 'test'), { recursive: true });

    // 2. Leggi i test validi
    if (!fs.existsSync(CONFIG.validTestsDir)) {
        console.error(`❌ Cartella non trovata: ${CONFIG.validTestsDir}`);
        process.exit(1);
    }
    const allTestFiles = fs.readdirSync(CONFIG.validTestsDir).filter(f => f.endsWith('.spec.ts'));
    console.log(`Found ${allTestFiles.length} valid tests.`);

    // 3. Campionamento
    let selectedFiles = allTestFiles;
    if (CONFIG.sampleSize > 0 && allTestFiles.length > CONFIG.sampleSize) {
        selectedFiles = allTestFiles.sort(() => 0.5 - Math.random()).slice(0, CONFIG.sampleSize);
        console.log(`🎲 Sampling: Selezionati ${CONFIG.sampleSize} test casuali.`);
    }

    // 4. Copia e Patch
    let successCount = 0;
    
    for (const testFile of selectedFiles) {
        const parts = testFile.split('_');
        let originalId = parts[0]; 
        if (parts.length === 1) originalId = testFile.replace('.spec.ts', '');

        const sourcePath = findSolidityFile(CONFIG.datasetDir, originalId);

        if (sourcePath) {
            const contractFileName = path.basename(sourcePath);

            // A. Copia Contratto (Semplice)
            fs.copyFileSync(
                sourcePath,
                path.join(CONFIG.sumoDir, 'contracts', contractFileName)
            );

            // B. Leggi, Patcha e Scrivi Test
            const originalTestContent = fs.readFileSync(path.join(CONFIG.validTestsDir, testFile), 'utf-8');
            const patchedTestContent = patchTestContent(originalTestContent, contractFileName);
            
            fs.writeFileSync(
                path.join(CONFIG.sumoDir, 'test', testFile),
                patchedTestContent
            );

            process.stdout.write(".");
            successCount++;
        } else {
            console.log(`\n⚠️  Sorgente non trovato per: ${testFile}`);
        }
    }

    console.log(`\n\n✅ Setup Completato: ${successCount} contratti pronti.`);
    
    console.log("\n⚠️  ATTENZIONE: Modifica hardhat.config.ts!");
    console.log("Per far funzionare SuMo, devi temporaneamente cambiare la source:");
    console.log(`    sources: "./sumo_lab/contracts"`);
}

main();