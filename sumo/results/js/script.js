function getScoreColor(score) {
    if (score === "N/A") return "";
    const numericScore = parseFloat(score);
    if (numericScore <= 50) return "#dc3545";
    else if (numericScore <= 69) return "#fd7e14";
    else if (numericScore <= 79) return "#ffc107";
    else return "#28a745";
  }

async function loadSummary() {
    try {
      const response = await fetch("mutations.json");
      const data = await response.json();
      const tableBody = document.querySelector("#summaryTable tbody");
      tableBody.innerHTML = "";

      let overallKilled = 0;
      let overallLive = 0;
      let totalMutantsCount = 0;
      let contractsCount = 0;

      Object.keys(data).forEach(contract => {
        contractsCount++;
        const mutants = data[contract];
        totalMutantsCount += mutants.length;
        const killed = mutants.filter(m => m.status === "killed").length;
        const live = mutants.filter(m => m.status === "live").length;
        const stillborn = mutants.filter(m => m.status === "stillborn").length;
        const timedout = mutants.filter(m => m.status === "timedout").length;
        const untested = mutants.filter(m => !m.status).length;

        overallKilled += killed;
        overallLive += live;

        const scoreBase = live + killed;
        const mutationScore = scoreBase > 0 ? ((killed / scoreBase) * 100).toFixed(1) : "N/A";
        const scoreColor = getScoreColor(mutationScore);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><a href="contract.html?contract=${contract}">${contract}</a></td>
            <td>${mutants.length}</td>
            <td>${killed}</td>
            <td>${live}</td>
            <td>${stillborn}</td>
            <td>${timedout}</td>
            <td>${untested}</td>
            <td><span style="color: ${scoreColor}">${mutationScore}%</span></td>
          `;
        tableBody.appendChild(row);
      });

      // Update overall mutation score.
      const overallScoreBase = overallLive + overallKilled;
      const overallScore = overallScoreBase > 0 ? ((overallKilled / overallScoreBase) * 100).toFixed(1) : "N/A";
      const scoreElem = document.getElementById("scoreValue");
      scoreElem.innerText = overallScore;

      // Set color for overall score.
      scoreElem.style.color = getScoreColor(overallScore);

      // Display additional summary information.
      document.getElementById("summaryInfo").innerText = `Total Contracts: ${contractsCount} | Total Mutants: ${totalMutantsCount}`;

      // Update generated date in footer.
      document.getElementById("generatedDate").innerText = new Date().toLocaleString();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

async function loadContractData() {
    const urlParams = new URLSearchParams(window.location.search);
    const contract = urlParams.get("contract");
    document.getElementById("contractTitle").innerText = contract;

    try {
      const response = await fetch("mutations.json");
      const data = await response.json();
      const mutants = data[contract] || [];
      const tableBody = document.querySelector("#mutationTable tbody");
      tableBody.innerHTML = "";

      mutants.forEach((m, index) => {
        const row = document.createElement("tr");
        row.classList.add(`status-${m.status || "untested"}`);
        row.innerHTML = `
                  <td>${m.id}</td>
                  <td>${m.operator}</td>
                  <td><pre><code class="diff">${m.functionName}</code></pre></td>
                  <td>${m.startLine}-${m.endLine}</td>
                  <td><pre><code class="diff">${highlightDiff(m.diff)}</code></pre></td>
                  <td>${m.status || "untested"}</td>
                `;
        tableBody.appendChild(row);
      });

    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

function filterMutants() {
    const operatorTextInput = document.getElementById("operatorFilter").value.toLowerCase();
    const functionTextInput = document.getElementById("functionFilter").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value.toLowerCase();
    const rows = document.querySelectorAll("#mutationTable tbody tr");

    rows.forEach(row => {
      // Using the Function column (index 1) and Status column (index 5)
      const operator = row.cells[1].textContent.toLowerCase();
      const funcName = row.cells[2].textContent.toLowerCase();
      const status = row.cells[5].textContent.toLowerCase();
      const matchesOperator = operator.includes(operatorTextInput);
      const matchesText = funcName.includes(functionTextInput);
      const matchesStatus = !statusFilter || status === statusFilter;

      row.style.display = (matchesText && matchesStatus && matchesOperator) ? "" : "none";
    });
  }

function downloadAllCSV() {
    fetch("mutations.json")
      .then(response => response.json())
      .then(data => {
        let csvContent = "Contract,Total Mutants,Killed,Live,Stillborn,Timed Out,Untested,Mutation Score\n";
        Object.keys(data).forEach(contract => {
          const mutants = data[contract];
          const total = mutants.length;
          const killed = mutants.filter(m => m.status === "killed").length;
          const live = mutants.filter(m => m.status === "live").length;
          const stillborn = mutants.filter(m => m.status === "stillborn").length;
          const timedout = mutants.filter(m => m.status === "timedout").length;
          const untested = mutants.filter(m => !m.status).length;
          const scoreBase = live + killed;
          const mutationScore = scoreBase > 0 ? ((killed / scoreBase) * 100).toFixed(1) : "N/A";
          csvContent += `"${contract}",${total},${killed},${live},${stillborn},${timedout},${untested},${mutationScore}\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "contracts_summary.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(error => console.error("Error generating CSV:", error));
  }

function downloadContractCSV() {
    const urlParams = new URLSearchParams(window.location.search);
    const contract = urlParams.get("contract");
    if (!contract) {
      console.error("No contract specified");
      return;
    }
    fetch("mutations.json")
      .then(response => response.json())
      .then(data => {
        const mutants = data[contract] || [];

        // Helper function to escape CSV fields properly,
        // remove line breaks, and collapse multiple spaces into one.
        const escapeCSV = (field) => {
          if (field === null || field === undefined) {
            return '""';
          }
          let fieldStr = String(field);
          // Remove any newline characters (CR, LF, or CRLF)
          fieldStr = fieldStr.replace(/(\r\n|\n|\r)/g, " ");
          // Replace any sequence of whitespace with a single space
          fieldStr = fieldStr.replace(/\s+/g, " ");
          // Trim any leading or trailing whitespace
          fieldStr = fieldStr.trim();
          // Escape any double quotes by doubling them
          fieldStr = fieldStr.replace(/"/g, '""');
          return `"${fieldStr}"`;
        };

        // CSV header including all fields: id, file, functionName, start, end, startLine, endLine, original, replace, operator, status, testingTime
        let csvContent = "id,file,functionName,start,end,startLine,endLine,original,replace,operator,status,testingTime\n";

        mutants.forEach(m => {
          const row = [
            escapeCSV(m.id),
            escapeCSV(m.file),
            escapeCSV(m.functionName),
            escapeCSV(m.start),
            escapeCSV(m.end),
            escapeCSV(m.startLine),
            escapeCSV(m.endLine),
            escapeCSV(m.original),
            escapeCSV(m.replace),
            escapeCSV(m.operator),
            escapeCSV(m.status || "untested"),
            escapeCSV(m.testingTime)
          ];
          csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", contract + "_details.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(error => console.error("Error generating CSV for contract:", error));
  }

function highlightDiff(diffText) {
    return diffText
      .split('\n')
      .map(line => {
        // Collapse multiple whitespace characters into one
        const cleaned = line.replace(/\s+/g, ' ');

        if (cleaned.includes('+++|')) {
          return `<span class="diff-added">${escapeHtml(cleaned)}</span>`;
        } else if (cleaned.includes('---|')) {
          return `<span class="diff-removed">${escapeHtml(cleaned)}</span>`;
        } else {
          return `<span>${escapeHtml(cleaned)}</span>`;
        }
      })
      .join('\n');
  }

function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

if (document.getElementById('summaryTable')) loadSummary();

if (document.getElementById('contractTitle')) loadContractData();