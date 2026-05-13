// ================= WORKZONE =================
let DB_JATIM = new Set();
let DB_BALNUS = new Set();
let DB_REG4 = new Set();

// SIMPAN DATA CSV ASLI
let ALL_DATA = [];
let CRA_RESULT = [];

// FILTER STATUS AKTIF
let ACTIVE_STATUSES = [];

// ambil dari data google sheet
let PIC_DB = {};

// ambil untuk resume cra DM 
let DISTRICT_DB = {};

window.DISTRICT_DB = {};
window.CRA_RESULT = [];

let currentData = [];

// ================= FUNGSI KONVERSI DURASI =================
function formatDurasi(ttrEndToEnd) {
    if (!ttrEndToEnd || ttrEndToEnd === '' || ttrEndToEnd === '00:00:00') return '-';
    
    const parts = ttrEndToEnd.split(':');
    if (parts.length === 3) {
        const jam = parseInt(parts[0]);
        const menit = parseInt(parts[1]);
        
        if (jam > 0 && menit > 0) {
            return `${jam} Jam ${menit} Menit`;
        } else if (jam > 0) {
            return `${jam} Jam`;
        } else if (menit > 0) {
            return `${menit} Menit`;
        }
        return `${jam} Jam ${menit} Menit`;
    }
    return ttrEndToEnd;
}

// ================= LOAD WORKZONES =================
async function loadWorkzones() {
    console.log("🟢 loadWorkzones() DIPANGGIL");
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1zzLfkuctrLA3dvesis1ZJi1-eC8eIQy_h0OV8K5nI6f2dPcOc2g9NC5NUAgQer7i-iM6mqTE_KQv/pub?output=csv';
    
    try {
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        
        DB_JATIM.clear();
        DB_BALNUS.clear();
        DB_REG4.clear();
        
        lines.forEach(line => {
            const cols = line.split(',').map(s => s.trim().toUpperCase());
            const jatim = cols[0];
            const balnus = cols[1];
            const reg4 = cols[2];
            
            if (jatim && jatim !== "DB_JATIM") DB_JATIM.add(jatim);
            if (balnus && balnus !== "DB_BALNUS") DB_BALNUS.add(balnus);
            if (reg4 && reg4 !== "REG_4") DB_REG4.add(reg4);
        });
        
        console.log("✅ Workzone loaded:", { 
            JATIM: DB_JATIM.size, 
            BALNUS: DB_BALNUS.size,
            REG_4: DB_REG4.size 
        });
    } catch (err) {
        console.error('Gagal load workzones:', err);
    }
}

// ================= LOAD PIC MAPPING =================
async function loadPICMapping() {
    const url = "LINK_CSV_GOOGLE_SHEET_PIC_KAMU";

    try {
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        lines.shift();

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

// ================= LOAD DISTRICT MAPPING =================
async function loadDistrictMapping() {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT730gBi8fU16gEo6ZmE3d5MQw5Xh2isbMeoI4SM-BfyP2uK8sL85skV70jW83vdXJAuhPF0JxS3OS7/pub?output=csv";

    try {
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        
        window.DISTRICT_DB = {};
        const uniqueDistricts = new Set();
        
        lines.forEach((line) => {
            const [district, witel] = line.split(',').map(s => s.trim().toUpperCase());
            
            if (district && witel && district !== "DISTRICT" && witel !== "WITEL") {
                uniqueDistricts.add(district);
                window.DISTRICT_DB[witel] = district;
                window.DISTRICT_DB[witel.replace(/\s+/g, '')] = district;
                
                if (witel.length <= 5 && !witel.includes(' ')) {
                    window.DISTRICT_DB[witel] = district;
                }
                
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
        
        window.UNIQUE_DISTRICTS = Array.from(uniqueDistricts).sort();
        console.log("✅ DISTRICT_DB loaded:", Object.keys(window.DISTRICT_DB).length, "entries");
    } catch (err) {
        console.error("❌ Gagal load district:", err);
        loadDistrictMappingFallback();
    }
}

function loadDistrictMappingFallback() {
    console.log("📋 Using fallback district mapping");
    const districts = [
        "DENPASAR", "FLORES", "KUPANG", "MATARAM", "JEMBER",
        "LAMONGAN", "MADIUN", "MALANG", "SIDOARJO", "SURABAYA"
    ];
    
    window.UNIQUE_DISTRICTS = districts;
    window.DISTRICT_DB = {};
    
    const fallbackMapping = {
        "SBY": "SURABAYA", "SURABAYA": "SURABAYA", "SURABAYA SELATAN": "SURABAYA",
        "SURABAYA UTARA": "SURABAYA", "SURABAYA TIMUR": "SURABAYA", "SURABAYA BARAT": "SURABAYA",
        "SURABAYA PUSAT": "SURABAYA", "MADURA": "SURABAYA", "BANGKALAN": "SURABAYA",
        "SAMPANG": "SURABAYA", "PAMEKASAN": "SURABAYA", "SUMENEP": "SURABAYA",
        "MLG": "MALANG", "MALANG": "MALANG", "BATU": "MALANG", "BLITAR": "MALANG",
        "TULUNGAGUNG": "MALANG", "SDA": "SIDOARJO", "SIDOARJO": "SIDOARJO",
        "MOJOKERTO": "SIDOARJO", "PASURUAN": "SIDOARJO", "JOMBANG": "SIDOARJO",
        "JBR": "JEMBER", "JEMBER": "JEMBER", "BANYUWANGI": "JEMBER",
        "BONDOWOSO": "JEMBER", "SITUBONDO": "JEMBER", "LUMAJANG": "JEMBER",
        "PROBOLINGGO": "JEMBER", "MDN": "MADIUN", "MADIUN": "MADIUN",
        "KEDIRI": "MADIUN", "NGANJUK": "MADIUN", "MAGETAN": "MADIUN",
        "NGAWI": "MADIUN", "PACITAN": "MADIUN", "PONOROGO": "MADIUN",
        "TRENGGALEK": "MADIUN", "LMG": "LAMONGAN", "LAMONGAN": "LAMONGAN",
        "GRESIK": "LAMONGAN", "BOJONEGORO": "LAMONGAN", "TUBAN": "LAMONGAN",
        "DPS": "DENPASAR", "DENPASAR": "DENPASAR", "BADUNG": "DENPASAR",
        "GIANYAR": "DENPASAR", "TABANAN": "DENPASAR", "BANGLI": "DENPASAR",
        "KARANGASEM": "DENPASAR", "KUTA": "DENPASAR", "NUSA DUA": "DENPASAR",
        "SANUR": "DENPASAR", "SEMINYAK": "DENPASAR", "BALI": "DENPASAR",
        "FLORES": "FLORES", "ENDE": "FLORES", "MAUMERE": "FLORES", "LABUAN BAJO": "FLORES",
        "KUPANG": "KUPANG", "TIMOR": "KUPANG", "SUMBA": "KUPANG", "NTT": "KUPANG",
        "MATARAM": "MATARAM", "LOMBOK": "MATARAM", "SUMBAWA": "MATARAM", "BIMA": "MATARAM", "NTB": "MATARAM"
    };
    
    window.DISTRICT_DB = fallbackMapping;
}

// ================= CSV PARSER =================
function parseCSV(text) {
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
        applyFilters();
    };
    reader.readAsText(file);
});

// ================= RENDER DATA =================
function renderData(data) {
    console.log("🟢 renderData() DIPANGGIL, data length:", data.length);
    const jatimBox = document.querySelector("#jatim .content");
    const balnusBox = document.querySelector("#balnus .content");
    const reg4Box = document.querySelector("#reg4 .content");
    
    jatimBox.innerHTML = "";
    balnusBox.innerHTML = "";
    if (reg4Box) reg4Box.innerHTML = "";

    let total = 0;
    let bb = 0, ip = 0;
    let d = 0, f = 0, g = 0;
    let odc = 0, odp = 0;
    let noJ = 1, noB = 1, noReg4 = 1;

    data.forEach(row => {
        const summary = row["SUMMARY"] || "";
        const update = row["WORKLOG SUMMARY"] || "-";
        const zone = (row["WORKZONE"] || "").toUpperCase();
        const ttr = row["TTR END TO END"] || "";
        const durasiFormatted = formatDurasi(ttr);
        
        total++;

        if (summary.includes("(REPAIR) TRA T3") || summary.includes("(RECOVERY) TRA T3")) bb++;
        if (summary.includes("(REPAIR) IP T3") || summary.includes("(RECOVERY) IP T3")) ip++;
        if (summary.includes("DISTRIBUSI")) d++;
        if (summary.includes("FEEDER")) f++;
        if (summary.includes("GPON")) g++;
        if (summary.includes("ODC")) odc++;
        if (summary.includes("ODP")) odp++;

        const card = document.createElement("div");
        card.className = "card";
        const cardContent = `${summary}<br><b>Update :</b> ${update}<br><b>⏱️ Durasi :</b> ${durasiFormatted}`;
        
        if (summary.includes("GAMAS R4") || summary.toUpperCase().includes("GAMAS R4")) {
            card.innerHTML = `<b>${noReg4++}. ${row["INCIDENT"] || '-'}</b><br>${cardContent}`;
            if (reg4Box) reg4Box.appendChild(card);
        } else if (DB_REG4.has(zone)) {
            card.innerHTML = `<b>${noReg4++}. ${row["INCIDENT"] || '-'}</b><br>${cardContent}`;
            if (reg4Box) reg4Box.appendChild(card);
        } else if (DB_JATIM.has(zone)) {
            card.innerHTML = `<b>${noJ++}. ${row["INCIDENT"] || '-'}</b><br>${cardContent}`;
            jatimBox.appendChild(card);
        } else if (DB_BALNUS.has(zone)) {
            card.innerHTML = `<b>${noB++}. ${row["INCIDENT"] || '-'}</b><br>${cardContent}`;
            balnusBox.appendChild(card);
        }
    });

    document.getElementById("totalCount").textContent = `TOTAL : ${total}`;
    document.getElementById("bbCount").textContent = `BB : ${bb}`;
    document.getElementById("ipCount").textContent = `IP : ${ip}`;
    document.getElementById("gponCount").textContent = `GPON : ${g}`;
    document.getElementById("feederCount").textContent = `FEEDER : ${f}`;
    document.getElementById("distriCount").textContent = `DISTRIBUSI : ${d}`;

    renderStatusBadges(data);
    
    if (!jatimBox.children.length) jatimBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
    if (!balnusBox.children.length) balnusBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
    if (reg4Box && !reg4Box.children.length) reg4Box.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
}

const STATUS_LIST = ['New', 'Draft', 'Analysis', 'Pending', 'Backend', 'FinalCheck', 'Resolved', 'Mediacare', 'Salamsim', 'Closed'];

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
            ACTIVE_STATUSES = Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            applyFilters();
        });

        label.appendChild(checkbox);
        label.append(` ${status}`);
        box.appendChild(label);
    });
}

function applyFilters() {
    let data = [...ALL_DATA];

    if (ACTIVE_STATUSES.length > 0) {
        data = data.filter(row => ACTIVE_STATUSES.map(s => s.toUpperCase()).includes((row['STATUS'] || '').toUpperCase()));
    }

    const keyword = document.getElementById("searchInput")?.value.trim();
    if (keyword) {
        const incList = keyword.split(',').map(i => i.trim().toUpperCase()).filter(Boolean);
        data = data.filter(row => incList.includes((row["INCIDENT"] || "").toUpperCase()));
    }

    currentData = data;
    renderData(currentData);
}

// ================= EXPORT LAPORAN GAMAS DM =================
function exportLaporanGamasDM(data) {
    console.log("Data received:", data.length);
    
    const filteredData = data.filter(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        return summary.includes("FEEDER") || summary.includes("DISTRIBUSI") || summary.includes("ODP");
    });

    if (filteredData.length === 0) {
        alert("Tidak ada data FEEDER, DISTRIBUSI, atau ODP dalam file ini.");
        return;
    }

    const feeder = [];
    const distribusi = [];
    const odp = [];

    filteredData.forEach(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        if (summary.includes("FEEDER")) feeder.push(row);
        else if (summary.includes("DISTRIBUSI")) distribusi.push(row);
        else if (summary.includes("ODP")) odp.push(row);
    });

    let output = "F. GAMAS FEEDER, DISTRIBUSI, ODP : \n\n";
    output += `- FEEDER : ${feeder.length} Tiket\n`;
    if (feeder.length > 0) feeder.forEach((row, idx) => output += formatGamasRow(row, idx + 1));
    else output += "  Nihil\n";
    output += "\n";
    
    output += `- DISTRIBUSI : ${distribusi.length} Tiket\n`;
    if (distribusi.length > 0) distribusi.forEach((row, idx) => output += formatGamasRow(row, idx + 1));
    else output += "  Nihil\n";
    output += "\n";
    
    output += `- ODP : ${odp.length} Tiket\n`;
    if (odp.length > 0) odp.forEach((row, idx) => output += formatGamasRow(row, idx + 1));
    else output += "  Nihil\n";

    showGamasModal(output);
}

function formatGamasRow(row, index) {
    const incident = row["INCIDENT"] || "-";
    const summary = row["SUMMARY"] || "";
    const worklog = row["WORKLOG SUMMARY"] || "-";
    const ttrEndToEnd = row["TTR END TO END"] || "00:00:00";
    
    const parts = summary.split('|').map(p => p.trim());
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
    
    const odcMatch = summary.match(/\[(ODC[^\]]+)\]/);
    const odcList = odcMatch ? odcMatch[1] : "";
    const odpMatches = summary.match(/\[(ODP[^\]]+)\]/g);
    const odpList = odpMatches && odpMatches.length > 0 ? odpMatches[0] : "";
    const picMatch = summary.match(/\(PIC ([^)]+)\)/);
    const pic = picMatch ? picMatch[1] : "";
    const iboosterMatch = summary.match(/(Ibooster[^\s]+)/);
    const ibooster = iboosterMatch ? iboosterMatch[1] : "";
    
    let durationFormatted = ttrEndToEnd;
    if (ttrEndToEnd && ttrEndToEnd !== "00:00:00") {
        const parts = ttrEndToEnd.split(':');
        if (parts.length === 3) {
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            if (hours > 0 && minutes > 0) durationFormatted = `${hours} jam ${minutes} Menit`;
            else if (hours > 0) durationFormatted = `${hours} jam`;
            else if (minutes > 0) durationFormatted = `${minutes} Menit`;
            else durationFormatted = `${parts[2]} Detik`;
        }
    }
    
    return `${index}. ${incident} ${sqmGamas} | ${akses} | ${jenis} | ${tif} | ${reg5} | ${penyebab} | ${perbaikan} | ${lokasiJenis} | ${lokasi} | (${estimasi}) | [${odcList}] | Datek ODP Terdampak : [${odpList}] | (PIC ${pic}) | ${ibooster}\n` +
        `Update : ${worklog}\n` +
        `Duration downtime : ${durationFormatted}\n\n` +
        `Impacted Service :\nNODEB : 0\nBROADBAND : 0\nEBIS : 0\nWIFI : 0\n\n` +
        `Pelanggan Terganggu :\nNODEB : 0\nBROADBAND : 0\nEBIS : 0\nWIFI : 0\n\n`;
}

function showGamasModal(text) {
    let modal = document.getElementById("gamasModal");
    
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "gamasModal";
        modal.style.cssText = `display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 900px; max-height: 80vh; z-index: 9999;`;
        modal.innerHTML = `<div style="background: white; border-radius: 20px; padding: 25px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #e2e8f0; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0; font-size:24px; background:linear-gradient(135deg,#2563eb,#7c3aed); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">LAPORAN GAMAS DM</h3>
                <button id="closeGamasTop" style="background:none; border:none; font-size:28px; cursor:pointer; color:#64748b;">&times;</button>
            </div>
            <textarea id="gamasText" style="width:100%; height:400px; margin-bottom:20px; resize:none; font-family:monospace; font-size:13px; padding:15px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;"></textarea>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="copyGamas" style="padding:10px 20px; background:#22c55e; color:white; border:none; border-radius:10px; cursor:pointer;">📋 Copy</button>
                <button id="downloadGamas" style="padding:10px 20px; background:#3b82f6; color:white; border:none; border-radius:10px; cursor:pointer;">📥 Download</button>
                <button id="closeGamas" style="padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:10px; cursor:pointer;">✕ Close</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        
        const overlay = document.createElement("div");
        overlay.id = "gamasOverlay";
        overlay.style.cssText = `display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 9998;`;
        document.body.appendChild(overlay);
        
        document.getElementById("copyGamas").addEventListener("click", () => {
            navigator.clipboard.writeText(document.getElementById("gamasText").value);
            alert("Laporan berhasil di-copy!");
        });
        document.getElementById("downloadGamas").addEventListener("click", () => {
            const text = document.getElementById("gamasText").value;
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `LAPORAN_GAMAS_DM_${new Date().toISOString().slice(0,10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        const closeModal = () => {
            modal.style.display = "none";
            overlay.style.display = "none";
        };
        document.getElementById("closeGamas").addEventListener("click", closeModal);
        document.getElementById("closeGamasTop").addEventListener("click", closeModal);
        overlay.addEventListener("click", closeModal);
    }
    
    document.getElementById("gamasText").value = text;
    modal.style.display = "block";
    document.getElementById("gamasOverlay").style.display = "block";
}

document.getElementById("exportExcel")?.addEventListener("click", () => {
    if (!ALL_DATA.length) { 
        alert("Silahkan upload file CSV terlebih dahulu!"); 
        return; 
    }
    exportLaporanGamasDM(ALL_DATA);
});

function exportJatimBalnusExcel(data) {
    const headers = ["NO", "INCIDENT", "WORKZONE", "SUMMARY", "WORKLOGSUMMARY", "STATUS"];
    const jatimZones = ["SDY","SBY","MLG","KDR","JBR","BWI","PBL","JBG"];
    const balnusZones = ["BJM","BDJ","PKY","SMR","TAR","PTK","MTP"];
    const isZone = (text, zones) => zones.some(z => text?.toUpperCase().includes(z));
    const jatim = [], balnus = [];
    
    data.forEach((row) => {
        const record = [jatim.length + 1, row.INCIDENT || "", row.WORKZONE || "", row.SUMMARY || "", row.WORKLOGSUMMARY || "", row.STATUS || ""];
        if (isZone(row.WORKZONE, jatimZones)) jatim.push(record);
        else if (isZone(row.WORKZONE, balnusZones)) balnus.push(record);
    });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...jatim]), "JATIM");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...balnus]), "BALNUS");
    XLSX.writeFile(wb, "LAPORAN_GAMAS_JATIM_BALNUS.xlsx");
}

function renderStatusBadges(data) {
    const box = document.getElementById('statusBadges');
    if (!box) return;
    box.innerHTML = '';
    
    STATUS_LIST.forEach(status => {
        const count = data.filter(row => (row['STATUS'] || '').toUpperCase() === status.toUpperCase()).length;
        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.textContent = `${status} : ${count}`;
        box.appendChild(badge);
    });
}

document.getElementById("btnSearch")?.addEventListener("click", () => applyFilters());
document.getElementById("themeToggle")?.addEventListener("click", () => document.body.classList.toggle("light"));

function copyColumn(type) {
    const box = document.querySelector(`#${type} .content`);
    if (!box || !box.children.length) { 
        alert('Tidak ada data untuk di-copy'); 
        return; 
    }
    
    let text = '';
    box.querySelectorAll('.card').forEach(card => { 
        text += card.innerText.trim() + '\n\n'; 
    });
    navigator.clipboard.writeText(text.trim()).then(() => alert(`Data ${type.toUpperCase()} berhasil di-copy`));
}

// ================= GAMAS CONVERTER =================
function parseGamasTelegram(text) {
    let data = { datek: '-', sto: '-', witel: '-', penyebab: '-', estimasi: '4', slot: '-', pic: '-', odp: [] };
    
    const stoMatch = text.match(/STO\s*:?\s*([^\n]+)/i);
    if (stoMatch) data.sto = stoMatch[1].trim();
    
    const datekMatch = text.match(/Datek\s*:?\s*([^\n]+)/i);
    if (datekMatch) data.datek = datekMatch[1].trim();
    
    const penyebabMatch = text.match(/Penyebab\s*:?\s*([^\n]+)/i);
    if (penyebabMatch) data.penyebab = penyebabMatch[1].trim();
    
    const estimasiMatch = text.match(/Estimasi\s*:?\s*(\d+)/i);
    if (estimasiMatch) data.estimasi = estimasiMatch[1];
    
    const slotMatch = text.match(/Slot.*?port.*?(GPON[^\n]+)/i);
    if (slotMatch) data.slot = slotMatch[1].trim();
    
    const picMatch = text.match(/\(([^)]*(?:PAK|pak|Pic|PIC|pic)[^)]*)\)/i);
    if (picMatch) {
        data.pic = picMatch[1].trim();
    } else {
        const namaMatch = text.match(/Nama\s*\/\s*NIK\s*pelapor\s*:?\s*([^\n]+)/i);
        if (namaMatch) {
            let picText = namaMatch[1].trim();
            if (picText.includes('/')) picText = picText.split('/')[1]?.trim() || picText.split('/')[0]?.trim();
            data.pic = picText;
        }
    }
    
    const odpRegex = /(ODP-[^\s,]+)/g;
    let match;
    while ((match = odpRegex.exec(text)) !== null) data.odp.push(match[1]);
    
    const jam = parseInt(data.estimasi) || 4;
    const estTime = new Date();
    estTime.setHours(estTime.getHours() + jam);
    const estStr = `${estTime.getDate().toString().padStart(2,'0')}/${(estTime.getMonth()+1).toString().padStart(2,'0')}/${estTime.getFullYear()} ${estTime.getHours().toString().padStart(2,'0')}:00`;
    
    return `GAMAS | AKSES | DISTRIBUSI | TIF-3 | REG-5 | ${data.penyebab} | PERBAIKAN | ${data.datek} | ${data.sto} | (EST ${estStr}) | ${data.slot} | (${data.pic})`;
}

function autoConvertGamas() {
    const input = document.getElementById('telegramData');
    const result = document.getElementById('telegramResult');
    const statusSpan = document.getElementById('statusIndicator');
    
    if (!input || !result) return;
    
    const text = input.value.trim();
    if (!text) {
        result.innerHTML = '✨ Hasil format akan muncul di sini...';
        if(statusSpan) statusSpan.innerHTML = '⏳ Menunggu input...';
        return;
    }
    
    if(statusSpan) statusSpan.innerHTML = '⚡ Memproses...';
    
    try {
        result.innerHTML = parseGamasTelegram(text);
        result.style.background = '#ffffff';
        if(statusSpan) statusSpan.innerHTML = '✅ Selesai!';
    } catch(e) {
        result.innerHTML = `❌ Error: ${e.message}`;
        if(statusSpan) statusSpan.innerHTML = '❌ Error';
    }
}

function copyResult() {
    const result = document.getElementById('telegramResult');
    if (!result) return;
    
    const text = result.innerText;
    if (text.includes('✨') || text.includes('❌')) { 
        alert('Belum ada hasil yang bisa di-copy!'); 
        return; 
    }
    
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Hasil tersalin!');
        result.style.background = '#f0fff0';
        setTimeout(() => result.style.background = '#ffffff', 200);
    }).catch(() => alert('❌ Gagal menyalin'));
}

function clearInput() {
    document.getElementById('telegramData').value = '';
    document.getElementById('telegramResult').innerHTML = '✨ Hasil format akan muncul di sini...';
    document.getElementById('statusIndicator').innerHTML = '⏳ Menunggu input...';
}

// ================= ESKALASI =================
function cleanText(t) { 
    return t.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim(); 
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
    return text.replace(/NODEB\s*:?\s*(\d+)/i, 'NODEB $1')
               .replace(/BROADBAND\s*:?\s*(\d+)/i, '\nBROADBAND $1')
               .replace(/EBIS\s*:?\s*(\d+)/i, '\nEBIS $1')
               .replace(/WIFI\s*:?\s*(\d+)/i, '\nWIFI $1').trim(); 
}

function cleanCC(text) { 
    return text.split('Surveillance')[0].split('REPORT INTERNAL')[0].split('Contact Center')[0].trim(); 
}

function formatAction(text) { 
    return text.replace(/(\d{2}:\d{2}\sWIB\s:)/g, '\n$1').trim(); 
}

function convertEskalasi() { 
    convertTelegram(); 
    convertWhatsApp(); 
}

function extractROCName(raw) { 
    const m = raw.match(/Surveillance\s+ROC5\s*[-–]\s*([A-Za-z ]+?)(?:\*|\n|REPORT|$)/i); 
    return m ? m[1].trim() : '-'; 
}

function convertTelegram() {
    const raw = cleanText(document.getElementById('eskInput').value);
    const result = `Kepada : ${pickBetween(raw,'Kepada :','*Current status')}
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
${formatMultiLineBlock(pickBetween(raw,'*Impacted Service* :','*Pelanggan Terganggu* :'))}

*Pelanggan Terganggu* :
${formatMultiLineBlock(pickBetween(raw,'*Pelanggan Terganggu* :','Perangkat Terganggu'))}

Perangkat Terganggu : ${pickBetween(raw,'Perangkat Terganggu :','Penyebab gangguan')}

Penyebab gangguan: ${pickBetween(raw,'Penyebab gangguan:','Action')}

Action : ${formatAction(pickBetween(raw,'Action :','PIC'))}

PIC : ${pickBetween(raw,'PIC :','CC')}

CC : ${cleanCC(pickBetween(raw,'CC :','Surveillance'))}

Eskalasi : ${pickBetween(raw,'Eskalasi :','*Surveillance')}

Surveillance ROC5 - ${pickBetween(raw,' ROC5 -','*REPORT INTERNAL TELKOM')}

REPORT INTERNAL TELKOM
DILARANG DISEBARLUASKAN KE LUAR TELKOM

Contact Center:
Free Call : 0800-1-353000
TSEL : 0811-3081-500`.trim();
    document.getElementById('eskOutput').value = result;
}

function extractCC(raw) { 
    const idx = raw.indexOf('CC :'); 
    if (idx === -1) return '-'; 
    let cc = raw.substring(idx + 4); 
    cc = cc.split(/REPORT INTERNAL|Contact Center|Last update|Surveillance/i)[0]; 
    return cc.replace(/\*/g, '').replace(/\s+/g, ' ').trim() || '-'; 
}

function getLastUpdate(raw) { 
    const m = raw.match(/Last update\s*:\s*(.+)/i); 
    return m ? `Last update : ${m[1].trim()}` : ''; 
}

function convertWhatsApp() {
    const rawFull = document.getElementById('eskInput').value;
    const raw = stripOldFooter(rawFull);
    const start = pickBetween(raw,'Start Time :','End Time');
    const durasi = pickBetween(raw,'Duration Time :','Headline');
    const tiket = pickBetween(raw,'Nomor Tiket :','NE');
    const pic = pickBetween(raw,'PIC :','CC');
    const headline = pickBetween(raw,'Headline :','Impacted Service');
    const impactedService = formatMultiLineBlock(pickBetween(raw,'*Impacted Service* :','*Pelanggan Terganggu* :'));
    const pelanggan = formatMultiLineBlock(pickBetween(raw,'*Pelanggan Terganggu* :','Perangkat Terganggu'));
    const perangkat = pickBetween(raw,'Perangkat Terganggu :','Penyebab gangguan');
    const penyebab = pickBetween(raw,'Penyebab gangguan:','Action');
    const ticketState = detectTicketState(raw);
    const lastAction = getLastAction(raw);
    
    let progressLine = ticketState === 'CLOSED' ? `sudah CLOSED setelah ${lastAction}` : `Progres sampai saat ini : ${lastAction}`;
    let closingLine = ticketState === 'CLOSED' ? `Demikian kami sampaikan, gangguan dengan tiket ${tiket} sudah CLOSED.` : `Demikian kami sampaikan, gangguan dengan tiket ${tiket} masih dalam pengecekan.`;
    
    const wa = `Kepada : GM TA Bpk @,
Head Of Regional Jatim Balnus Bpk @

${buildWACriticalLine(raw)} sejak ${start}
${progressLine}

DOWNTIME : ${durasi}

Headline : ${headline}

Impacted Service : ${impactedService}

Pelanggan Terganggu : ${pelanggan}

Perangkat Terganggu : ${perangkat}

Penyebab gangguan : ${penyebab}

PIC : ${pic}

${closingLine}

Terima kasih atas perhatiannya.

${formatWAFooter(raw)}`.trim();
    document.getElementById('eskOutputWA').value = wa;
}

function buildWACriticalLine(raw) {
    let cause = detectCauseFromHeadline(raw);
    if (!cause) { 
        const upper = raw.toUpperCase(); 
        cause = upper.includes('GPON') ? 'GPON DOWN' : (upper.includes('FEEDER') ? 'FEEDER PUTUS' : 'AKSES DOWN'); 
    }
    
    let lokasi = pickBetween(raw, 'LOKASI :', 'Urgency');
    if (!lokasi || lokasi === '-') lokasi = pickBetween(raw, 'LOKASI :', 'Start Time');
    if (!lokasi || lokasi === '-') lokasi = 'STO';
    
    return `Kami laporkan gangguan CRITICAL akibat ${cause} di STO ${lokasi}`;
}

function detectCauseFromHeadline(raw) { 
    const headline = pickBetween(raw, 'Headline :', 'Impacted Service').toUpperCase(); 
    if (!headline || headline === '-') return null; 
    if (headline.includes('FEEDER')) return 'FEEDER PUTUS'; 
    if (headline.includes('GPON')) return 'GPON DOWN'; 
    return null; 
}

function detectTicketState(raw) { 
    const status = pickBetween(raw,'Current status :','Nomor Tiket').toUpperCase(); 
    if (status.includes('CLOSED')) return 'CLOSED'; 
    if (raw.toUpperCase().includes(' CLOSED')) return 'CLOSED'; 
    return 'UPDATE'; 
}

function getLastAction(raw) { 
    const actionBlock = pickBetween(raw,'Action :','PIC'); 
    if (!actionBlock || actionBlock === '-') return '-'; 
    const parts = actionBlock.split(/\d{2}:\d{2}\sWIB\s*:/i).map(p => p.trim()).filter(Boolean); 
    let last = parts.length ? parts[parts.length - 1] : actionBlock; 
    return last.replace(/\d{2}:\d{2}\sWIB/gi, '').trim(); 
}

function stripOldFooter(raw) { 
    const idx = raw.search(/Surveillance\s+ROC/i); 
    if (idx === -1) return raw; 
    return raw.substring(0, idx).trim(); 
}

function formatWAFooter(raw) { 
    const rocName = extractROCName(raw) || '-'; 
    return `Surveillance ROC5 - ${rocName}\n\nEskalasi : HoD Bpk @\n\nCC : EVP Teritory III Bpk @ , SM ROC DAN SM RAM, GM TA, MGR TA, MGR FBB, MGR AODM, MGR OM RAM\n\n*REPORT INTERNAL TIDAK UNTUK DISEBARKAN KE PIHAK LUAR*\n\nContact Center:\nFree Call : 0800-1-353000\nTSEL : 0811-3081-500\n\n${getLastUpdate(raw)}`.trim(); 
}

function copyEskalasi() { 
    const o = document.getElementById('eskOutput'); 
    o.select(); 
    document.execCommand('copy'); 
    alert('Data eskalasi berhasil di-copy'); 
}

function copyWA() { 
    const o = document.getElementById('eskOutputWA'); 
    o.select(); 
    document.execCommand('copy'); 
    alert('Format WhatsApp berhasil di-copy'); 
}

// ================= CRA MODULE =================
let CRA_DATA = [];

function getStatusClass(val) { 
    if (val === 'ON SCHEDULE') return 'on'; 
    if (val === 'CANCEL') return 'cancel'; 
    return 'wait'; 
}

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

function getCRANumber(noCRA = '') { 
    const m = noCRA.match(/CRA\.(\d+)/i); 
    return m ? m[1] : null; 
}

function renderCRA(data) {
    const tbody = document.querySelector('#craTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data.length) { 
        tbody.innerHTML = `<tr><td colspan="10" class="empty">Data CRA tidak ditemukan</td></tr>`; 
        return; 
    }
    
    const processedKeys = new Set();
    const priorityData = data.filter(row => { 
        const reg = (row.regional || '').toUpperCase(); 
        const key = row.noCRA; 
        if (reg.includes('REG 5') || reg.includes('ALL REG')) { 
            if (!processedKeys.has(key)) { 
                processedKeys.add(key); 
                return true; 
            } 
        } 
        return false; 
    });
    
    const reg4Data = data.filter(row => { 
        const reg = (row.regional || '').toUpperCase(); 
        const key = row.noCRA; 
        if (reg.includes('REG 4') && !processedKeys.has(key)) { 
            processedKeys.add(key); 
            return true; 
        } 
        return false; 
    });
    
    const sortedData = [...priorityData, ...reg4Data];
    let no = 1;
    
    sortedData.forEach(row => { 
        if (!row.status) row.status = 'BELUM DIISI'; 
        
        const tr = document.createElement('tr'); 
        tr.innerHTML = `
            <td>${no++}</td>
            <td><select class="cra-status ${getStatusClass(row.status)}">
                <option ${row.status === 'ON SCHEDULE' ? 'selected' : ''}>ON SCHEDULE</option>
                <option ${row.status === 'BELUM DIISI' ? 'selected' : ''}>BELUM DIISI</option>
                <option ${row.status === 'CANCEL' ? 'selected' : ''}>CANCEL</option>
            </select></td>
            <td>${row.noCRA || ''}</td>
            <td>${row.deskripsi || ''}</td>
            <td>${row.lokasi ? row.lokasi.join(', ') : ''}</td>
            <td>${row.kota || ''}</td>
            <td>${row.regional || ''}</td>
            <td>${row.pic || ''}</td>
            <td>${row.tanggal || ''}</td>
            <td>${row.waktu || ''}</td>
            <td>${row.crq || ''}</td>
        `;
        
        tr.querySelector('select').addEventListener('change', e => { 
            row.status = e.target.value; 
            e.target.className = `cra-status ${getStatusClass(row.status)}`; 
        }); 
        
        tbody.appendChild(tr); 
    });
}

function formatExcelDate(v) { 
    if (!v) return ''; 
    if (v instanceof Date) return v.toISOString().split('T')[0]; 
    if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400 * 1000)).toISOString().split('T')[0]; 
    return v; 
}

function pickField(row, names = []) { 
    for (const key of Object.keys(row)) { 
        const clean = key.toUpperCase().replace(/\s+/g,' ').trim(); 
        for (const n of names) { 
            if (clean === n.toUpperCase()) return row[key]; 
        } 
    } 
    return ''; 
}

function processCRA(rawData) {
    const map = new Map();
    
    rawData.forEach(row => {
        const regional = (row['REGIONAL'] || '').toUpperCase();
        if (!regional.includes('REG 5') && !regional.includes('ALL REG') && !regional.includes('REG 4')) return;
        
        const noCRA = row['No CRA'] || row['NO CRA'] || '';
        const key = getCRANumber(noCRA);
        if (!key) return;
        
        const lokasiRaw = row['LOKASI'] || '';
        const lokasiArr = lokasiRaw.split(',').map(l => l.trim()).filter(Boolean);
        
        if (!map.has(key)) {
            map.set(key, { 
                noCRA, 
                deskripsi: row['JUDUL'] || row['DESKRIPSI'] || row['DESCRIPTION'] || '', 
                lokasi: [...lokasiArr], 
                regional: row['REGIONAL'] || '', 
                kota: row['WITEL'] || row['KOTA'] || row['CITY'] || '', 
                segment: row['SEGMENT'] || '', 
                pic: row['PIC'] || '', 
                tanggal: formatExcelDate(pickField(row, ['TGL_MULAI','TGL MULAI','TANGGAL','DATE'])), 
                waktu: pickField(row, ['WAKTU SETEMPAT','WAKTU','JAM','START-END','START - END']), 
                durasi: row['DURASI'] || '', 
                tipe: row['TIPE'] || '', 
                pelaksana: row['PELAKSANA'] || '', 
                metode: row['METODE'] || '', 
                crq: row['CRQ'] || '' 
            });
        } else { 
            const existing = map.get(key); 
            lokasiArr.forEach(l => { 
                if (!existing.lokasi.includes(l)) existing.lokasi.push(l); 
            }); 
        }
    });
    
    CRA_DATA = Array.from(map.values());
    updateCRACounter(CRA_DATA);
    renderCRA(CRA_DATA);
}

function updateCRACounter(data) {
    const reg5Count = data.filter(row => { 
        const reg = (row.regional || '').toUpperCase(); 
        return reg.includes('REG 5') || reg.includes('ALL REG'); 
    }).length;
    
    const reg4Count = data.filter(row => { 
        const reg = (row.regional || '').toUpperCase(); 
        return reg.includes('REG 4'); 
    }).length;
    
    const totalCount = data.length;
    const reg5El = document.getElementById('craReg5Count');
    const reg4El = document.getElementById('craReg4Count');
    const totalEl = document.getElementById('craTotalCount');
    
    if (reg5El) reg5El.textContent = reg5Count;
    if (reg4El) reg4El.textContent = reg4Count;
    if (totalEl) totalEl.textContent = totalCount;
}

function parseCRAExcel(arrayBuffer) { 
    const workbook = XLSX.read(arrayBuffer, { type: 'array' }); 
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; 
    return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true, cellDates: true }); 
}

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
            window.CRA_RESULT = CRA_RESULT; 
            window.DISTRICT_DB = DISTRICT_DB; 
        }; 
        reader.readAsArrayBuffer(file); 
        return; 
    }
    
    reader.onload = () => { 
        const data = parseCRACSV(reader.result); 
        processCRA(data); 
        CRA_RESULT = CRA_DATA; 
        window.CRA_RESULT = CRA_RESULT; 
        window.DISTRICT_DB = DISTRICT_DB; 
        updateCRACounter(CRA_DATA); 
    }; 
    reader.readAsText(file);
});

function statusWithIcon(status) { 
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

function exportCRAtoTXT() { 
    if (!CRA_DATA.length) { 
        alert('Data CRA kosong'); 
        return; 
    } 
    
    const total = CRA_DATA.length; 
    const count = { 'ON SCHEDULE': 0, 'CANCEL': 0, 'BELUM DIISI': 0 }; 
    
    CRA_DATA.forEach(r => { 
        const s = r.status || 'BELUM DIISI'; 
        count[s]++; 
    }); 
    
    let txt = `KEGIATAN CRA MALAM INI : ${total} KEGIATAN\n\n\nON SCHEDULE : ${count['ON SCHEDULE']}\nCANCEL : ${count['CANCEL']}\nBELUM DIISI : ${count['BELUM DIISI']}\nTOTAL : ${total}\n\n\n`; 
    
    CRA_DATA.forEach((row, i) => { 
        txt += `${i + 1}. ${statusWithIcon(row.status || 'BELUM DIISI')}\n${row.noCRA}\n${row.deskripsi}\nRegional : ${row.regional}\nTgl : ${row.tanggal} ${row.waktu}\nPIC : ${row.pic}\nCRQ : ${row.crq}\n\nLokasi : ${row.lokasi.join(', ')}\n\n\n--------------------------------------------------\n\n`; 
    }); 
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'CRA_MALAM_INI.txt'; 
    a.click(); 
    URL.revokeObjectURL(url); 
}

document.getElementById("btnExportTXTAmel")?.addEventListener("click", function() { 
    if (!CRA_RESULT || CRA_RESULT.length === 0) { 
        alert("Data CRA belum diupload."); 
        return; 
    } 
    
    let hasil = []; 
    let total = CRA_RESULT.length; 
    let onSchedule = CRA_RESULT.filter(r => r.status === "ON SCHEDULE").length; 
    let cancel = CRA_RESULT.filter(r => r.status === "CANCEL").length; 
    let belumDiisi = CRA_RESULT.filter(r => r.status === "BELUM DIISI").length; 
    
    hasil.push(`KEGIATAN CRA MALAM INI : ${total} KEGIATAN\n\nON SCHEDULE : ${onSchedule}\nCANCEL : ${cancel}\nBELUM DIISI : ${belumDiisi}\nTOTAL : ${total}\n\n`); 
    
    CRA_RESULT.forEach((row, index) => { 
        let noCraFull = row.noCRA || ""; 
        let noCra = noCraFull.split("/")[0].trim(); 
        let judul = row.deskripsi || ""; 
        let region = (row.kota || "").toUpperCase(); 
        let pic = PIC_DB[region] || ""; 
        let lokasi = Array.isArray(row.lokasi) ? row.lokasi.join(", ") : (row.lokasi || ""); 
        hasil.push(`${index + 1}. ${noCra}\nKEGIATAN : ${judul}\nREGION : ${region}\nLOKASI : ${lokasi}\nPIC : ${pic}\n\n`); 
    }); 
    
    const blob = new Blob([hasil.join("\n")], { type: "text/plain" }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = "EXPORT_TXT_PERMINTAAN_BU_AMEL.txt"; 
    a.click(); 
    URL.revokeObjectURL(url); 
});

// ================= BUTTON RESUME CRA =================
document.getElementById("btnResumeCRA").addEventListener("click", () => {
    if (!CRA_RESULT.length) { 
        alert("Data CRA kosong."); 
        return; 
    }
    
    const mainDistricts = ["DENPASAR", "FLORES", "KUPANG", "MATARAM", "JEMBER", "LAMONGAN", "MADIUN", "MALANG", "SIDOARJO", "SURABAYA", "PEKALONGAN", "YOGYAKARTA", "PURWOKERTO", "MAGELANG", "SEMARANG", "SURAKARTA"];
    let resume = {}; 
    
    mainDistricts.forEach(district => { 
        resume[district] = { total: 0, on: 0, belum: 0, cancel: 0 }; 
    }); 
    resume["UNMAPPED"] = { total: 0, on: 0, belum: 0, cancel: 0 };
    
    const manualMapping = { 
        "SBY": "SURABAYA", "SURABAYA": "SURABAYA", "SURABAYA SELATAN": "SURABAYA", "SURABAYA UTARA": "SURABAYA", "SURABAYA TIMUR": "SURABAYA", "SURABAYA BARAT": "SURABAYA", "SURABAYA PUSAT": "SURABAYA", "MADURA": "SURABAYA", "BANGKALAN": "SURABAYA", "SAMPANG": "SURABAYA", "PAMEKASAN": "SURABAYA", "SUMENEP": "SURABAYA", "MLG": "MALANG", "MALANG": "MALANG", "BATU": "MALANG", "BLITAR": "MALANG", "TULUNGAGUNG": "MALANG", "SDA": "SIDOARJO", "SIDOARJO": "SIDOARJO", "MOJOKERTO": "SIDOARJO", "PASURUAN": "SIDOARJO", "JOMBANG": "SIDOARJO", "JBR": "JEMBER", "JEMBER": "JEMBER", "BANYUWANGI": "JEMBER", "BONDOWOSO": "JEMBER", "SITUBONDO": "JEMBER", "LUMAJANG": "JEMBER", "PROBOLINGGO": "JEMBER", "MDN": "MADIUN", "MADIUN": "MADIUN", "KEDIRI": "MADIUN", "NGANJUK": "MADIUN", "MAGETAN": "MADIUN", "NGAWI": "MADIUN", "PACITAN": "MADIUN", "PONOROGO": "MADIUN", "TRENGGALEK": "MADIUN", "LMG": "LAMONGAN", "LAMONGAN": "LAMONGAN", "GRESIK": "LAMONGAN", "BOJONEGORO": "LAMONGAN", "TUBAN": "LAMONGAN", "DPS": "DENPASAR", "DENPASAR": "DENPASAR", "BADUNG": "DENPASAR", "GIANYAR": "DENPASAR", "TABANAN": "DENPASAR", "BANGLI": "DENPASAR", "KARANGASEM": "DENPASAR", "KLUNGKUNG": "DENPASAR", "UBUD": "DENPASAR", "SINGARAJA": "DENPASAR", "KUTA": "DENPASAR", "NUSA DUA": "DENPASAR", "SANUR": "DENPASAR", "SEMINYAK": "DENPASAR", "BALI": "DENPASAR", "FLORES": "FLORES", "ENDE": "FLORES", "MAUMERE": "FLORES", "LARANTUKA": "FLORES", "LABUAN BAJO": "FLORES", "RUTENG": "FLORES", "BAJAWA": "FLORES", "KUPANG": "KUPANG", "TIMOR": "KUPANG", "SUMBA": "KUPANG", "ROTE": "KUPANG", "ATAMBUA": "KUPANG", "KEFAMENANU": "KUPANG", "SOE": "KUPANG", "WAIKABUBAK": "KUPANG", "WAINGAPU": "KUPANG", "NTT": "KUPANG", "MATARAM": "MATARAM", "LOMBOK": "MATARAM", "SUMBAWA": "MATARAM", "BIMA": "MATARAM", "PRAYA": "MATARAM", "SELONG": "MATARAM", "NTB": "MATARAM", "PKL": "PEKALONGAN", "PEKALONGAN": "PEKALONGAN", "JOGJA": "YOGYAKARTA", "YOGYAKARTA": "YOGYAKARTA", "DIY": "YOGYAKARTA", "PWT": "PURWOKERTO", "PURWOKERTO": "PURWOKERTO", "BANYUMAS": "PURWOKERTO", "MAGELANG": "MAGELANG", "SMR": "SEMARANG", "SEMARANG": "SEMARANG", "JATENG": "SEMARANG", "SOLO": "SURAKARTA", "SURAKARTA": "SURAKARTA" 
    };
    
    let totalAll = 0, totalOn = 0, totalBelum = 0, totalCancel = 0;
    
    CRA_RESULT.forEach((row) => { 
        let witelRaw = (row.kota || row.witel || row.WITEL || row.KOTA || row.CITY || row.LOKASI || "").toString().trim(); 
        let witel = witelRaw.toUpperCase().replace(/[^\w\s\/-]/g, ' ').replace(/\s+/g, ' ').trim(); 
        let district = "UNMAPPED"; 
        
        if (manualMapping[witel]) { 
            district = manualMapping[witel]; 
        } else { 
            const words = witel.split(/[\s\/,-]+/); 
            for (let word of words) { 
                if (word.length >= 2 && manualMapping[word]) { 
                    district = manualMapping[word]; 
                    break; 
                } 
            } 
        } 
        
        if (district === "UNMAPPED") { 
            if (witel.includes("DPS") || witel.includes("BALI") || witel.includes("DENPASAR") || witel.includes("SINGARAJA")) { 
                district = "DENPASAR"; 
            } else if (witel.includes("FLORES") || witel.includes("ENDE") || witel.includes("MAUMERE")) { 
                district = "FLORES"; 
            } else if (witel.includes("KUPANG") || witel.includes("TIMOR") || witel.includes("SUMBA")) { 
                district = "KUPANG"; 
            } else if (witel.includes("MATARAM") || witel.includes("LOMBOK") || witel.includes("NTB")) { 
                district = "MATARAM"; 
            } else if (witel.includes("LAMONGAN") || witel.includes("GRESIK") || witel.includes("TUBAN")) { 
                district = "LAMONGAN"; 
            } else if (witel.includes("MADIUN") || witel.includes("KEDIRI") || witel.includes("NGANJUK")) { 
                district = "MADIUN"; 
            } else if (witel.includes("PEKALONGAN") || witel.includes("PKL") || witel.includes("TEGAL") || witel.includes("CIREBON")) { 
                district = "PEKALONGAN"; 
            } else if (witel.includes("YOGYAKARTA") || witel.includes("JOGJA") || witel.includes("DIY")) { 
                district = "YOGYAKARTA"; 
            } else if (witel.includes("PURWOKERTO") || witel.includes("PWT") || witel.includes("BANYUMAS")) { 
                district = "PURWOKERTO"; 
            } else if (witel.includes("MAGELANG")) { 
                district = "MAGELANG"; 
            } else if (witel.includes("SEMARANG") || witel.includes("SMR") || witel.includes("JATENG")) { 
                district = "SEMARANG"; 
            } else if (witel.includes("SURAKARTA") || witel.includes("SOLO")) { 
                district = "SURAKARTA"; 
            } 
        } 
        
        if (!resume[district]) resume[district] = { total: 0, on: 0, belum: 0, cancel: 0 }; 
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
    
    let text = "Resume CRA\n[Jumlah CRA | On Schedule | Belum Diisi | NOK/Cancel]\n\n";
    let index = 1;
    const displayOrder = ["SURABAYA", "MALANG", "SIDOARJO", "JEMBER", "MADIUN", "LAMONGAN", "DENPASAR", "FLORES", "KUPANG", "MATARAM", "PEKALONGAN", "YOGYAKARTA", "PURWOKERTO", "MAGELANG", "SEMARANG", "SURAKARTA"];
    
    displayOrder.forEach(district => { 
        if (resume[district]) { 
            let d = resume[district]; 
            text += `${index}. District ${district} : [ ${d.total} | ${d.on} | ${d.belum} | ${d.cancel} ]\n`; 
            index++; 
        } 
    });
    
    if (resume["UNMAPPED"] && resume["UNMAPPED"].total > 0) { 
        let d = resume["UNMAPPED"]; 
        text += `${index}. District UNMAPPED : [ ${d.total} | ${d.on} | ${d.belum} | ${d.cancel} ]\n`; 
    }
    
    text += `\nTotal : [ ${totalAll} | ${totalOn} | ${totalBelum} | ${totalCancel} ]`;
    showResumeModal(text);
});

function showResumeModal(text) {
    let oldModal = document.getElementById("resumeModalNew"); 
    if (oldModal) oldModal.remove();
    
    let oldOverlay = document.getElementById("resumeOverlay"); 
    if (oldOverlay) oldOverlay.remove();
    
    const overlay = document.createElement("div"); 
    overlay.id = "resumeOverlay"; 
    overlay.style.cssText = `display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 9998;`; 
    document.body.appendChild(overlay);
    
    const modal = document.createElement("div"); 
    modal.id = "resumeModalNew"; 
    modal.style.cssText = `display: block; position: fixed; top: 200px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 600px; max-height: 80vh; z-index: 9999;`;
    modal.innerHTML = `<div style="background: white; border-radius: 20px; padding: 25px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #e2e8f0; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin:0; font-size:24px; background:linear-gradient(135deg,#2563eb,#7c3aed); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Resume CRA</h3>
            <button id="closeResumeTop" style="background:none; border:none; font-size:28px; cursor:pointer; color:#64748b;">&times;</button>
        </div>
        <textarea id="resumeTextNew" style="width:100%; height:300px; margin-bottom:20px; resize:none; font-family:monospace; font-size:13px; padding:15px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;">${text}</textarea>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="copyResumeNew" style="padding:10px 20px; background:#22c55e; color:white; border:none; border-radius:10px; cursor:pointer;">📋 Copy</button>
            <button id="closeResumeNew" style="padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:10px; cursor:pointer;">✕ Close</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    
    document.getElementById("copyResumeNew").addEventListener("click", () => { 
        navigator.clipboard.writeText(document.getElementById("resumeTextNew").value); 
        alert("Resume berhasil di-copy!"); 
    });
    
    const closeModal = () => { 
        modal.remove(); 
        overlay.remove(); 
    };
    
    document.getElementById("closeResumeNew").addEventListener("click", closeModal);
    document.getElementById("closeResumeTop").addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
    loadWorkzones();
    loadPICMapping();
    loadDistrictMapping();
    renderStatusFilter();
    
    const eskInput = document.getElementById('eskInput');
    if (eskInput) { 
        eskInput.addEventListener('input', () => { 
            if (eskInput.value.trim().length > 10) convertEskalasi(); 
        }); 
    }
    
    document.getElementById('btnCopy')?.addEventListener('click', copyEskalasi);
    document.getElementById('btnExportCRA')?.addEventListener('click', exportCRAtoExcel);
    document.getElementById('btnExportTXT')?.addEventListener('click', exportCRAtoTXT);
});
