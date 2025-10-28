

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
		directory: "contracts",
		testFolder: "llm-out/valid", // default cartella test
		templateFolder: "prompts/templates", // default cartella template
		promptsFolder: "prompts_out/small" // default cartella prompt per run-all
	};
	const result: {
		small: number;
		medium: number;
		large: number;
		directory: string;
		testFolder: string;
		templateFolder: string;
		promptsFolder: string;
	} = { ...defaults };
	args.forEach(arg => {
		if (arg.startsWith("--small=")) result.small = Number(arg.split("=")[1]);
		if (arg.startsWith("--medium=")) result.medium = Number(arg.split("=")[1]);
		if (arg.startsWith("--large=")) result.large = Number(arg.split("=")[1]);
		if (arg.startsWith("--directory=")) result.directory = arg.split("=")[1];
		if (arg.startsWith("--testFolder=")) result.testFolder = arg.split("=")[1];
		if (arg.startsWith("--templateFolder=")) result.templateFolder = arg.split("=")[1];
		if (arg.startsWith("--promptsFolder=")) result.promptsFolder = arg.split("=")[1];
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


		// 3. Genera prompt dai contratti usando il template scelto
		// Opzione: puoi modificare la cartella del template passando --templateFolder=<path> da riga di comando
		// Esempio: npx ts-node scripts/main.ts --templateFolder=nuova/cartella/template
		const templateFolder = opts.templateFolder || "prompts/templates";
		const templateFile = "only-sol.template.txt";
		const templatePath = path.join(templateFolder, templateFile);
		await runStep(
			`npx ts-node scripts/build-prompts.ts scaffolds prompts_out ${templatePath}`,
			`Generazione prompt dai contratti con template ${templatePath}`
		);

		// 4. Genera test con LLM
		// Puoi modificare la cartella dei prompt passando --promptsFolder=<path>
		await runStep(
			`npx ts-node scripts/run-all.ts --promptsFolder=${opts.promptsFolder}`,
			`Generazione test con LLM dalla cartella ${opts.promptsFolder}`
		);

		// 5. Esegui tutti i test generati
		// Puoi scegliere la cartella dei test generati, ad esempio "llm-out/valid" oppure "llm-out" o altra
		const testFolder = opts.testFolder || "llm-out/valid";
		await runStep(
			`npx ts-node scripts/test-all-generated.ts ${testFolder}`,
			`Esecuzione di tutti i test generati in ${testFolder}`
		);

	} catch (e) {
		process.exit(1);
	}
}

main();
