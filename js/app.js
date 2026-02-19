// ================= WORKZONE =================
let DB_JATIM = new Set();
let DB_BALNUS = new Set();

// SIMPAN DATA CSV ASLI
let ALL_DATA = [];
let CRA_RESULT = [];

// FILTER STATUS AKTIF
let ACTIVE_STATUSES = [];

//ambil dari data google sheet
let PIC_DB = {};

//ambil untuk resume cra DM 
let DISTRICT_DB = {};

// DISTRICT_DB[witel] = district;

window.DISTRICT_DB = {};
window.CRA_RESULT = [];



let currentData = []; // Data setelah filter + search




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

//penambahan pic mention 
async function loadPICMapping() {
  const url = "LINK_CSV_GOOGLE_SHEET_PIC_KAMU";

  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    lines.shift(); // buang header

    lines.forEach(line => {
      const cols = line.split(",");
      const witel = cols[0]?.trim().toUpperCase();
      const pic = cols[1]?.trim();

      if (witel) PIC_DB[witel] = pic;
    });

  } catch (err) {
    console.error("Gagal load PIC mapping:", err);
  }
}

// fungsion load untuk resume cra tabel 
// ================= LOAD DISTRICT MAPPING DARI GOOGLE SHEETS =================
// ================= LOAD DISTRICT MAPPING DARI GOOGLE SHEETS =================
async function loadDistrictMapping() {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT730gBi8fU16gEo6ZmE3d5MQw5Xh2isbMeoI4SM-BfyP2uK8sL85skV70jW83vdXJAuhPF0JxS3OS7/pub?output=csv";

  try {
    const res = await fetch(url);
    const text = await res.text();
    
    // Hapus BOM dan split per baris
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    
    // RESET database
    window.DISTRICT_DB = {};
    
    // Untuk tracking district yang unik
    const uniqueDistricts = new Set();
    
    lines.forEach((line, index) => {
      // Format: DISTRICT,WITEL (2 kolom)
      const [district, witel] = line.split(',').map(s => s.trim().toUpperCase());
      
      if (district && witel && district !== "DISTRICT" && witel !== "WITEL") {
        // Simpan district unik
        uniqueDistricts.add(district);
        
        // Simpan mapping: WITEL -> DISTRICT
        window.DISTRICT_DB[witel] = district;
        
        // Simpan juga tanpa spasi
        window.DISTRICT_DB[witel.replace(/\s+/g, '')] = district;
        
        // Untuk kode singkat (SBY, MLG, dll)
        if (witel.length <= 5 && !witel.includes(' ')) {
          window.DISTRICT_DB[witel] = district;
        }
        
        // Mapping untuk kata-kata yang mirip
        if (witel.includes(' ')) {
          const parts = witel.split(' ');
          parts.forEach(part => {
            if (part.length >= 3) {
              window.DISTRICT_DB[part] = district;
            }
          });
        }
      }
    });
    
    // Simpan daftar district unik ke global variable
    window.UNIQUE_DISTRICTS = Array.from(uniqueDistricts).sort();
    
    console.log("✅ DISTRICT_DB loaded:", Object.keys(window.DISTRICT_DB).length, "entries");
    console.log("✅ Unique districts:", window.UNIQUE_DISTRICTS);
    console.log("Sample mappings:", Object.entries(window.DISTRICT_DB).slice(0, 10));
    
  } catch (err) {
    console.error("❌ Gagal load district:", err);
    // Fallback dengan 10 district yang diinginkan
    loadDistrictMappingFallback();
  }
}

// Fallback mapping dengan 10 district utama
function loadDistrictMappingFallback() {
  console.log("📋 Using fallback district mapping with 10 districts");
  
  // 10 district utama
  const districts = [
    "DENPASAR", "FLORES", "KUPANG", "MATARAM", "JEMBER",
    "LAMONGAN", "MADIUN", "MALANG", "SIDOARJO", "SURABAYA"
  ];
  
  window.UNIQUE_DISTRICTS = districts;
  window.DISTRICT_DB = {};
  
  // Mapping manual untuk setiap district
  const fallbackMapping = {
    // SURABAYA
    "SBY": "SURABAYA",
    "SURABAYA": "SURABAYA",
    "SURABAYA SELATAN": "SURABAYA",
    "SURABAYA UTARA": "SURABAYA",
    "SURABAYA TIMUR": "SURABAYA",
    "SURABAYA BARAT": "SURABAYA",
    "SURABAYA PUSAT": "SURABAYA",
    "MADURA": "SURABAYA",
    "BANGKALAN": "SURABAYA",
    "SAMPANG": "SURABAYA",
    "PAMEKASAN": "SURABAYA",
    "SUMENEP": "SURABAYA",
    
    // MALANG
    "MLG": "MALANG",
    "MALANG": "MALANG",
    "BATU": "MALANG",
    "BLITAR": "MALANG",
    "TULUNGAGUNG": "MALANG",
    
    // SIDOARJO
    "SDA": "SIDOARJO",
    "SIDOARJO": "SIDOARJO",
    "MOJOKERTO": "SIDOARJO",
    "PASURUAN": "SIDOARJO",
    "JOMBANG": "SIDOARJO",
    
    // JEMBER
    "JBR": "JEMBER",
    "JEMBER": "JEMBER",
    "BANYUWANGI": "JEMBER",
    "BONDOWOSO": "JEMBER",
    "SITUBONDO": "JEMBER",
    "LUMAJANG": "JEMBER",
    "PROBOLINGGO": "JEMBER",
    
    // MADIUN
    "MDN": "MADIUN",
    "MADIUN": "MADIUN",
    "KEDIRI": "MADIUN",
    "NGANJUK": "MADIUN",
    "MAGETAN": "MADIUN",
    "NGAWI": "MADIUN",
    "PACITAN": "MADIUN",
    "PONOROGO": "MADIUN",
    "TRENGGALEK": "MADIUN",
    
    // LAMONGAN
    "LMG": "LAMONGAN",
    "LAMONGAN": "LAMONGAN",
    "GRESIK": "LAMONGAN",
    "BOJONEGORO": "LAMONGAN",
    "TUBAN": "LAMONGAN",
    
    // DENPASAR
    "DPS": "DENPASAR",
    "DENPASAR": "DENPASAR",
    "BADUNG": "DENPASAR",
    "GIANYAR": "DENPASAR",
    "TABANAN": "DENPASAR",
    "BANGLI": "DENPASAR",
    "KARANGASEM": "DENPASAR",
    
    // FLORES
    "FLORES": "FLORES",
    "ENDE": "FLORES",
    "MAUMERE": "FLORES",
    "LABUAN BAJO": "FLORES",
    
    // KUPANG
    "KUPANG": "KUPANG",
    "TIMOR": "KUPANG",
    "SUMBA": "KUPANG",
    
    // MATARAM
    "MATARAM": "MATARAM",
    "LOMBOK": "MATARAM",
    "SUMBAWA": "MATARAM",
    "BIMA": "MATARAM"
  };
  
  window.DISTRICT_DB = fallbackMapping;
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
    //LAMA 
	//ALL_DATA = parseCSV(reader.result);
    //renderData(ALL_DATA);
	
	// BARU 
	ALL_DATA = parseCSV(reader.result);
	applyFilters();
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
		  card.innerHTML = `<b>${noJ++}. ${row["INCIDENT"] || '-'}</b><br>${summary}<br><b>Update :</b> ${update}`;
		  jatimBox.appendChild(card);
		} 
		else if (DB_BALNUS.has(zone)) {
		  card.innerHTML = `<b>${noB++}. ${row["INCIDENT"] || '-'}</b><br>${summary}<br><b>Update :</b> ${update}`;
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

	// BADGE STATUS
	renderStatusBadges(data);
	
  if (!jatimBox.children.length) jatimBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
  if (!balnusBox.children.length) balnusBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
}

const STATUS_LIST = [
  'New',
  'Draft',
  'Analysis',
  'Pending',
  'Backend',
  'FinalCheck',
  'Resolved',
  'Mediacare',
  'Salamsim',
  'Closed'
];
// === fungsi baru multiselect 
function renderStatusFilter() {
  const box = document.getElementById('statusFilterBox');
  if (!box) return;

  box.innerHTML = '';

  STATUS_LIST.forEach(status => {
    const label = document.createElement('label');
    label.style.marginRight = '10px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = status;

    checkbox.addEventListener('change', () => {
      ACTIVE_STATUSES = Array.from(
        box.querySelectorAll('input[type="checkbox"]:checked')
      ).map(cb => cb.value);

      applyFilters();
    });

    label.appendChild(checkbox);
    label.append(` ${status}`);
    box.appendChild(label);
  });
}

//function handleCSVUpload(parsed) {
//  allData = parsed;
//  filteredData = parsed;
//  renderTable(filteredData);
//}

function handleCSVUpload(rows) {
  allData = rows;
  currentData = rows;

  renderTable(currentData);
}


function applyFilters() {
  let data = [...ALL_DATA];

  // FILTER STATUS
  if (ACTIVE_STATUSES.length > 0) {
    data = data.filter(row =>
      ACTIVE_STATUSES
        .map(s => s.toUpperCase())
        .includes((row['STATUS'] || '').toUpperCase())
    );
  }

  // FILTER SEARCH INCIDENT
  const keyword = document.getElementById("searchInput")?.value.trim();
  if (keyword) {
    const incList = keyword
      .split(',')
      .map(i => i.trim().toUpperCase())
      .filter(Boolean);

    data = data.filter(row =>
      incList.includes((row["INCIDENT"] || "").toUpperCase())
    );
  }

  // 🔥🔥🔥 INI KUNCI UTAMA
  currentData = data;

  renderData(currentData);
}




// ================= EXPORT LAPORAN GAMAS DM =================
// Fungsi baru untuk export LAPORAN GAMAS DM (menggantikan exportExcel)
function exportLaporanGamasDM(data) {
  console.log("Data received:", data.length); // Debug
  
  // Filter data yang relevan (FEEDER, DISTRIBUSI, ODP)
  const filteredData = data.filter(row => {
    const summary = (row["SUMMARY"] || "").toUpperCase();
    return summary.includes("FEEDER") || summary.includes("DISTRIBUSI") || summary.includes("ODP");
  });

  console.log("Filtered data:", filteredData.length); // Debug

  if (filteredData.length === 0) {
    alert("Tidak ada data FEEDER, DISTRIBUSI, atau ODP dalam file ini.");
    return;
  }

  // Kelompokkan berdasarkan jenis
  const feeder = [];
  const distribusi = [];
  const odp = [];

  filteredData.forEach(row => {
    const summary = (row["SUMMARY"] || "").toUpperCase();
    
    if (summary.includes("FEEDER")) {
      feeder.push(row);
    } else if (summary.includes("DISTRIBUSI")) {
      distribusi.push(row);
    } else if (summary.includes("ODP")) {
      odp.push(row);
    }
  });

  // Buat teks output
  let output = "F. GAMAS FEEDER, DISTRIBUSI, ODP : \n\n";

  // Bagian FEEDER
  output += `- FEEDER : ${feeder.length} Tiket\n`;
  if (feeder.length > 0) {
    feeder.forEach((row, idx) => {
      output += formatGamasRow(row, idx + 1);
    });
  } else {
    output += "  Nihil\n";
  }
  output += "\n";

  // Bagian DISTRIBUSI
  output += `- DISTRIBUSI : ${distribusi.length} Tiket\n`;
  if (distribusi.length > 0) {
    distribusi.forEach((row, idx) => {
      output += formatGamasRow(row, idx + 1);
    });
  } else {
    output += "  Nihil\n";
  }
  output += "\n";

  // Bagian ODP
  output += `- ODP : ${odp.length} Tiket\n`;
  if (odp.length > 0) {
    odp.forEach((row, idx) => {
      output += formatGamasRow(row, idx + 1);
    });
  } else {
    output += "  Nihil\n";
  }

  // Tampilkan di modal
  showGamasModal(output);
}

// Fungsi untuk memformat satu baris GAMAS
// Fungsi untuk memformat satu baris GAMAS
function formatGamasRow(row, index) {
  const incident = row["INCIDENT"] || "-";
  const summary = row["SUMMARY"] || "";
  const worklog = row["WORKLOG SUMMARY"] || "-";
  
  // Ambil TTR END TO END dari data
  const ttrEndToEnd = row["TTR END TO END"] || "00:00:00";
  
  // Parse summary untuk mendapatkan komponen
  // Format: [SQM GAMAS] | AKSES | FEEDER | TIF-3 | REG-5 | PENYEBAB | PERBAIKAN | ...
  const parts = summary.split('|').map(p => p.trim());
  
  // Ekstrak komponen dengan aman
  const sqmGamas = parts[0] || "[SQM GAMAS]";
  const akses = parts[1] || "AKSES";
  const jenis = parts[2] || "";
  const tif = parts[3] || "TIF-3";
  const reg5 = parts[4] || "REG-5";
  const penyebab = parts[5] || "";
  const perbaikan = parts[6] || "";
  const lokasiJenis = parts[7] || "";
  const lokasi = parts[8] || "";
  const estimasi = parts[9] || "";
  
  // Ambil ODC dari summary (format: [ODC-JBR-FL,ODC-JBR-FR,ODC-JBR-FQ])
  const odcMatch = summary.match(/\[(ODC[^\]]+)\]/);
  const odcList = odcMatch ? odcMatch[1] : "";
  
  // Ambil ODP dari summary (format: [ODP-JBR-FK/37, ODP-JBR-FK/35, ODP-JBR-FK/36])
  const odpMatches = summary.match(/\[(ODP[^\]]+)\]/g);
  const odpList = odpMatches && odpMatches.length > 0 ? odpMatches[0] : "";
  
  // Ambil PIC dari summary (format: (PIC NYOMAN ARNAWA +6285333627545))
  const picMatch = summary.match(/\(PIC ([^)]+)\)/);
  const pic = picMatch ? picMatch[1] : "";
  
  // Ambil Ibooster
  const iboosterMatch = summary.match(/(Ibooster[^\s]+)/);
  const ibooster = iboosterMatch ? iboosterMatch[1] : "";
  
  // Format duration dari TTR END TO END (format: HH:MM:SS)
  // Konversi ke format "X jam Y Menit"
  let durationFormatted = ttrEndToEnd;
  if (ttrEndToEnd && ttrEndToEnd !== "00:00:00") {
    const parts = ttrEndToEnd.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      
      if (hours > 0 && minutes > 0) {
        durationFormatted = `${hours} jam ${minutes} Menit`;
      } else if (hours > 0) {
        durationFormatted = `${hours} jam`;
      } else if (minutes > 0) {
        durationFormatted = `${minutes} Menit`;
      } else {
        durationFormatted = `${parts[2]} Detik`;
      }
    }
  }
  
  return (
  `${index}. ${incident} ${sqmGamas} | ${akses} | ${jenis} | ${tif} | ${reg5} | ${penyebab} | ${perbaikan} | ${lokasiJenis} | ${lokasi} | (${estimasi}) | [${odcList}] | Datek ODP Terdampak : [${odpList}] | (PIC ${pic}) | ${ibooster}\n` +
  `Update : ${worklog}\n` +
  `Duration downtime : ${durationFormatted}\n\n` +
  `Impacted Service :\n` +
  `NODEB : 0\n` +
  `BROADBAND : 0\n` +
  `EBIS : 0\n` +
  `WIFI : 0\n\n` +
  `Pelanggan Terganggu :\n` +
  `NODEB : 0\n` +
  `BROADBAND : 0\n` +
  `EBIS : 0\n` +
  `WIFI : 0\n\n`
);
}

// Fungsi untuk menampilkan modal GAMAS
function showGamasModal(text) {
  // Cek apakah modal sudah ada, jika belum buat baru
  let modal = document.getElementById("gamasModal");
  
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "gamasModal";
    modal.style.cssText = `
      display:none; 
      position:fixed; 
      inset:0; 
      background:rgba(0,0,0,0.5); 
      z-index:9999; 
      justify-content:center; 
      align-items:center;
    `;
    
    modal.innerHTML = `
      <div style="background:#fff; width:800px; max-width:95%; padding:20px; border-radius:8px; max-height:80vh; overflow-y:auto;">
        <h3 style="margin-top:0; color:#333;">LAPORAN GAMAS DM</h3>
        <textarea id="gamasText" style="width:100%; height:400px; margin-bottom:10px; resize:none; font-family:monospace; font-size:12px; padding:8px; border:1px solid #ccc; border-radius:4px;"></textarea>
        <div style="text-align:right; display:flex; gap:8px; justify-content:flex-end;">
          <button id="copyGamas" style="padding:8px 16px; background:#22c55e; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Copy</button>
          <button id="downloadGamas" style="padding:8px 16px; background:#3b82f6; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Download</button>
          <button id="closeGamas" style="padding:8px 16px; background:#ef4444; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById("copyGamas").addEventListener("click", () => {
      const textarea = document.getElementById("gamasText");
      navigator.clipboard.writeText(textarea.value);
      alert("Laporan berhasil di-copy!");
    });
    
    document.getElementById("downloadGamas").addEventListener("click", () => {
      const textarea = document.getElementById("gamasText");
      const blob = new Blob([textarea.value], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LAPORAN_GAMAS_DM_${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    
    document.getElementById("closeGamas").addEventListener("click", () => {
      modal.style.display = "none";
    });
  }
  
  // Isi text dan tampilkan modal
  document.getElementById("gamasText").value = text;
  modal.style.display = "flex";
}

// Ganti event listener exportExcel dengan fungsi baru
document.getElementById("exportExcel").addEventListener("click", () => {
  // Cek apakah ALL_DATA kosong (belum upload file)
  if (!ALL_DATA.length) {
    alert("Silahkan upload file CSV terlebih dahulu!");
    return;
  }

  // LANGSUNG EKSEKUSI dengan ALL_DATA, tanpa notifikasi atau confirm
  exportLaporanGamasDM(ALL_DATA);
});


//====== EXPORT K EXCEL 
function exportJatimBalnusExcel(data) {

  const headers = [
    "NO",
    "INCIDENT",
    "WORKZONE",
    "SUMMARY",
    "WORKLOGSUMMARY",
    "STATUS"
  ];

  const jatimZones = ["SDY","SBY","MLG","KDR","JBR","BWI","PBL","JBG"];
  const balnusZones = ["BJM","BDJ","PKY","SMR","TAR","PTK","MTP"];

  const isZone = (text, zones) =>
    zones.some(z => text?.toUpperCase().includes(z));

  const jatim = [];
  const balnus = [];

  data.forEach((row, i) => {
    const record = [
      jatim.length + 1,
      row.INCIDENT || "",
      row.WORKZONE || "",
      row.SUMMARY || "",
      row.WORKLOGSUMMARY || "",
      row.STATUS || ""
    ];

    if (isZone(row.WORKZONE, jatimZones)) {
      jatim.push(record);
    } 
    else if (isZone(row.WORKZONE, balnusZones)) {
      balnus.push(record);
    }
  });

  const wb = XLSX.utils.book_new();

  const wsJatim = XLSX.utils.aoa_to_sheet([headers, ...jatim]);
  const wsBalnus = XLSX.utils.aoa_to_sheet([headers, ...balnus]);

  XLSX.utils.book_append_sheet(wb, wsJatim, "JATIM");
  XLSX.utils.book_append_sheet(wb, wsBalnus, "BALNUS");

  XLSX.writeFile(wb, "LAPORAN_GAMAS_JATIM_BALNUS.xlsx");
}


//=== FUNGSI BARU FILTER BADGE COUNTER ===
function renderStatusBadges(data) {
  const box = document.getElementById('statusBadges');
  if (!box) return;

  box.innerHTML = '';

  STATUS_LIST.forEach(status => {
    const count = data.filter(row =>
      (row['STATUS'] || '').toUpperCase() === status.toUpperCase()
    ).length;

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = `${status} : ${count}`;

    box.appendChild(badge);
  });
}


// ================= SEARCH =================
//document.getElementById("btnSearch")?.addEventListener("click", () => {
//  const keyword = document.getElementById("searchInput").value.trim();
//
//  if (!keyword) {
//    renderData(ALL_DATA);
//    return;
//  }
//
//  const incList = keyword
//    .split(',')
//    .map(i => i.trim().toUpperCase())
//    .filter(Boolean);
//
//  const filtered = ALL_DATA.filter(row =>
//    incList.includes((row["INCIDENT"] || "").toUpperCase())
//  );
//
//  renderData(filtered);
//});

// ====== SEARCH BARU =========
document.getElementById("btnSearch")?.addEventListener("click", () => {
  applyFilters();
});




// ================= THEME =================
document.getElementById("themeToggle")?.addEventListener("click", () => {
  document.body.classList.toggle("light");
});


//  ==========FUNGSI FILTER ===========
function applyFilters() {
  let data = [...ALL_DATA];

  // FILTER STATUS (MULTI)
  if (ACTIVE_STATUSES.length > 0) {
    data = data.filter(row =>
      ACTIVE_STATUSES
        .map(s => s.toUpperCase())
        .includes((row['STATUS'] || '').toUpperCase())
    );
  }

  // FILTER SEARCH INCIDENT
  const keyword = document.getElementById("searchInput")?.value.trim();
  if (keyword) {
    const incList = keyword
      .split(',')
      .map(i => i.trim().toUpperCase())
      .filter(Boolean);

    data = data.filter(row =>
      incList.includes((row["INCIDENT"] || "").toUpperCase())
    );
  }

  renderData(data);
}



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
  return t
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
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
    .replace(/NODEB\s*:?\s*(\d+)/i, 'NODEB $1')
    .replace(/BROADBAND\s*:?\s*(\d+)/i, '\nBROADBAND $1')
    .replace(/EBIS\s*:?\s*(\d+)/i, '\nEBIS $1')
    .replace(/WIFI\s*:?\s*(\d+)/i, '\nWIFI $1')
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


function convertEskalasi(){
  convertTelegram();   // DATA B (ASLI)
  convertWhatsApp();   // WHATSAPP (BARU)
}

function extractROCName(raw){
  const m = raw.match(/Surveillance\s+ROC5\s*[-–]\s*([A-Za-z ]+?)(?:\*|\n|REPORT|$)/i);
  return m ? m[1].trim() : '-';
}


function convertTelegram() {
  const raw = cleanText(document.getElementById('eskInput').value);

  const result = `
Kepada : ${pickBetween(raw,'Kepada :','*Current status')}
Current status : ${pickBetween(raw,'Current status :','Nomor Tiket')}
Nomor Tiket : ${pickBetween(raw,'Nomor Tiket :','NE')}

NE: ${pickBetween(raw,'NE:','LOKASI')}
LOKASI : ${pickBetween(raw,'LOKASI :','Urgency')}
Urgency : ${pickBetween(raw,'Urgency :','Start Time')}

Start Time : ${pickBetween(raw,'Start Time :','End Time')}
End Time : ${pickBetween(raw,'End Time :','Duration Time')}
Duration Time : ${pickBetween(raw,'Duration Time :','Headline')}

Headline : ${pickBetween(raw,'Headline :','*Impacted Service')}

*Impacted Service* :
${formatMultiLineBlock(
  pickBetween(raw,'*Impacted Service* :','*Pelanggan Terganggu* :')
)}

*Pelanggan Terganggu* :
${formatMultiLineBlock(
  pickBetween(raw,'*Pelanggan Terganggu* :','Perangkat Terganggu')
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
${pickBetween(raw,'Eskalasi :','*Surveillance')}

Surveillance ROC5 - ${pickBetween(raw,' ROC5 -','*REPORT INTERNAL TELKOM')}

REPORT INTERNAL TELKOM
DILARANG DISEBARLUASKAN KE LUAR TELKOM

Contact Center:
Free Call : 0800-1-353000
TSEL : 0811-3081-500
`.trim();

  document.getElementById('eskOutput').value = result;
}

function extractCC(raw){
  const idx = raw.indexOf('CC :');
  if (idx === -1) return '-';

  let cc = raw.substring(idx + 4);

  // potong kalau ketemu pemutus
  cc = cc.split(/REPORT INTERNAL|Contact Center|Last update|Surveillance/i)[0];

  // bersihkan simbol & spasi
  cc = cc
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cc || '-';
}

function getLastUpdate(raw){
  const m = raw.match(/Last update\s*:\s*(.+)/i);
  return m ? `Last update : ${m[1].trim()}` : '';
}


// ======================= FUNGSI WHATSAAPP===============
function convertWhatsApp(){
  const rawFull = document.getElementById('eskInput').value;
  const raw = stripOldFooter(rawFull);
  const lokasi   = pickBetween(raw,'LOKASI :','Urgency');
  const start    = pickBetween(raw,'Start Time :','End Time');
  const durasi   = pickBetween(raw,'Duration Time :','Headline');
  const tiket    = pickBetween(raw,'Nomor Tiket :','NE');
  const pic      = pickBetween(raw,'PIC :','CC');

  const headline = pickBetween(raw,'Headline :','Impacted Service');

  const impactedService = formatMultiLineBlock(
    pickBetween(raw,'*Impacted Service* :','*Pelanggan Terganggu* :')
  );

  const pelanggan = formatMultiLineBlock(
    pickBetween(raw,'*Pelanggan Terganggu* :','Perangkat Terganggu')
  );

  const perangkat = pickBetween(raw,'Perangkat Terganggu :','Penyebab gangguan');
  const penyebab  = pickBetween(raw,'Penyebab gangguan:','Action');

  const ticketState = detectTicketState(raw);
  const lastAction  = getLastAction(raw);

  let progressLine = '';
  let closingLine  = '';

  if (ticketState === 'CLOSED') {
    progressLine = `sudah CLOSED setelah ${lastAction}`;
    closingLine  = `Demikian kami sampaikan, gangguan dengan tiket ${tiket} sudah CLOSED.`;
  } else {
    progressLine = `Progres sampai saat ini : ${lastAction}`;
    closingLine  = `Demikian kami sampaikan, gangguan dengan tiket ${tiket} masih dalam pengecekan.`;
  }

  const wa = `
Kepada : GM TA Bpk @,
Head Of Regional Jatim Balnus Bpk @

${buildWACriticalLine(raw)}
sejak ${start}
${progressLine}

DOWNTIME : ${durasi}

Headline :
${headline}

Impacted Service :
${impactedService}

Pelanggan Terganggu :
${pelanggan}

Perangkat Terganggu :
${perangkat}

Penyebab gangguan :
${penyebab}

PIC :
${pic}

${closingLine}

Terima kasih atas perhatiannya.

${formatWAFooter(raw)}
`.trim();

  document.getElementById('eskOutputWA').value = wa;
}



// esklasi wa pembaruan 
function buildWACriticalLine(raw){
  let cause = detectCauseFromHeadline(raw);

  // fallback ke isi teks
  if (!cause) {
    const upper = raw.toUpperCase();
    if (upper.includes('GPON')) cause = 'GPON DOWN';
    else if (upper.includes('FEEDER')) cause = 'FEEDER PUTUS';
    else cause = 'AKSES DOWN';
  }

  let lokasi = pickBetween(raw, 'LOKASI :', 'Urgency');
  if (!lokasi || lokasi === '-') {
    lokasi = pickBetween(raw, 'LOKASI :', 'Start Time');
  }
  if (!lokasi || lokasi === '-') lokasi = 'STO';

  return `Kami laporkan gangguan CRITICAL akibat ${cause} di STO ${lokasi}`;
}


// baru lagi 
function detectCauseFromHeadline(raw){
  const headline = pickBetween(raw, 'Headline :', 'Impacted Service').toUpperCase();

  if (!headline || headline === '-') return null;

  // deteksi sebelum TIF
  if (/FEEDER\s*\|?\s*TIF/i.test(headline)) return 'FEEDER PUTUS';
  if (/GPON\s*\|?\s*TIF/i.test(headline)) return 'GPON DOWN';

  // fallback simple
  if (headline.includes('FEEDER')) return 'FEEDER PUTUS';
  if (headline.includes('GPON')) return 'GPON DOWN';

  return null;
}

function detectTicketState(raw){
  const status = pickBetween(raw,'Current status :','Nomor Tiket').toUpperCase();

  if (status.includes('CLOSED')) return 'CLOSED';

  if (raw.toUpperCase().includes(' CLOSED')) return 'CLOSED';

  return 'UPDATE';
}

function getLastAction(raw){
  const actionBlock = pickBetween(raw,'Action :','PIC');
  if (!actionBlock || actionBlock === '-') return '-';

  // pecah berdasarkan WIB
  const parts = actionBlock.split(/\d{2}:\d{2}\sWIB\s*:/i)
    .map(p => p.trim())
    .filter(Boolean);

  // ambil progres terakhir
  let last = parts.length ? parts[parts.length - 1] : actionBlock;

  // bersihkan sisa jam kalau masih ada
  last = last.replace(/\d{2}:\d{2}\sWIB/gi, '').trim();

  return last;
}

function stripOldFooter(raw){
  const idx = raw.search(/Surveillance\s+ROC/i);
  if (idx === -1) return raw;
  return raw.substring(0, idx).trim();
}


function formatWAFooter(raw){
  const rocName = extractROCName(raw) || '-';

  return `
Surveillance ROC5 - ${rocName}

Eskalasi : HoD Bpk @

CC : EVP Teritory III Bpk @ , SM ROC DAN SM RAM, GM TA, MGR TA, MGR FBB, MGR AODM, MGR OM RAM

*REPORT INTERNAL TIDAK UNTUK DISEBARKAN KE PIHAK LUAR*

Contact Center:
Free Call : 0800-1-353000
TSEL : 0811-3081-500

${getLastUpdate(raw)}
`.trim();
}



function copyEskalasi() {
  const o = document.getElementById('eskOutput');
  o.select();
  document.execCommand('copy');
  alert('Data eskalasi berhasil di-copy');
}

function copyWA(){
  const o = document.getElementById('eskOutputWA');
  o.select();
  document.execCommand('copy');
  alert('Format WhatsApp berhasil di-copy');
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

// ============= render tabel CRA =============
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
	  <td>${row.kota}</td>
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
        kota: row['WITEL'] || row['KOTA'] || row['CITY'] || '',
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
	  
	   // 🔥 TAMBAH INI
  window.CRA_RESULT = CRA_RESULT;
  window.DISTRICT_DB = DISTRICT_DB;
  
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  reader.onload = () => {
    const text = reader.result;
    const data = parseCRACSV(text);
    processCRA(data);
    CRA_RESULT = CRA_DATA;
	 // 🔥 TAMBAH INI
  window.CRA_RESULT = CRA_RESULT;
  window.DISTRICT_DB = DISTRICT_DB;
  
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


// export bu amel 
document.getElementById("btnExportTXTAmel").addEventListener("click", function () {

  if (!CRA_RESULT || CRA_RESULT.length === 0) {
    alert("Data CRA belum diupload.");
    return;
  }

  let hasil = [];

// ===== HITUNG SUMMARY =====
let total = CRA_RESULT.length;

let onSchedule = CRA_RESULT.filter(r => r.status === "ON SCHEDULE").length;
let cancel = CRA_RESULT.filter(r => r.status === "CANCEL").length;
let belumDiisi = CRA_RESULT.filter(r => r.status === "BELUM DIISI").length;

// Header Summary
hasil.push(
`KEGIATAN CRA MALAM INI : ${total} KEGIATAN

ON SCHEDULE : ${onSchedule}
CANCEL : ${cancel}
BELUM DIISI : ${belumDiisi}
TOTAL : ${total}

`
);

console.log(CRA_RESULT[0])
  CRA_RESULT.forEach((row, index) => {

    let noCraFull = row.noCRA || "";
    let noCra = noCraFull.split("/")[0].trim();

    let judul = row.deskripsi || "";
	let region = (row.kota || "").toUpperCase();
	let pic = PIC_DB[region] || "";
    // lokasi kamu berupa array
    let lokasi = Array.isArray(row.lokasi)
      ? row.lokasi.join(", ")
      : (row.lokasi || "");

    let text =
`${index + 1}. ${noCra}
KEGIATAN : ${judul}
REGION : ${region}
LOKASI : ${lokasi}
PIC : ${pic}

`;

    hasil.push(text);
  });

  const blob = new Blob([hasil.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "EXPORT_TXT_PERMINTAAN_BU_AMEL.txt";
  a.click();

  URL.revokeObjectURL(url);
});


//button resume cra
//button resume cra
document.getElementById("btnResumeCRA").addEventListener("click", () => {
  if (!CRA_RESULT.length) {
    alert("Data CRA kosong.");
    return;
  }

  console.log("CRA_RESULT sample:", CRA_RESULT[0]);

  // ========== INISIALISASI 10 DISTRICT UTAMA ==========
  const mainDistricts = [
    "DENPASAR", "FLORES", "KUPANG", "MATARAM", "JEMBER",
    "LAMONGAN", "MADIUN", "MALANG", "SIDOARJO", "SURABAYA"
  ];
  
  // Inisialisasi resume dengan nilai 0 untuk semua district
  let resume = {};
  mainDistricts.forEach(district => {
    resume[district] = {
      total: 0,
      on: 0,
      belum: 0,
      cancel: 0
    };
  });
  
  // Tambahkan UNMAPPED
  resume["UNMAPPED"] = {
    total: 0,
    on: 0,
    belum: 0,
    cancel: 0
  };

  // ========== MAPPING MANUAL LENGKAP ==========
  const manualMapping = {
    // SURABAYA (termasuk Madura)
    "SBY": "SURABAYA",
    "SURABAYA": "SURABAYA",
    "SURABAYA SELATAN": "SURABAYA",
    "SURABAYA UTARA": "SURABAYA",
    "SURABAYA TIMUR": "SURABAYA",
    "SURABAYA BARAT": "SURABAYA",
    "SURABAYA PUSAT": "SURABAYA",
    "MADURA": "SURABAYA",
    "BANGKALAN": "SURABAYA",
    "SAMPANG": "SURABAYA",
    "PAMEKASAN": "SURABAYA",
    "SUMENEP": "SURABAYA",
    
    // MALANG
    "MLG": "MALANG",
    "MALANG": "MALANG",
    "BATU": "MALANG",
    "BLITAR": "MALANG",
    "TULUNGAGUNG": "MALANG",
    
    // SIDOARJO
    "SDA": "SIDOARJO",
    "SIDOARJO": "SIDOARJO",
    "MOJOKERTO": "SIDOARJO",
    "PASURUAN": "SIDOARJO",
    "JOMBANG": "SIDOARJO",
    
    // JEMBER
    "JBR": "JEMBER",
    "JEMBER": "JEMBER",
    "BANYUWANGI": "JEMBER",
    "BONDOWOSO": "JEMBER",
    "SITUBONDO": "JEMBER",
    "LUMAJANG": "JEMBER",
    "PROBOLINGGO": "JEMBER",
    
    // MADIUN
    "MDN": "MADIUN",
    "MADIUN": "MADIUN",
    "KEDIRI": "MADIUN",
    "NGANJUK": "MADIUN",
    "MAGETAN": "MADIUN",
    "NGAWI": "MADIUN",
    "PACITAN": "MADIUN",
    "PONOROGO": "MADIUN",
    "TRENGGALEK": "MADIUN",
    
    // LAMONGAN
    "LMG": "LAMONGAN",
    "LAMONGAN": "LAMONGAN",
    "GRESIK": "LAMONGAN",
    "BOJONEGORO": "LAMONGAN",
    "TUBAN": "LAMONGAN",
    
    // DENPASAR (BALI)
    "DPS": "DENPASAR",
    "DENPASAR": "DENPASAR",
    "BADUNG": "DENPASAR",
    "GIANYAR": "DENPASAR",
    "TABANAN": "DENPASAR",
    "BANGLI": "DENPASAR",
    "KARANGASEM": "DENPASAR",
    "KLUNGKUNG": "DENPASAR",
    "UBUD": "DENPASAR",
    "KUTA": "DENPASAR",
    "NUSA DUA": "DENPASAR",
    "SANUR": "DENPASAR",
    "SEMINYAK": "DENPASAR",
    "BALI": "DENPASAR",
    
    // FLORES
    "FLORES": "FLORES",
    "ENDE": "FLORES",
    "MAUMERE": "FLORES",
    "LARANTUKA": "FLORES",
    "LABUAN BAJO": "FLORES",
    "RUTENG": "FLORES",
    "BAJAWA": "FLORES",
    
    // KUPANG (TIMOR)
    "KUPANG": "KUPANG",
    "TIMOR": "KUPANG",
    "SUMBA": "KUPANG",
    "ROTE": "KUPANG",
    "ATAMBUA": "KUPANG",
    "KEFAMENANU": "KUPANG",
    "SOE": "KUPANG",
    "WAIKABUBAK": "KUPANG",
    "WAINGAPU": "KUPANG",
    "NTT": "KUPANG",
    
    // MATARAM (LOMBOK)
    "MATARAM": "MATARAM",
    "LOMBOK": "MATARAM",
    "SUMBAWA": "MATARAM",
    "BIMA": "MATARAM",
    "PRAYA": "MATARAM",
    "SELONG": "MATARAM",
    "NTB": "MATARAM",
  };

  let totalAll = 0;
  let totalOn = 0;
  let totalBelum = 0;
  let totalCancel = 0;

  // Proses setiap baris CRA
  CRA_RESULT.forEach((row, index) => {
    // Ambil witel/kota dari berbagai field
    let witelRaw = (row.kota || row.witel || row.WITEL || row.KOTA || row.CITY || row.LOKASI || "").toString().trim();
    
    // Bersihkan
    let witel = witelRaw
      .toUpperCase()
      .replace(/[^\w\s\/-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // ========== CARI DISTRICT ==========
    let district = "UNMAPPED";
    
    // 1. Cek manual mapping
    if (manualMapping[witel]) {
      district = manualMapping[witel];
    }
    // 2. Cek per kata
    else {
      const words = witel.split(/[\s\/,-]+/);
      for (let word of words) {
        if (word.length >= 2 && manualMapping[word]) {
          district = manualMapping[word];
          break;
        }
      }
    }
    
    // 3. Deteksi khusus
    if (district === "UNMAPPED") {
      if (witel.includes("DPS") || witel.includes("BALI") || witel.includes("DENPASAR")) {
        district = "DENPASAR";
      }
      else if (witel.includes("FLORES") || witel.includes("ENDE") || witel.includes("MAUMERE")) {
        district = "FLORES";
      }
      else if (witel.includes("KUPANG") || witel.includes("TIMOR") || witel.includes("SUMBA")) {
        district = "KUPANG";
      }
      else if (witel.includes("MATARAM") || witel.includes("LOMBOK") || witel.includes("NTB")) {
        district = "MATARAM";
      }
      else if (witel.includes("LAMONGAN") || witel.includes("GRESIK") || witel.includes("TUBAN")) {
        district = "LAMONGAN";
      }
      else if (witel.includes("MADIUN") || witel.includes("KEDIRI") || witel.includes("NGANJUK")) {
        district = "MADIUN";
      }
    }

    // Pastikan district ada di resume
    if (!resume[district]) {
      resume[district] = {
        total: 0,
        on: 0,
        belum: 0,
        cancel: 0
      };
    }

    // Update statistik
    resume[district].total++;
    totalAll++;

    if (row.status === "ON SCHEDULE") {
      resume[district].on++;
      totalOn++;
    } else if (row.status === "BELUM DIISI" || !row.status || row.status === "") {
      resume[district].belum++;
      totalBelum++;
    } else {
      resume[district].cancel++;
      totalCancel++;
    }
  });

// ========== BUAT TEKS RESUME ==========
let text = "Resume CRA\n";
text += "[Jumlah CRA | On Schedule | Belum Diisi | NOK/Cancel]\n\n";

let index = 1;

// PAKAI mainDistricts YANG SUDAH ADA (dari inisialisasi)
// Urutan tampilan sesuai keinginan
const displayOrder = [
  "SURABAYA", "MALANG", "SIDOARJO", "JEMBER", "MADIUN",
  "LAMONGAN", "DENPASAR", "FLORES", "KUPANG", "MATARAM"
];

// Tampilkan 10 district sesuai urutan, meskipun totalnya 0
displayOrder.forEach(district => {
  if (resume[district]) {
    let d = resume[district];
    text += `${index}. District ${district} : [ ${d.total} | ${d.on} | ${d.belum} | ${d.cancel} ]\n`;
    index++;
  }
});

// UNMAPPED TIDAK DITAMPILKAN
text += `\nTotal : [ ${totalAll} | ${totalOn} | ${totalBelum} | ${totalCancel} ]`;

// Tampilkan di modal
const textarea = document.getElementById("resumeText");
const modal = document.getElementById("resumeModal");

if (textarea && modal) {
  textarea.value = text;
  modal.style.display = "flex";
}

});

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {

  loadWorkzones();
  loadPICMapping();
  loadDistrictMapping();
  renderStatusFilter();

  const eskInput = document.getElementById('eskInput');
  if (eskInput) {
    eskInput.addEventListener('input', () => {
      if (eskInput.value.trim().length > 10) {
        convertEskalasi();
      }
    });
  }

  // Resume Modal
  document.getElementById("copyResume")?.addEventListener("click", () => {
    const textarea = document.getElementById("resumeText");
    if (!textarea) return;
    navigator.clipboard.writeText(textarea.value);
    alert("Resume berhasil di-copy!");
  });

  document.getElementById("closeResume")?.addEventListener("click", () => {
    document.getElementById("resumeModal").style.display = "none";
  });

  document.getElementById('btnCopy')?.addEventListener('click', copyEskalasi);
  document.getElementById('btnExportCRA')?.addEventListener('click', exportCRAtoExcel);
  document.getElementById('btnExportTXT')?.addEventListener('click', exportCRAtoTXT);

});
