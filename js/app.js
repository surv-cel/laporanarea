// ===== LOAD DATABASE DARI GOOGLE SHEETS =====
let DB_JATIM = new Set();
let DB_BALNUS = new Set();

async function loadWorkzones() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1zzLfkuctrLA3dvesis1ZJi1-eC8eIQy_h0OV8K5nI6f2dPcOc2g9NC5NUAgQer7i-iM6mqTE_KQv/pub?output=csv';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const [jatim, balnus] = line.split(',');
      if (jatim) DB_JATIM.add(jatim.trim().toUpperCase());
      if (balnus) DB_BALNUS.add(balnus.trim().toUpperCase());
    });
    console.log('Workzones loaded:', DB_JATIM.size, DB_BALNUS.size);
  } catch (err) {
    console.error('Gagal load workzones:', err);
  }
}

// ===== CSV PARSER =====
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  let delimiter = ',';
  if (lines[0].includes(';')) delimiter = ';';
  else if (lines[0].includes('\t')) delimiter = '\t';

  const headers = lines.shift().split(delimiter).map(h => h.trim());

  return lines.map(l => {
    const cols = l.split(delimiter);
    const o = {};
    headers.forEach((h, i) => o[h] = cols[i]?.trim() || '');
    return o;
  });
}

// ===== HANDLE FILE UPLOAD =====
document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => processData(reader.result);
  reader.readAsText(file);
});

// ===== PROCESS CSV DATA =====
function processData(csv) {
  const data = parseCSV(csv);
  const jatimBox = document.querySelector("#jatim .content");
  const balnusBox = document.querySelector("#balnus .content");
  jatimBox.innerHTML = "";
  balnusBox.innerHTML = "";

  let d = 0, f = 0, g = 0;
  let noJ = 1, noB = 1;

  data.forEach(row => {
    const summary = row["SUMMARY"] || "";
    const update = row["WORKLOG SUMMARY"] || "-";
    const zone = (row["WORKZONE"] || "").toUpperCase();

    if (summary.includes("DISTRIBUSI")) d++;
    if (summary.includes("FEEDER")) f++;
    if (summary.includes("GPON")) g++;

    const card = document.createElement("div");
    card.className = "card";

    if (DB_JATIM.has(zone)) {
      card.innerHTML = `<b>${noJ++}. ${row["INCIDENT"] || '-'}</b><br>${summary}<br><br><b>Update :</b> ${update}`;
      jatimBox.appendChild(card);
    } else if (DB_BALNUS.has(zone)) {
      card.innerHTML = `<b>${noB++}. ${row["INCIDENT"] || '-'}</b><br>${summary}<br><br><b>Update :</b> ${update}`;
      balnusBox.appendChild(card);
    }
  });

  document.getElementById("distriCount").textContent = `DISTRIBUSI : ${d}`;
  document.getElementById("feederCount").textContent = `FEEDER : ${f}`;
  document.getElementById("gponCount").textContent = `GPON : ${g}`;

  if (!jatimBox.children.length) jatimBox.innerHTML = `<div class="empty">Tidak ada data JATIM</div>`;
  if (!balnusBox.children.length) balnusBox.innerHTML = `<div class="empty">Tidak ada data BALNUS</div>`;
}

// ===== THEME TOGGLE =====
document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("light");
  document.getElementById("themeToggle").textContent =
    document.body.classList.contains("light") ? "☀️ Light" : "🌙 Dark";
};

// ===== INIT =====
loadWorkzones();
