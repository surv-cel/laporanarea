// ================= WORKZONE =================
let DB_JATIM = new Set();
let DB_BALNUS = new Set();

async function loadWorkzones() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1zzLfkuctrLA3dvesis1ZJi1-eC8eIQy_h0OV8K5nI6f2dPcOc2g9NC5NUAgQer7i-iM6mqTE_KQv/pub?output=csv';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
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

// ================= CSV PARSER =================
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

// ================= FILE CSV =================
document.getElementById("fileInput")?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => processData(reader.result);
  reader.readAsText(file);
});

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

// ================= THEME =================
document.getElementById("themeToggle")?.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

// ================= ESKALASI =================
function cleanText(t) {
  return t.replace(/\*/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickBetween(text, start, end) {
  const s = text.indexOf(start);
  if (s === -1) return "-";
  const from = s + start.length;
  if (!end) return text.substring(from).trim();
  const e = text.indexOf(end, from);
  return (e === -1 ? text.substring(from) : text.substring(from, e)).trim();
}

function formatAction(text) {
  return text.replace(/(\d{2}:\d{2}\sWIB\s:)/g, '\n$1').trim();
}

function convertEskalasi() {
  const raw = cleanText(document.getElementById('eskInput').value);

  const result = `
Kepada : ${pickBetween(raw,'Kepada :','Current status')}
Current status : ${pickBetween(raw,'Current status :','Nomor Tiket')}
Nomor Tiket : ${pickBetween(raw,'Nomor Tiket :','NE')}

NE: ${pickBetween(raw,'NE:','LOKASI')}
LOKASI : ${pickBetween(raw,'LOKASI :','Urgency')}
Urgency : ${pickBetween(raw,'Urgency :','Start Time')}

Start Time : ${pickBetween(raw,'Start Time :','End Time')}
End Time : ${pickBetween(raw,'End Time :','Duration Time')}
Duration Time : ${pickBetween(raw,'Duration Time :','Headline')}

Headline : ${pickBetween(raw,'Headline :','Impacted Service')}

Impacted Service :
${pickBetween(raw,'Impacted Service :','Pelanggan Terganggu')}

Pelanggan Terganggu :
${pickBetween(raw,'Pelanggan Terganggu :','Perangkat Terganggu')}

Perangkat Terganggu :
${pickBetween(raw,'Perangkat Terganggu :','Penyebab gangguan')}

Penyebab gangguan:
${pickBetween(raw,'Penyebab gangguan:','Action')}

Action :
${formatAction(pickBetween(raw,'Action :','PIC'))}

PIC :
${pickBetween(raw,'PIC :','CC')}

CC :
${pickBetween(raw,'CC :','Eskalasi')}

Eskalasi :
${pickBetween(raw,'Eskalasi :','Surveillance')}

Surveillance ROC5 - ${pickBetween(raw,'Surveillance','REPORT INTERNAL TELKOM')}

REPORT INTERNAL TELKOM
DILARANG DISEBARLUASKAN KE LUAR TELKOM

Contact Center:
Free Call : 0800-1-353000
TSEL : 0811-3081-500
`.trim();

  document.getElementById('eskOutput').value = result;
}

function copyEskalasi() {
  const o = document.getElementById('eskOutput');
  o.select();
  document.execCommand('copy');
  alert('Data eskalasi berhasil di-copy');
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  loadWorkzones();
  document.getElementById('btnConvert')?.addEventListener('click', convertEskalasi);
  document.getElementById('btnCopy')?.addEventListener('click', copyEskalasi);
});
