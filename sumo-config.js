module.exports = {
  // --- CARTELLE ---
  buildDir: "artifacts",
  contractsDir: "sumo_lab/contracts",
  testDir: "sumo_lab/test",
  reportDir: "sumo_results",
  
  // --- FRAMEWORK ---
  testingFramework: "hardhat",

  // --- PARAMETRI DI ESECUZIONE ---
  testingTimeOutInSec: 300,   // Timeout per test (5 minuti)
  
  // --- PARAMETRI DI CAMPIONAMENTO (Fondamentali per la Tesi) ---
  randomSampling: false,      // FALSE = Non campionare, falli tutti
  randomMutants: 0,          // Numero di mutanti casuali per contratto (0 = tutti)

  // --- FILTRI (Lasciare vuoti per processare tutto) ---
  skipContracts: [],
  skipTests: []
};