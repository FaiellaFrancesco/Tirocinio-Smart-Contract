
import { exec } from "child_process";
import path from "path";

function runStep(cmd: string, descrizione: string) {
	return new Promise<void>((resolve, reject) => {
		console.log(`\n--- ${descrizione} ---`);
		exec(cmd, (err, stdout, stderr) => {
			if (err) {
				console.error(`Errore in ${descrizione}:`, stderr);
				reject(err);
			} else {
				console.log(stdout);
				resolve();
			}
		});
	});
}

async function main() {
	try {
		// 1. Suddividi i contratti per dimensione
		await runStep(
			`npx ts-node scripts/dividi.ts --small=70 --medium=200 --directory=contracts`,
			"Suddivisione contratti per dimensione"
		);

		// 2. Genera scaffolds di test
		await runStep(
			`npx ts-node scripts/generate-scaffolds-by-size.ts`,
			"Generazione scaffolds di test"
		);

		// 3. (Opzionale) Genera prompt da scaffolds
		await runStep(
			`npx ts-node scripts/build-prompts.ts`,
			"Generazione prompt da scaffolds"
		);

		// 4. (Opzionale) Avvia lo script Python Colab
		await runStep(
			`python3 colab-complete-setup.py`,
			"Setup Colab/Ollama"
		);
	} catch (e) {
		process.exit(1);
	}
}

main();
