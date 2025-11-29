import { exec } from "child_process";
import path from "path";

/**
 * main.ts (Pipeline Orchestrator)
 *
 * OBIETTIVO:
 * Questo script funge da "Centro di Comando" per l'intera tesi. Automatizza l'esecuzione sequenziale
 * di tutti i passaggi necessari per passare dai contratti grezzi ai test validati.
 * Invece di lanciare manualmente 4 script diversi, lanci questo e fa tutto lui.
 *
 * FLUSSO DI ESECUZIONE (Pipeline):
 * 1. SUDDIVISIONE: Chiama `dividi.ts` per organizzare i contratti in cartelle (small/medium/large).
 * 2. BUILD PROMPTS: Chiama `build-prompts.ts` per analizzare i contratti, risolvere le dipendenze (Flattener)
 * e creare i file .prompt.txt con le istruzioni per l'LLM.
 * 3. GENERAZIONE & VALIDAZIONE: Chiama `generate-test-suite.ts` (il motore agentico) che:
 * - Invia i prompt all'LLM (es. Qwen/DeepSeek).
 * - Riceve il codice.
 * - Esegue Hardhat test.
 * - Gestisce i Retry (fino a 3 tentativi) in caso di errore.
 * 4. REPORT (Opzionale): Esegue un test finale su tutti i file generati.
 *
 * ARGOMENTI CLI (Opzionali):
 * Puoi personalizzare l'esecuzione passando dei flag. Se non li passi, usa i default.
 *
 * --promptsFolder=...  : Quale cartella di prompt processare (default: prompts_out/small).
 * Usa "prompts_out/medium" per i contratti medi.
 * --model=...          : Quale modello LLM usare su Ollama (default: qwen2.5-coder:32b).
 * --small=...          : Soglia righe per contratti Small (default: 80).
 * --medium=...         : Soglia righe per contratti Medium (default: 200).
 *
 * ESEMPI DI UTILIZZO:
 *
 * 1. Esecuzione Standard (Small, Qwen 32B):
 * npx ts-node scripts/main.ts
 *
 * 2. Esecuzione sui Medium con DeepSeek:
 * npx ts-node scripts/main.ts --promptsFolder=prompts_out/medium --model=deepseek-r1:32b
 *
 * 3. Riconfigurazione dimensioni dataset:
 * npx ts-node scripts/main.ts --small=50 --medium=150
 */
function runStep(cmd: string, descrizione: string) {
    return new Promise<void>((resolve, reject) => {
        console.log(`\n🚀 [STEP] ${descrizione}...`);
        console.log(`   > ${cmd}`);
        
        const process = exec(cmd);

        process.stdout?.on('data', (data) => console.log(data.toString().trim()));
        process.stderr?.on('data', (data) => console.error(data.toString().trim()));

        process.on('exit', (code) => {
            if (code === 0) {
                console.log(`✅ [OK] ${descrizione} completata.`);
                resolve();
            } else {
                console.error(`❌ [ERROR] ${descrizione} fallita con codice ${code}.`);
                reject(new Error(`Step failed: ${descrizione}`));
            }
        });
    });
}

function parseArgs() {
    const args = process.argv.slice(2);
    const defaults = {
        // Parametri per dividi.ts
        small: 80,
        medium: 200,
        large: 1000,
        directory: "contracts",
        
        // Parametri Pipeline
        testFolder: "llm-out/valid", 
        promptsFolder: "prompts_out/small", // Cartella di default da processare
        model: "qwen2.5-coder:32b"          // Modello di default
    };

    const result = { ...defaults };

    args.forEach(arg => {
        const [key, value] = arg.split("=");
        if (key === "--small") result.small = Number(value);
        if (key === "--medium") result.medium = Number(value);
        if (key === "--large") result.large = Number(value);
        if (key === "--directory") result.directory = value;
        if (key === "--testFolder") result.testFolder = value;
        if (key === "--promptsFolder") result.promptsFolder = value;
        if (key === "--model") result.model = value;
    });

    return result;
}

async function main() {
    const opts = parseArgs();
    console.log("📋 Configurazione Pipeline:", opts);

    try {
        // 1. Organizzazione Dataset (Opzionale se già fatto, ma male non fa)
        // Divide i contratti in small/medium/large
        await runStep(
            `npx ts-node scripts/dividi.ts --small=${opts.small} --medium=${opts.medium} --large=${opts.large} --directory=${opts.directory}`,
            "1. Suddivisione contratti per dimensione"
        );

        // 2. Generazione Prompt (Build)
        // Questo script ora include il Flattener e la logica FQN.
        // Non servono argomenti perché legge la config interna (dataset/report.json).
        await runStep(
            `npx ts-node scripts/build-prompts.ts`,
            "2. Generazione Prompt (Preprocessing & Flattening)"
        );

        // 3. Generazione Test Suite (Execution Engine)
        // Esegue il loop agentico (Try 1 -> Retry -> Try 3)
        // Nota: Processa la cartella specificata in --promptsFolder (es. prompts_out/medium)
        await runStep(
            `npx ts-node scripts/generate-test-suite.ts --promptsFolder=${opts.promptsFolder} --model=${opts.model}`,
            `3. Generazione Test con Modello ${opts.model}`
        );

        // 4. Report Finale / Run di Massa (Opzionale)
        // Esegue tutti i test validi generati per conferma finale
        // (Assicurati che lo script test-all-generated.ts esista, altrimenti usa "npx hardhat test")
        await runStep(
            `npx hardhat test ${path.join(opts.testFolder, "*.spec.ts")}`,
            `4. Esecuzione finale dei test validi in ${opts.testFolder}`
        );

    } catch (e) {
        console.error("\n💥 Pipeline interrotta per errore critico.");
        process.exit(1);
    }
}

main();