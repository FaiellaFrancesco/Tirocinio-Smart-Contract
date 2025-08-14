#!/bin/bash

mkdir -p temp_contracts
mkdir -p compile_success
mkdir -p compile_failed

for file in contracts/*.sol; do
  echo "🔍 Testing: $file"
  mkdir contracts_temp
  cp "$file" contracts_temp/
  
  mv contracts contracts_backup
  mv contracts_temp contracts

  npx hardhat clean > /dev/null

  if npx hardhat compile > /dev/null 2>&1; then
    echo "✅ OK: $file"
    cp "$file" compile_success/
  else
    echo "❌ ERROR: $file"
    cp "$file" compile_failed/
  fi

  rm -rf contracts
  mv contracts_backup contracts
done
