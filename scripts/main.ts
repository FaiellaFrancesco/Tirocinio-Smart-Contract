

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


function parseArgs() {
	const args = process.argv.slice(2);
	const defaults = {
		small: 70,
		medium: 200,
		large: 1000,
		directory: "contracts"
	};
	const result = { ...defaults };
	args.forEach(arg => {
		if (arg.startsWith("--small=")) result.small = Number(arg.split("=")[1]);
		if (arg.startsWith("--medium=")) result.medium = Number(arg.split("=")[1]);
		if (arg.startsWith("--large=")) result.large = Number(arg.split("=")[1]);
		if (arg.startsWith("--directory=")) result.directory = arg.split("=")[1];
	});
	return result;
}

async function main() {
	const opts = parseArgs();
	try {
		// 1. Suddividi i contratti per dimensione
		await runStep(
			`npx ts-node scripts/dividi.ts --small=${opts.small} --medium=${opts.medium} --large=${opts.large} --directory=${opts.directory}`,
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

		// 4. Genera test con LLM
		await runStep(
			`npx ts-node scripts/run-all.ts`,
			"Generazione test con LLM"
		);

		
	} catch (e) {
		process.exit(1);
	}
}

main();
