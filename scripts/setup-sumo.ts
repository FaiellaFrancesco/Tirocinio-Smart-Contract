#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

// CONFIGURAZIONE
const CONFIG = {
    validTestsDir: path.join(process.cwd(), 'Second_Gen', 'llm-out_small_2', 'valid'), 
    
    datasetDir: path.join(process.cwd(), 'dataset'),          
    sumoDir: path.join(process.cwd(), 'sumo_lab'),        // Dove creare il laboratorio
    sampleSize: 0                     // 0 = TUTTI. Metti es. 20 per fare un campione casuale.
};

// Helper per trovare i file .sol ricorsivamente
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

async function main() {
    console.log("🧪 Preparazione Laboratorio SuMo...");

    // 1. Pulisci e Crea Directory
    if (fs.existsSync(CONFIG.sumoDir)) {
        fs.rmSync(CONFIG.sumoDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(CONFIG.sumoDir, 'contracts'), { recursive: true });
    fs.mkdirSync(path.join(CONFIG.sumoDir, 'test'), { recursive: true });

    // 2. Leggi i test validi
    const allTestFiles = fs.readdirSync(CONFIG.validTestsDir).filter(f => f.endsWith('.spec.ts'));
    
    if (allTestFiles.length === 0) {
        console.error("❌ Nessun test valido trovato in " + CONFIG.validTestsDir);
        process.exit(1);
    }

    console.log(`Found ${allTestFiles.length} valid tests.`);

    // 3. Campionamento (Opzionale)
    let selectedFiles = allTestFiles;
    if (CONFIG.sampleSize > 0 && allTestFiles.length > CONFIG.sampleSize) {
        // Shuffle e prendi N
        selectedFiles = allTestFiles.sort(() => 0.5 - Math.random()).slice(0, CONFIG.sampleSize);
        console.log(`🎲 Sampling: Selezionati ${CONFIG.sampleSize} test casuali.`);
    }

    // 4. Copia e Link
    let successCount = 0;
    let notFoundCount = 0;

    for (const testFile of selectedFiles) {
        // Formato nome: "0x123abc_ContractName.spec.ts"
        // Dobbiamo estrarre "0x123abc" per trovare il file .sol originale
        
        // Strategia: Prendi tutto ciò che c'è prima del primo underscore "_"
        // Se il tuo formato è diverso, adatta questa logica
        const parts = testFile.split('_');
        let originalId = parts[0]; 

        // Fallback: se non c'è underscore, usa il nome intero (meno .spec.ts)
        if (parts.length === 1) {
            originalId = testFile.replace('.spec.ts', '');
        }

        // Cerca il contratto sorgente
        const sourcePath = findSolidityFile(CONFIG.datasetDir, originalId);

        if (sourcePath) {
            // Copia Test
            fs.copyFileSync(
                path.join(CONFIG.validTestsDir, testFile),
                path.join(CONFIG.sumoDir, 'test', testFile)
            );

            // Copia Contratto
            // Nota: SuMo preferisce nomi semplici. Copiamo con il nome originale.
            const contractFileName = path.basename(sourcePath);
            fs.copyFileSync(
                sourcePath,
                path.join(CONFIG.sumoDir, 'contracts', contractFileName)
            );

            process.stdout.write(".");
            successCount++;
        } else {
            console.log(`\n⚠️  Sorgente non trovato per: ${testFile} (Cercato: ${originalId}.sol)`);
            notFoundCount++;
        }
    }

    console.log(`\n\n✅ Setup Completato!`);
    console.log(`   Copiati in ./sumo_lab: ${successCount} coppie (Test + Contratto)`);
    if (notFoundCount > 0) console.log(`   Mancanti: ${notFoundCount}`);
    console.log(`\n👉 Ora esegui: npx sumo test`);
}

main();