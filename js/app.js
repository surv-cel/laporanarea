// ================= WORKZONE =================
let DB_JATIM = new Set();
let DB_BALNUS = new Set();

// SIMPAN DATA CSV ASLI
let ALL_DATA = [];
let CRA_RESULT = [];

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
	   const summary = row["SUMMARY"] || "";
	   const update  = row["WORKLOG SUMMARY"] || "-";
	   const zone    = (row["WORKZONE"] || "").toUpperCase();
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

    // const zone = (row["WORKZONE"] || row["WORK ZONE"] || "").toUpperCase();
		// const update = row["UPDATE"] || row["ACTION"] || "-";

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
	// document.getElementById("odcCount").textContent = `ODC : ${odc}`;
	// document.getElementById("odpCount").textContent = `ODP : ${odp}`;


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


// ================= CRA MODULE =================

// simpan data CRA hasil olahan
let CRA_DATA = [];

//TAMBAHAN ONSKEJUL
function getStatusClass(val){
  if (val === 'ON SCHEDULE') return 'on';
  if (val === 'CANCEL') return 'cancel';
  return 'wait';
}

// helper: parse CSV sederhana
function parseCRACSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  let delimiter = ',';
  if (lines[0].includes(';')) delimiter = ';';
  if (lines[0].includes('\t')) delimiter = '\t';

  const headers = lines.shift().split(delimiter).map(h => h.trim());

  return lines.map(line => {
    const cols = line.split(delimiter);
    const o = {};
    headers.forEach((h, i) => {
      o[h] = (cols[i] || '').trim();
    });
    return o;
  });
}

// ambil angka CRA (CRA.146475 -> 146475)
function getCRANumber(noCRA = '') {
  const m = noCRA.match(/CRA\.(\d+)/i);
  return m ? m[1] : null;
}

// render tabel CRA
function renderCRA(data) {
  const tbody = document.querySelector('#craTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty">Data CRA tidak ditemukan</td>
      </tr>`;
    return;
  }

  let no = 1;

  data.forEach(row => {
    if (!row.status) row.status = 'BELUM DIISI';

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${no++}</td>

      <td>
        <select class="cra-status ${getStatusClass(row.status)}">
          <option ${row.status==='ON SCHEDULE'?'selected':''}>ON SCHEDULE</option>
          <option ${row.status==='BELUM DIISI'?'selected':''}>BELUM DIISI</option>
          <option ${row.status==='CANCEL'?'selected':''}>CANCEL</option>
        </select>
      </td>

      <td>${row.noCRA}</td>
      <td>${row.deskripsi}</td>
      <td>${row.lokasi.join(', ')}</td>
      <td>${row.regional}</td>
      <td>${row.pic}</td>
      <td>${row.tanggal}</td>
      <td>${row.waktu}</td>
      <td>${row.crq}</td>
    `;

    // simpan perubahan status
    tr.querySelector('select').addEventListener('change', e => {
      row.status = e.target.value;
      e.target.className = `cra-status ${getStatusClass(row.status)}`;
    });

    tbody.appendChild(tr);
  });
}

// proses data CRA

function formatExcelDate(v){
  if (!v) return '';

  // jika sudah Date object
  if (v instanceof Date) {
    return v.toISOString().split('T')[0];
  }

  // jika NUMBER (serial Excel)
  if (typeof v === 'number') {
    const date = new Date(Math.round((v - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }

  return v;
}

function pickField(row, names = []) {
  for (const key of Object.keys(row)) {
    const clean = key.toUpperCase().replace(/\s+/g,' ').trim();
    for (const n of names) {
      if (clean === n.toUpperCase()) {
        return row[key];
      }
    }
  }
  return '';
}

function processCRA(rawData) {
  const map = new Map();

  rawData.forEach(row => {
    const regional = (row['REGIONAL'] || '').toUpperCase();
   // if (!regional.includes('REG 5')) return;
   // hanya ambil Reg 5 atau All Reg
	if (!regional.includes('REG 5') && !regional.includes('ALL REG')) return;
    
    const noCRA = row['No CRA'] || row['NO CRA'] || '';
    const key = getCRANumber(noCRA);
    if (!key) return;

    const lokasiRaw = row['LOKASI'] || '';
    const lokasiArr = lokasiRaw
      .split(',')
      .map(l => l.trim())
      .filter(Boolean);

    if (!map.has(key)) {
      map.set(key, {
        noCRA,
        deskripsi: row['JUDUL'] || row['DESKRIPSI'] || row['DESCRIPTION'] || '',
        lokasi: [...lokasiArr],
        regional: row['REGIONAL'] || '',
        kota: row['KOTA'] || row['CITY'] || '',
        segment: row['SEGMENT'] || '',
        pic: row['PIC'] || '',
        // tanggal: row['TANGGAL'] || row['DATE'] || '',
        //waktu: row['WAKTU'] || row['JAM'] || '',
        tanggal: formatExcelDate(
		  pickField(row, [
			'TGL_MULAI',
			'TGL MULAI',
			'TANGGAL',
			'DATE'
		  ])
		),

		waktu: pickField(row, [
		  'WAKTU SETEMPAT',
		  'WAKTU',
		  'JAM',
		  'START-END',
		  'START - END'
		]),
		durasi: row['DURASI'] || '',
        tipe: row['TIPE'] || '',
        pelaksana: row['PELAKSANA'] || '',
        metode: row['METODE'] || '',
        crq: row['CRQ'] || ''
      });
    } else {
      // gabungkan lokasi jika CRA sama
      const existing = map.get(key);
      lokasiArr.forEach(l => {
        if (!existing.lokasi.includes(l)) {
          existing.lokasi.push(l);
        }
      });
    }
  });

  CRA_DATA = Array.from(map.values());
  renderCRA(CRA_DATA);
}
 

// ================= CRA EXCEL SUPPORT =================

function parseCRAExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // convert sheet to JSON
  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    //raw: false
	raw: true,        // 🔥 INI KUNCI UTAMA
    cellDates: true  // 🔥 PENTING UNTUK TANGGAL
  });
}

 
// override event upload CRA (CSV + XLS)
document.getElementById('craFile')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  if (ext === 'xls' || ext === 'xlsx') {
    reader.onload = evt => {
      const data = parseCRAExcel(evt.target.result);
      processCRA(data);
      CRA_RESULT = CRA_DATA;
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  reader.onload = () => {
    const text = reader.result;
    const data = parseCRACSV(text);
    processCRA(data);
    CRA_RESULT = CRA_DATA;
  };
  reader.readAsText(file);
});

// ================= EXPORT CRA TO EXCEL =================

function statusWithIcon(status){
  if (status === 'ON SCHEDULE') return 'ON SCHEDULE ✅';
  if (status === 'CANCEL') return 'CANCEL ❌';
  return 'BELUM DIISI ⌛️';
}

function exportCRAtoExcel() {
  if (!CRA_DATA.length) {
    alert('Data CRA kosong');
    return;
  }
  
const rows = CRA_DATA.map((row, i) => ({
  No: i + 1,
  Status: row.status || 'BELUM DIISI',
  Status: statusWithIcon(row.status),
  No_CRA: row.noCRA,
  Judul: row.deskripsi,
  Lokasi: row.lokasi.join(', '),
  Regional: row.regional,
  PIC: row.pic,
  Tanggal: row.tanggal,
  Waktu: row.waktu,
  CRQ: row.crq
}));


  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CRA Reg 5');

  XLSX.writeFile(wb, 'CRA_REG5.xlsx');
}

// EXPORT TEXT NOTEPAD 
function exportCRAtoTXT() {
  if (!CRA_DATA.length) {
    alert('Data CRA kosong');
    return;
  }

  const total = CRA_DATA.length;

  const count = {
    'ON SCHEDULE': 0,
    'CANCEL': 0,
    'BELUM DIISI': 0
  };

  CRA_DATA.forEach(r => {
    const s = r.status || 'BELUM DIISI';
    count[s]++;
  });

  let txt = '';
  txt += `KEGIATAN CRA MALAM INI : ${total} KEGIATAN\n\n\n`;
  txt += `ON SCHEDULE : ${count['ON SCHEDULE']}\n`;
  txt += `CANCEL : ${count['CANCEL']}\n`;
  txt += `BELUM DIISI : ${count['BELUM DIISI']}\n`;
  txt += `TOTAL : ${total}\n\n\n`;

  CRA_DATA.forEach((row, i) => {
    txt += `${i + 1}. ${statusWithIcon(row.status || 'BELUM DIISI')}\n`;
    txt += `${row.noCRA}\n`;
    txt += `${row.deskripsi}\n`;
    txt += `Regional : ${row.regional}\n`;
    txt += `Tgl : ${row.tanggal} ${row.waktu}\n`;
    txt += `PIC : ${row.pic}\n`;
    txt += `CRQ : ${row.crq}\n\n`;
    txt += `Lokasi : ${row.lokasi.join(', ')}\n\n\n`;
    txt += `--------------------------------------------------\n\n`;
  });

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'CRA_MALAM_INI.txt';
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  loadWorkzones();
  document.getElementById('btnConvert')?.addEventListener('click', convertEskalasi);
  document.getElementById('btnCopy')?.addEventListener('click', copyEskalasi);
  document.getElementById('btnExportCRA')?.addEventListener('click', exportCRAtoExcel);
document.getElementById('btnExportTXT')
  ?.addEventListener('click', exportCRAtoTXT);
});
