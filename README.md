# 🛡️ Valutazione di Smart Contract Solidity tramite Pipeline Agentica e LLM

Questo repository ospita il codice e la metodologia sviluppati nell'ambito di un tirocinio accademico. Il progetto implementa una **pipeline agentica automatizzata** per la generazione, l'auto-correzione (*Self-Healing*) e la validazione di test suite per Smart Contract Solidity, utilizzando Large Language Models (LLM) open-source (Qwen 2.5-Coder 32B / DeepSeek-R1) su infrastruttura locale/remota.

Il sistema supera le limitazioni della generazione di codice standard affrontando problemi complessi come la "cecità da ereditarietà", la risoluzione degli artefatti Hardhat e la validazione qualitativa tramite **Mutation Testing**.

---

## 🎯 Obiettivi del Progetto

- **Generazione Context-Aware:** Creazione di prompt arricchiti tramite iniezione ricorsiva delle dipendenze ("Recursive Flattener") e risoluzione dinamica degli artefatti (FQN) per eliminare le allucinazioni strutturali.
- **Self-Healing Architecture:** Un motore di esecuzione che itera sulla generazione dei test, cattura gli errori di compilazione/runtime di Hardhat e corregge automaticamente il codice tramite euristiche mirate (fino a 3 tentativi).
- **Validazione Qualitativa:** Utilizzo di **SuMo** (Solidity Mutator) per valutare l'efficacia reale dei test generati (Mutation Score) e non solo la loro correttezza sintattica.

---

## 🛠️ Strumenti e Tecnologie

| Componente | Descrizione |
| :--- | :--- |
| **Hardhat** | Framework di sviluppo e compilazione principale. |
| **Ethers.js v5** | Libreria per l'interazione con i contratti (con vincoli di compatibilità gestiti). |
| **Ollama / Colab** | Backend per l'inferenza LLM (locale o remoto via tunnel Ngrok). |
| **SuMo** | Framework di Mutation Testing per Solidity. |
| **KodeSherpa (Custom Scripts)** | `build-prompts.ts`, `generate-test-suite.ts`, `setup-sumo.ts`. |

---

## 🚀 Guida all'Esecuzione (Workflow)

### 1. Prerequisiti e Configurazione
Assicurati di avere Node.js installato e un'istanza di Ollama attiva (locale o su Colab via Ngrok).

```
# Installazione dipendenze
npm install

# Configurazione Endpoint LLM (se usi Colab/Ngrok)
export OLLAMA_URL="https://tuo-url-ngrok.ngrok-free.app"
```

---

### 2. Fase 1: Preparazione dei Prompt (Build)

Esegue l'analisi statica dei contratti, risolve gli import locali (Flattening) per dare visibilità completa all'LLM e genera i file `.prompt.txt` con istruzioni difensive.

```
npx ts-node scripts/build-prompts.ts
```

Output: cartella `prompts_out/` con i prompt unificati.

---

### 3. Fase 2: Generazione e Auto-Correzione (Execution)

Avvia l'agente che genera i test, li esegue con Hardhat e applica le regole di correzione (Retry Template) in caso di errore.

```
# Esempio: Generazione per contratti 'medium' con modello 32B
npx ts-node scripts/generate-test-suite.ts --model=qwen2.5-coder:32b --promptsFolder=./prompts_out/medium
```

Output:

- Test validi → `llm-out/valid/`
- Test falliti → `llm-out/invalid/`

---

### 4. Fase 3: Mutation Testing con SuMo (Validazione) 🧬

Questa fase valuta la qualità dei test. Poiché SuMo richiede una configurazione specifica dei percorsi, segui attentamente questi passaggi.

---

#### Passo A: Preparazione del Laboratorio

```
npx ts-node scripts/setup-sumo.ts
```

Genera la cartella `sumo_lab/` con contratti e test da analizzare.

---

#### Passo B: Configurazione Hardhat (⚠️ PASSAGGIO CRITICO)

Modifica temporaneamente `hardhat.config.ts`:

```
paths: {
  sources: "./sumo_lab/contracts",
  tests: "./sumo_lab/test",
  cache: "./cache",
  artifacts: "./artifacts"
},
```

---

#### Passo C: Verifica Compilazione

```
npx hardhat compile
```

Se il comando fallisce, correggi prima gli import.

---

#### Passo D: Esecuzione Mutazione

```
# 1. Pre-flight check: verifica che i test originali siano verdi
npx sumo pretest

# 2. Generazione dei Mutanti
npx sumo mutate

# 3. Esecuzione test sui mutanti (Mutation Score)
npx sumo test
```

I risultati saranno disponibili nella cartella `sumo_results/`.

---

## 📊 Struttura Repository

```
dataset/           # Contratti Solidity originali (per complessità)
prompts/templates/ # Template Prompt Engineering
scripts/           # Pipeline agentica
llm-out/           # Output LLM (valid/invalid/temp)
sumo_lab/          # Workspace Mutation Testing
```

