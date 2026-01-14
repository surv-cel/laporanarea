// ================= WORKZONE =================
let DB_JATIM = new Set();
let DB_BALNUS = new Set();

// SIMPAN DATA CSV ASLI
let ALL_DATA = [];

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
  } catch (err) {
    console.error('Gagal load workzones:', err);
  }
}

// ================= CSV PARSER =================
function parseCSV(text) {
  // hapus BOM UTF-8 jika ada
  text = text.replace(/^\uFEFF/, '');

  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  let delimiter = ',';
  if (lines[0].includes(';')) delimiter = ';';
  else if (lines[0].includes('\t')) delimiter = '\t';

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const next = line[i + 1];

      if (c === '"' && next === '"' && inQuotes) {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result.map(v => v.trim());
  };

  const headers = parseLine(lines.shift());

  return lines.map(line => {
    const cols = parseLine(line);
    const o = {};
    headers.forEach((h, i) => {
      o[h] = cols[i] ?? '';
    });
    return o;
  });
}

// ================= FILE CSV =================
document.getElementById("fileInput")?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    ALL_DATA = parseCSV(reader.result);
    renderData(ALL_DATA);
  };
  reader.readAsText(file);
});

// ================= RENDER DATA (ASLI + DIPAKAI SEARCH) =================
function renderData(data) {
  const jatimBox = document.querySelector("#jatim .content");
  const balnusBox = document.querySelector("#balnus .content");
  jatimBox.innerHTML = "";
  balnusBox.innerHTML = "";

  let total = 0;
  let bb = 0, ip = 0;
  let d = 0, f = 0, g = 0;
  let odc = 0, odp = 0;
  let noJ = 1, noB = 1;

  data.forEach(row => {
	  const summary = (row["SUMMARY"] || "").toUpperCase();
	  total++;

	  if (summary.includes("(REPAIR) TRA T3") || summary.includes("(RECOVERY) TRA T3")) {
		bb++;
	  }

	  if (summary.includes("(REPAIR) IP T3") || summary.includes("(RECOVERY) IP T3")) {
		ip++;
	  }

	  if (summary.includes("DISTRIBUSI")) d++;
	  if (summary.includes("FEEDER")) f++;
	  if (summary.includes("GPON")) g++;
	  if (summary.includes("ODC")) odc++;
	  if (summary.includes("ODP")) odp++;

    const zone = (row["WORKZONE"] || row["WORK ZONE"] || "").toUpperCase();
		const update = row["UPDATE"] || row["ACTION"] || "-";

		const card = document.createElement("div");
		card.className = "card";

		if (DB_JATIM.has(zone)) {
		  card.innerHTML = `<b>${noJ++}. ${row["INCIDENT"] || '-'}</b><br>${summary}<br><br><b>Update :</b> ${update}`;
		  jatimBox.appendChild(card);
		} 
		else if (DB_BALNUS.has(zone)) {
		  card.innerHTML = `<b>${noB++}. ${row["INCIDENT"] || '-'}</b><br>${summary}<br><br><b>Update :</b> ${update}`;
		  balnusBox.appendChild(card);
	}
});

	document.getElementById("totalCount").textContent = `TOTAL : ${total}`;
	document.getElementById("bbCount").textContent = `BB : ${bb}`;
	document.getElementById("ipCount").textContent = `IP : ${ip}`;
	document.getElementById("gponCount").textContent = `GPON : ${g}`;
	document.getElementById("feederCount").textContent = `FEEDER : ${f}`;
	document.getElementById("distriCount").textContent = `DISTRIBUSI : ${d}`;
	document.getElementById("odcCount").textContent = `ODC : ${odc}`;
	document.getElementById("odpCount").textContent = `ODP : ${odp}`;


  if (!jatimBox.children.length) jatimBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
  if (!balnusBox.children.length) balnusBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
}

// ================= SEARCH =================
document.getElementById("btnSearch")?.addEventListener("click", () => {
  const keyword = document.getElementById("searchInput").value.trim();

  if (!keyword) {
    renderData(ALL_DATA);
    return;
  }

  const incList = keyword
    .split(',')
    .map(i => i.trim().toUpperCase())
    .filter(Boolean);

  const filtered = ALL_DATA.filter(row =>
    incList.includes((row["INCIDENT"] || "").toUpperCase())
  );

  renderData(filtered);
});

// ================= THEME =================
document.getElementById("themeToggle")?.addEventListener("click", () => {
  document.body.classList.toggle("light");
});


// =============COPY JATIM BALNUS =============
function copyColumn(type){
  const box = document.querySelector(`#${type} .content`);
  if (!box || !box.children.length) {
    alert('Tidak ada data untuk di-copy');
    return;
  }

  let text = '';
  box.querySelectorAll('.card').forEach(card=>{
    text += card.innerText.trim() + '\n\n';
  });

  navigator.clipboard.writeText(text.trim()).then(()=>{
    alert(`Data ${type.toUpperCase()} berhasil di-copy`);
  });
}

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

function formatMultiLineBlock(text) {
  if (!text || text === '-') return '-';

  return text
    .replace(/NODEB\s*:\s*(\d+)/i, 'NODEB : $1')
    .replace(/BROADBAND\s*:\s*(\d+)/i, '\nBROADBAND : $1')
    .replace(/EBIS\s*:\s*(\d+)/i, '\nEBIS : $1')
    .replace(/WIFI\s*:\s*(\d+)/i, '\nWIFI : $1')
    .trim();
}

function cleanCC(text) {
  return text
    .split('Surveillance')[0]   // potong sebelum Surveillance
    .split('REPORT INTERNAL')[0]
    .split('Contact Center')[0]
    .trim();
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

*Impacted Service* :
${formatMultiLineBlock(
  pickBetween(raw,'Impacted Service :','Pelanggan Terganggu')
)}

*Pelanggan Terganggu* :
${formatMultiLineBlock(
  pickBetween(raw,'Pelanggan Terganggu :','Perangkat Terganggu')
)}

Perangkat Terganggu :
${pickBetween(raw,'Perangkat Terganggu :','Penyebab gangguan')}

Penyebab gangguan:
${pickBetween(raw,'Penyebab gangguan:','Action')}

Action :
${formatAction(pickBetween(raw,'Action :','PIC'))}

PIC :
${pickBetween(raw,'PIC :','CC')}

CC :
${cleanCC(pickBetween(raw,'CC :','Surveillance'))}

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
