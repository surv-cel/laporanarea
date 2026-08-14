/* ================================================================
   FILE LENGKAP : js/app.js
   ----------------------------------------------------------------
   Yang BARU untuk fitur "last updated worklog" (dicari: "🆕 WL"):
   - renderData()      : ambil kolom "LAST UPDATE WORKLOG" dari CSV,
                          tampilkan di kartu JATIM & BALNUS + chip
                          last update di header section
   - copyColumn()      : pakai getCardCopyText() → baris Update WL
                          TIDAK ikut ke-copy
   - formatBalnusWithNOP() : sama, pakai getCardCopyText()
   - Fungsi baru       : formatWLTime, addWLLine, setHeaderWLTime,
                          getCardCopyText
   Semua fungsi lain (executive, eskalasi, converter, tera, CRA,
   search, filter, theme, NOP, dll) TIDAK diubah logikanya.
================================================================= */

// ================= WORKZONE =================
let DB_JATIM = new Set();
let DB_BALNUS = new Set();
let DB_REG4 = new Set();

// SIMPAN DATA CSV ASLI
let ALL_DATA = [];
let CRA_RESULT = [];
let ORIGINAL_CRA_DATA = [];  // 🆕 SIMPAN DATA CRA ASLI UNTUK FILTER
let CURRENT_CRA_DATA = [];   // 🆕 DATA YANG SEDANG DITAMPILKAN

// FILTER STATUS AKTIF
let ACTIVE_STATUSES = [];

// ambil dari data google sheet
let PIC_DB = {};

// ambil untuk resume cra DM 
let DISTRICT_DB = {};

window.DISTRICT_DB = {};
window.CRA_RESULT = [];

let currentData = [];

// ================= NOP DATABASE UNTUK BALNUS =================
let NOP_DB = {};  // Format: { "WORKZONE": "NOP" }

// ================= DATA STATIS UNTUK EXECUTIVE REPORT =================
const STATIC_REPORT_DATA = {
    cme: {
        headers: ["Sub District", "jmlSTO", "jmlLap", "OK", "NOK", "%Lap", "%OK"],
        rows: [
            ["DPS", 11, 11, 11, 0, 100, 100],
            ["JER", 30, 30, 30, 0, 100, 100],
            ["KD", 28, 28, 28, 0, 100, 100],
            ["ML", 24, 24, 24, 0, 100, 100],
            ["MN", 31, 31, 31, 0, 100, 100],
            ["MDR", 23, 23, 23, 0, 100, 100],
            ["NTB", 15, 15, 15, 0, 100, 100],
            ["NTT", 25, 25, 25, 0, 100, 100],
            ["PSN", 19, 19, 19, 0, 100, 100],
            ["SDA", 22, 22, 22, 0, 100, 100],
            ["SGR", 18, 18, 18, 0, 100, 100],
            ["SBS", 8, 8, 8, 0, 100, 100],
            ["SBU", 23, 23, 23, 0, 100, 100],
            ["TTL", 277, 277, 277, 0, 100, 100]
        ]
    },
    utilisasi: {
        tera: [
            "KBL - JT2 BE5 | 86.9%",
            "KBL - BTC BE15 | 59.2%",
            "KBL - RKT BE9 | 90.6%",
            "RKT - MTR BE29 | 78.2%",
            "RKT - KLM BE16 | 80.2%"
        ],
        lbcdn: [],
        pewag: [],
        gpongpon: "23 NODE"
    },
    banjir: {
        districtCount: 13,
        stoCount: 266,
        terdampak: 0
    },
    peService: {
        hsi: "Normal",
        transit: "Normal",
        vpn: "Normal"
    },
    osase: "Nihil",
    internet: "All Witel Normal",
    useetv: "All Witel Normal",
    voice: "All Witel Normal",
    gamasNetwork: "Nihil",
    bencanaAlam: "Nihil",
    eventPenting: "Nihil"
};

// ================= FUNGSI DETEKSI UNTUK EXECUTIVE REPORT =================
function detectNEAkses(data) {
    return data.filter(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        return summary.includes("GAMAS | AKSES | GPON") || 
               summary.includes("[SQM GAMAS] [GPON");
    });
}

function detectIPBackbone(data) {
    return data.filter(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        return summary.includes("(REPAIR) IP AREA 3") || 
               summary.includes("(RECOVERY) IP AREA 3");
    });
}

function detectTransportBackbone(data) {
    return data.filter(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        return summary.includes("(REPAIR) TRA AREA 3") || 
               summary.includes("(RECOVERY) TRA AREA 3");
    });
}

function detectFeeder(data) {
    return data.filter(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        return summary.includes("FEEDER");
    });
}

function detectDistribusi(data) {
    return data.filter(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        return summary.includes("DISTRIBUSI");
    });
}

function detectODP(data) {
    return data.filter(row => {
        const summary = (row["SUMMARY"] || "").toUpperCase();
        return summary.includes("ODP");
    });
}

// ================= UPDATE STATISTIK REGION =================
function updateRegionStats(data) {
    let jatimCount = 0;
    let balnusCount = 0;
    let reg4Count = 0;
    
    data.forEach(row => {
        const summary = row["SUMMARY"] || "";
        const zone = (row["WORKZONE"] || "").toUpperCase();
        
        // Prioritas REG 4 dari SUMMARY
        if (summary.includes("GAMAS R4") || summary.toUpperCase().includes("GAMAS R4")) {
            reg4Count++;
        }
        // Cek REG 4 dari WORKZONE
        else if (DB_REG4.has(zone)) {
            reg4Count++;
        }
        // Cek JATIM
        else if (DB_JATIM.has(zone)) {
            jatimCount++;
        }
        // Cek BALNUS
        else if (DB_BALNUS.has(zone)) {
            balnusCount++;
        }
    });
    
    document.getElementById("statJatim").textContent = jatimCount;
    document.getElementById("statBalnus").textContent = balnusCount;
    document.getElementById("statReg4").textContent = reg4Count;
    
    console.log(`📊 STATS - JATIM: ${jatimCount}, BALNUS: ${balnusCount}, REG4: ${reg4Count}`);
}

// ================= FORMAT TIKET UNTUK EXECUTIVE REPORT =================
function formatExecutiveTiket(row, index, type) {
    const incident = row["INCIDENT"] || "-";
    const summary = row["SUMMARY"] || "";
    const update = row["WORKLOG SUMMARY"] || "-";
    const ttr = row["TTR END TO END"] || "";
    const durasiFormatted = formatDurasi(ttr);
    
    let extraInfo = "";
    if (type === "NE_AKSES") {
        const iboosterMatch = summary.match(/(Ibooster[^\s]+)/);
        if (iboosterMatch) extraInfo = ` | ${iboosterMatch[1]}`;
    }
    
    return `${index}. ${incident}\n${summary}${extraInfo}\nUpdate : ${update}\n⏱️ Durasi Downtime: ${durasiFormatted}\n\n`;
}

function formatExecutiveGamasRow(row, index, type) {
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
        const timeParts = ttrEndToEnd.split(':');
        if (timeParts.length === 3) {
            const hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);
            if (hours > 0 && minutes > 0) durationFormatted = `${hours} jam ${minutes} Menit`;
            else if (hours > 0) durationFormatted = `${hours} jam`;
            else if (minutes > 0) durationFormatted = `${minutes} Menit`;
            else durationFormatted = `${timeParts[2]} Detik`;
        }
    }
    
    let result = `${index}. ${incident} | ${sqmGamas} | ${akses} | ${jenis} | ${tif} | ${reg5} | ${penyebab} | ${perbaikan} | ${lokasiJenis} | ${lokasi} | (${estimasi})`;
    if (odcList) result += ` | [${odcList}]`;
    if (odpList) result += ` | Datek ODP Terdampak : [${odpList}]`;
    if (pic) result += ` | (PIC ${pic})`;
    if (ibooster) result += ` | ${ibooster}`;
    
    result += `\nUpdate : ${worklog}\n⏱️ Durasi Downtime : ${durationFormatted}\n\n`;
    
    return result;
}

// ================= GENERATE EXECUTIVE REPORT =================
let currentExecutiveReport = "";

function generateExecutiveReport(shift) {
    if (!ALL_DATA.length) {
        alert("Silahkan upload file CSV terlebih dahulu!");
        return;
    }
    
    const now = new Date();
    const hari = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const jam = shift === 'PAGI' ? '09.00 WIB' : '21.00 WIB';
    
    const neAkses = detectNEAkses(ALL_DATA);
    const ipBackbone = detectIPBackbone(ALL_DATA);
    const transportBackbone = detectTransportBackbone(ALL_DATA);
    const feeder = detectFeeder(ALL_DATA);
    const distribusi = detectDistribusi(ALL_DATA);
    const odp = detectODP(ALL_DATA);
    
    const ipCount = ipBackbone.length;
    const transportCount = transportBackbone.length;
    const neCount = neAkses.length;
    const feederCount = feeder.length;
    const distribusiCount = distribusi.length;
    const odpCount = odp.length;
    
    let ipText = "Nihil";
    if (ipCount > 0) {
        ipText = `${ipCount} Tiket\n`;
        ipBackbone.forEach((row, idx) => {
            ipText += `${idx + 1}. ${row["INCIDENT"] || '-'}\n   ${row["SUMMARY"] || ''}\n   Update : ${row["WORKLOG SUMMARY"] || '-'}\n   ⏱️ Durasi : ${formatDurasi(row["TTR END TO END"] || '')}\n\n`;
        });
    }
    
    let transportText = "Nihil";
    if (transportCount > 0) {
        transportText = `${transportCount} Tiket\n`;
        transportBackbone.forEach((row, idx) => {
            transportText += `${idx + 1}. ${row["INCIDENT"] || '-'}\n   ${row["SUMMARY"] || ''}\n   Update : ${row["WORKLOG SUMMARY"] || '-'}\n   ⏱️ Durasi : ${formatDurasi(row["TTR END TO END"] || '')}\n\n`;
        });
    }
    
    let neText = "Nihil";
    if (neCount > 0) {
        neText = `${neCount} Tiket\n`;
        neAkses.forEach((row, idx) => {
            neText += formatExecutiveTiket(row, idx + 1, "NE_AKSES");
        });
    }
    
    let feederText = "Nihil";
    if (feederCount > 0) {
        feederText = `${feederCount} Tiket\n`;
        feeder.forEach((row, idx) => {
            feederText += formatExecutiveGamasRow(row, idx + 1, "FEEDER");
        });
    }
    
    let distribusiText = "Nihil";
    if (distribusiCount > 0) {
        distribusiText = `${distribusiCount} Tiket\n`;
        distribusi.forEach((row, idx) => {
            distribusiText += formatExecutiveGamasRow(row, idx + 1, "DISTRIBUSI");
        });
    }
    
    let odpText = "Nihil";
    if (odpCount > 0) {
        odpText = `${odpCount} Tiket\n`;
        odp.forEach((row, idx) => {
            odpText += formatExecutiveGamasRow(row, idx + 1, "ODP");
        });
    }
    
    let cmeTable = "Sub District|jmlSTO|jmlLap|OK|NOK|%Lap|%OK\n";
    cmeTable += "-----------|------|------|--|---|----|---\n";
    STATIC_REPORT_DATA.cme.rows.forEach(row => {
        cmeTable += `${row[0]}|${row[1]} |${row[2]} |${row[3]} |${row[4]}|${row[5]}|${row[6]}\n`;
    });
    cmeTable += "\n* test beban dilaksanakan mingguan pada hari Jumat pukul 10.00 waktu setempat\n";
    cmeTable += "* BBM OK jika stock untuk running genset >12 jam";
    
    let utilisasiText = "";
    if (STATIC_REPORT_DATA.utilisasi.tera.length > 0) {
        utilisasiText += "Tera > 50% :\n";
        STATIC_REPORT_DATA.utilisasi.tera.forEach(item => {
            utilisasiText += `${item}\n`;
        });
    }
    if (STATIC_REPORT_DATA.utilisasi.gpongpon) {
        utilisasiText += `\nUplink GPON to GPON >80% : ${STATIC_REPORT_DATA.utilisasi.gpongpon}\n`;
    }
    if (utilisasiText === "") utilisasiText = "-\n";
    
    // ================= CRA RESUME =================
    let craResumeText = "";
    let craTotal = 0;
    
    const districtList = [
        "SURABAYA", "MALANG", "SIDOARJO", "JEMBER", "MADIUN", "LAMONGAN",
        "DENPASAR", "FLORES", "KUPANG", "MATARAM", "PEKALONGAN", "YOGYAKARTA",
        "PURWOKERTO", "MAGELANG", "SEMARANG", "SURAKARTA"
    ];
    
    let resume = {};
    districtList.forEach(district => {
        resume[district] = { total: 0, on: 0, belum: 0, cancel: 0 };
    });
    resume["UNMAPPED"] = { total: 0, on: 0, belum: 0, cancel: 0 };
    
    // ================= MAPPING LENGKAP =================
    const manualMapping = {
        // SURABAYA
        "SBY": "SURABAYA", "SURABAYA": "SURABAYA", "SURABAYA SELATAN": "SURABAYA",
        "SURABAYA UTARA": "SURABAYA", "SURABAYA TIMUR": "SURABAYA", "SURABAYA BARAT": "SURABAYA",
        "SURABAYA PUSAT": "SURABAYA", "MADURA": "SURABAYA", "BANGKALAN": "SURABAYA",
        "SAMPANG": "SURABAYA", "PAMEKASAN": "SURABAYA", "SUMENEP": "SURABAYA",
        // MALANG
        "MLG": "MALANG", "MALANG": "MALANG", "BATU": "MALANG", "BLITAR": "MALANG", "TULUNGAGUNG": "MALANG",
        // SIDOARJO
        "SDA": "SIDOARJO", "SIDOARJO": "SIDOARJO", "MOJOKERTO": "SIDOARJO", "PASURUAN": "SIDOARJO", "JOMBANG": "SIDOARJO",
        // JEMBER
        "JBR": "JEMBER", "JEMBER": "JEMBER", "BANYUWANGI": "JEMBER", "BONDOWOSO": "JEMBER", "SITUBONDO": "JEMBER", "LUMAJANG": "JEMBER", "PROBOLINGGO": "JEMBER",
        // MADIUN
        "MDN": "MADIUN", "MADIUN": "MADIUN", "KEDIRI": "MADIUN", "NGANJUK": "MADIUN", "MAGETAN": "MADIUN", "NGAWI": "MADIUN", "PACITAN": "MADIUN", "PONOROGO": "MADIUN", "TRENGGALEK": "MADIUN",
        // LAMONGAN
        "LMG": "LAMONGAN", "LAMONGAN": "LAMONGAN", "GRESIK": "LAMONGAN", "BOJONEGORO": "LAMONGAN", "TUBAN": "LAMONGAN",
        // DENPASAR
        "DPS": "DENPASAR", "DENPASAR": "DENPASAR", "BADUNG": "DENPASAR", "GIANYAR": "DENPASAR", "TABANAN": "DENPASAR", "BANGLI": "DENPASAR", "KARANGASEM": "DENPASAR", "KLUNGKUNG": "DENPASAR", "UBUD": "DENPASAR", "SINGARAJA": "DENPASAR", "KUTA": "DENPASAR", "NUSA DUA": "DENPASAR", "SANUR": "DENPASAR", "SEMINYAK": "DENPASAR", "BALI": "DENPASAR",
        // FLORES
        "FLORES": "FLORES", "ENDE": "FLORES", "MAUMERE": "FLORES", "LARANTUKA": "FLORES", "LABUAN BAJO": "FLORES", "RUTENG": "FLORES", "BAJAWA": "FLORES",
        // KUPANG
        "KUPANG": "KUPANG", "TIMOR": "KUPANG", "SUMBA": "KUPANG", "ROTE": "KUPANG", "ATAMBUA": "KUPANG", "KEFAMENANU": "KUPANG", "SOE": "KUPANG", "WAIKABUBAK": "KUPANG", "WAINGAPU": "KUPANG", "NTT": "KUPANG",
        // MATARAM
        "MATARAM": "MATARAM", "LOMBOK": "MATARAM", "SUMBAWA": "MATARAM", "BIMA": "MATARAM", "PRAYA": "MATARAM", "SELONG": "MATARAM", "NTB": "MATARAM",
        // PEKALONGAN
        "PKL": "PEKALONGAN", "PEKALONGAN": "PEKALONGAN", "ADIWRENA": "PEKALONGAN", "BOBOTSARI": "PEKALONGAN", "BANDAR SEDAYU": "PEKALONGAN", "BULAKAMBA": "PEKALONGAN", "BALAPULANG": "PEKALONGAN", "BUMIAYU": "PEKALONGAN", "BREBES": "PEKALONGAN", "BATANG": "PEKALONGAN", "COMAL": "PEKALONGAN", "KEDUNGWUNI": "PEKALONGAN", "KAJEN": "PEKALONGAN", "KETANGGUNGAN TIMUR": "PEKALONGAN", "MARGADANA": "PEKALONGAN", "PURBALINGGA": "PEKALONGAN", "PEMALANG": "PEKALONGAN", "RANDUDONGKAL": "PEKALONGAN", "SUBAH": "PEKALONGAN", "SLAWI": "PEKALONGAN", "TEGAL": "PEKALONGAN", "TANJUNG TEGAL": "PEKALONGAN",
        // YOGYAKARTA
        "JOGJA": "YOGYAKARTA", "YOGYAKARTA": "YOGYAKARTA", "DIY": "YOGYAKARTA", "BABARSARI": "YOGYAKARTA", "BANTUL": "YOGYAKARTA", "GODEAN": "YOGYAKARTA", "YOKYAKARTA KOTABARU": "YOGYAKARTA", "YOGYAKARTA KENTUNGAN": "YOGYAKARTA", "KOTA GEDE": "YOGYAKARTA", "KALASAN": "YOGYAKARTA", "PUGERAN": "YOGYAKARTA", "PAKEM KALIURANG": "YOGYAKARTA", "SLEMAN": "YOGYAKARTA", "WONOSARI": "YOGYAKARTA", "WATES": "YOGYAKARTA",
        // PURWOKERTO
        "PWT": "PURWOKERTO", "PURWOKERTO": "PURWOKERTO", "BANYUMAS": "PURWOKERTO", "AJIBARANG": "PURWOKERTO", "BANJARNEGARA": "PURWOKERTO", "BATURADEN": "PURWOKERTO", "CILACAP": "PURWOKERTO", "CILONGOK": "PURWOKERTO", "GUMILIR": "PURWOKERTO", "KLAMPOK": "PURWOKERTO", "KROYA": "PURWOKERTO", "MAJENANG": "PURWOKERTO", "MAOS": "PURWOKERTO", "SIDAREJA": "PURWOKERTO", "SUKARAJA": "PURWOKERTO", "WONOSOBO": "PURWOKERTO",
        // MAGELANG
        "MAGELANG": "MAGELANG", "GOMBONG": "MAGELANG", "KARANGANYAR KEBUMEN": "MAGELANG", "KEBUMEN": "MAGELANG", "KUTOARJO": "MAGELANG", "KUTOWINANGUN": "MAGELANG", "MUNGKID": "MAGELANG", "MERTOYUDAN": "MAGELANG", "MUNTILAN": "MAGELANG", "PARAKAN": "MAGELANG", "PURWOREJO": "MAGELANG", "TEMANGGUNG": "MAGELANG",
        // SEMARANG
        "SMR": "SEMARANG", "SEMARANG": "SEMARANG", "JATENG": "SEMARANG", "AMBARAWA": "SEMARANG", "BANGSRI": "SEMARANG", "BANDUNGAN": "SEMARANG", "SEMARANG BANYUMANIK": "SEMARANG", "BOJA": "SEMARANG", "BAWEN": "SEMARANG", "DEMAK": "SEMARANG", "GOMBEL": "SEMARANG", "SEMARANG GENUK": "SEMARANG", "SEMARANG JOHAR": "SEMARANG", "JEPARA": "SEMARANG", "JUWANA": "SEMARANG", "KENDAL": "SEMARANG", "KELING": "SEMARANG", "KARIMUNJAWA": "SEMARANG", "KUDUS": "SEMARANG", "LASEM": "SEMARANG", "MIJEN": "SEMARANG", "SEMARANG MAJAPAHIT": "SEMARANG", "SEMARANG MANGKANG": "SEMARANG", "PATI": "SEMARANG", "PECANGAAN": "SEMARANG", "REMBANG": "SEMARANG", "SUKOREJO": "SEMARANG", "SALATIGA": "SEMARANG", "SEMARANG CANDI": "SEMARANG", "SEMARANG TUGU": "SEMARANG", "SEMARANG SIMPANGLIMA": "SEMARANG", "TAYU": "SEMARANG", "UNGARAN": "SEMARANG", "WELERI": "SEMARANG", "WONOREJO": "SEMARANG",
        // SURAKARTA
        "SOLO": "SURAKARTA", "SURAKARTA": "SURAKARTA", "SOLO BEKONANG": "SURAKARTA", "BLORA": "SURAKARTA", "BATURETNO": "SURAKARTA", "BOYOLALI": "SURAKARTA", "CEPU": "SURAKARTA", "DELANGGU": "SURAKARTA", "GUBUG": "SURAKARTA", "GODONG": "SURAKARTA", "SOLO GLADAK": "SURAKARTA", "JATISRONO": "SURAKARTA", "KARANG ANYAR SOLO": "SURAKARTA", "KLATEN": "SURAKARTA", "SOLO KERTEN": "SURAKARTA", "KARTOSURO": "SURAKARTA", "SOLO MOJOSONGO": "SURAKARTA", "NGAWEN": "SURAKARTA", "PEDAN": "SURAKARTA", "PURWODADI GROBOGAN": "SURAKARTA", "RANDUBLATUNG": "SURAKARTA", "SUKOHARJO": "SURAKARTA", "SOLO BARU": "SURAKARTA", "SOLO PALUR": "SURAKARTA", "SRAGEN": "SURAKARTA", "TOROH": "SURAKARTA", "TAWANGMANGU": "SURAKARTA", "WONOGIRI": "SURAKARTA", "WIROSARI": "SURAKARTA"
    };
    
    console.log("========== DEBUG CRA RESULT ==========");
    console.log("Total CRA_RESULT:", CRA_RESULT ? CRA_RESULT.length : 0);
    
    if (CRA_RESULT && CRA_RESULT.length > 0) {
        CRA_RESULT.forEach((row, idx) => {
            let witelRaw = (row.kota || row.witel || row.WITEL || row.KOTA || row.CITY || row.LOKASI || "").toString().trim();
            let witel = witelRaw.toUpperCase().replace(/[^\w\s\/-]/g, ' ').replace(/\s+/g, ' ').trim();
            let district = "UNMAPPED";
            let originalWitel = witel;
            
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
            
            if (district === "UNMAPPED") {
                console.log(`🔴 UNMAPPED #${idx+1}: Witel="${originalWitel}" | NoCRA="${row.noCRA}" | Status="${row.status}"`);
            } else {
                console.log(`🟢 MAPPED #${idx+1}: Witel="${originalWitel}" -> District="${district}"`);
            }
            
            if (!resume[district]) {
                resume[district] = { total: 0, on: 0, belum: 0, cancel: 0 };
            }
            
            resume[district].total++;
            craTotal++;
            
            const status = (row.status || "BELUM DIISI").toUpperCase();
            if (status === "ON SCHEDULE") {
                resume[district].on++;
            } else if (status === "CANCEL") {
                resume[district].cancel++;
            } else {
                resume[district].belum++;
            }
        });
    }
    
    console.log("========== RESUME SUMMARY ==========");
    for (let key in resume) {
        if (resume[key].total > 0) {
            console.log(`District ${key}: total=${resume[key].total}, on=${resume[key].on}, belum=${resume[key].belum}, cancel=${resume[key].cancel}`);
        }
    }
    
    if (craTotal > 0) {
        craResumeText = `Resume CRA\n[Jumlah CRA | On Schedule | Belum Diisi | NOK/Cancel]\n\n`;
        let idx = 1;
        
        for (let district of districtList) {
            let d = resume[district];
            craResumeText += `${idx}. District ${district} : [ ${d.total} | ${d.on} | ${d.belum} | ${d.cancel} ]\n`;
            idx++;
        }
        
        let dUnmapped = resume["UNMAPPED"];
        craResumeText += `${idx}. District UNMAPPED : [ ${dUnmapped.total} | ${dUnmapped.on} | ${dUnmapped.belum} | ${dUnmapped.cancel} ]\n`;
        
        let totalAll = 0, totalOn = 0, totalBelum = 0, totalCancel = 0;
        for (let key in resume) {
            totalAll += resume[key].total;
            totalOn += resume[key].on;
            totalBelum += resume[key].belum;
            totalCancel += resume[key].cancel;
        }
        
        craResumeText += `\nTotal : [ ${totalAll} | ${totalOn} | ${totalBelum} | ${totalCancel} ]\n`;
        craResumeText += `\nKeterangan :\nBelum = PIC Drafter belum checklist GDOC TIOC\nNOK/Cancel = PIC Drafter sudah menyelesaikan CRA sebelumnya`;
    } else {
        craResumeText = "Tidak ada data CRA";
    }
    
    const report = `EXECUTIVE REPORT
EVP Area III Bpk Deddy Suhendry
Kami laporkan kondisi layanan dan lainnya di TIF3-JBN sebagai berikut :
${hari}
Pukul : ${jam}
  
I. EXECUTIVE SUMMARY
A. Secara umum, Infrastructure dan Service berfungsi secara normal.
B. GANGGUAN INFRASTRUKTUR :
1. IP Backbone : ${ipCount === 0 ? "Nihil" : ipCount + " Tiket"}
2. Transport Backbone : ${transportCount === 0 ? "Nihil" : transportCount + " Tiket"}

C. KEJADIAN/KEGIATAN PENTING :
1. Bencana Alam : ${STATIC_REPORT_DATA.bencanaAlam}
2. Event Penting : ${STATIC_REPORT_DATA.eventPenting}

II. INFRASTRUCTURE
A. IP Backbone : ${ipText}
B. TRANSPORT BACKBONE : ${transportText}
C. OSASE : ${STATIC_REPORT_DATA.osase}
D. REPORT CME : 

${cmeTable}

E. NE AKSES : ${neText}

F. GAMAS FEEDER, DISTRIBUSI, ODP : 
- FEEDER : ${feederText}
- DISTRIBUSI : ${distribusiText}
- ODP : ${odpText}

G. PE SERVICE :
-  PE HSI     : ${STATIC_REPORT_DATA.peService.hsi}
-  PE TRANSIT : ${STATIC_REPORT_DATA.peService.transit}
-  PE VPN     : ${STATIC_REPORT_DATA.peService.vpn}

H. Gamas Network : ${STATIC_REPORT_DATA.gamasNetwork}
I. UTILISASI
${utilisasiText}

III. STATUS SERVICE
A. INTERNET : ${STATIC_REPORT_DATA.internet}
B. USEETV : ${STATIC_REPORT_DATA.useetv}
C. VOICE : ${STATIC_REPORT_DATA.voice}

IV. SIAGA BANJIR (Kondisi STO Terdampak Banjir)
TReg5 : ${STATIC_REPORT_DATA.banjir.districtCount} District | ${STATIC_REPORT_DATA.banjir.stoCount} STO | ${STATIC_REPORT_DATA.banjir.terdampak} STO Terdampak Banjir
  
V. KEGIATAN TERENCANA (CRA) : ${craTotal} KEGIATAN

${craResumeText}

REPORT INTERNAL TELKOM DILARANG DISEBARLUASKAN KE LUAR TELKOM

Contact Center:
Free Call : 0800-1-353000
TSEL : 0811-3081-500`;

    currentExecutiveReport = report;
    
    const reportContent = document.getElementById('executiveReportContent');
    if (reportContent) {
        reportContent.textContent = report;
    }
}

// ================= COPY EXECUTIVE REPORT =================
function copyExecutiveReport() {
    if (!currentExecutiveReport) {
        alert("Belum ada laporan yang di-generate. Pilih shift terlebih dahulu!");
        return;
    }
    
    navigator.clipboard.writeText(currentExecutiveReport).then(() => {
        alert("✅ Executive Report berhasil di-copy!");
    }).catch(() => {
        alert("❌ Gagal menyalin report");
    });
}

// ================= DOWNLOAD EXECUTIVE REPORT =================
function downloadExecutiveReport() {
    if (!currentExecutiveReport) {
        alert("Belum ada laporan yang di-generate. Pilih shift terlebih dahulu!");
        return;
    }
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    const blob = new Blob([currentExecutiveReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EXECUTIVE_REPORT_${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById("executiveReportBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("executiveModal");
    if (modal) {
        modal.style.display = "flex";
        
        // SCROLL HALAMAN KE POSISI MODAL
        modal.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        const reportContent = document.getElementById('executiveReportContent');
        if (reportContent) {
            reportContent.textContent = "Pilih shift laporan di atas untuk menghasilkan Executive Report...";
        }
        currentExecutiveReport = "";
    }
});

document.getElementById("closeExecutiveModal")?.addEventListener("click", () => {
    const modal = document.getElementById("executiveModal");
    if (modal) modal.style.display = "none";
});

window.addEventListener("click", (e) => {
    const modal = document.getElementById("executiveModal");
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

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

// ================= ESKALASI =================
function cleanText(t) {
    return t.replace(/\r/g, '').replace(/\t/g, ' ').replace(/\s{2,}/g, ' ').trim();
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
    return text.replace(/(\d{2}:\d{2}\sWIB\s*:)/g, '\n$1').trim();
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

${formatWAFooter(raw)}`
    .trim();
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

function getLastUpdate(raw) {
    const m = raw.match(/Last update\s*:\s*(.+)/i);
    return m ? `Last update : ${m[1].trim()}` : '';
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

    const slotMatch = text.match(/Slot.*port.*?(GPON[^\n]+)/i);
    if (slotMatch) data.slot = slotMatch[1].trim();

    // CATATAN: jika hasil PIC converter berbeda dari versi lama Anda,
    // ganti 1 baris regex ini dengan baris asli dari app.js lama.
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

// ================= FETCH DATA TERA =================
function fetchTeraData() {
    console.log("Fetching Tera data...");
    const teraUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR1zzLfkuctrLA3dvesis1ZJi1-eC8eIQy_h0OV8K5nI6f2dPcOc2g9NC5NUAgQer7i-iM6mqTE_KQv/pub?output=csv";
    fetch(teraUrl)
        .then(response => response.text())
        .then(csvText => {
            // Parse CSV
            const lines = csvText.split('\n').filter(line => line.trim());
            const headers = lines.shift().split(',');
            const data = [];
            for (let i = 0; i < lines.length; i++) {
                const cols = lines[i].split(',');
                const row = {};
                for (let j = 0; j < headers.length; j++) {
                    row[headers[j]] = cols[j] ? cols[j].trim() : '';
                }
                data.push(row);
            }
            console.log("Parsed Tera data:", data);

            // Update report data
            STATIC_REPORT_DATA.utilisasi.tera = data.map(d => d['TERA'] + ' | ' + d['% Utilization']);
            console.log("Updated utilisasi.tera:", STATIC_REPORT_DATA.utilisasi.tera);

            // Update UI elements
            const teraList = document.getElementById('teraList');
            if (teraList) {
                teraList.innerHTML = data.map(d => `<li>${d['TERA']} | ${d['% Utilization']}</li>`).join('');
            }
        })
        .catch(error => {
            console.error('Error fetching Tera data:', error);
        });
}

// ================= COPY TERA REPORT =================
function copyTeraReport() {
    if (!STATIC_REPORT_DATA.utilisasi.tera || STATIC_REPORT_DATA.utilisasi.tera.length === 0) {
        alert("Tidak ada data Tera untuk dicopy");
        return;
    }

    let teraText = "Tera > 50% :\n";
    STATIC_REPORT_DATA.utilisasi.tera.forEach(item => {
        teraText += `${item}\n`;
    });

    navigator.clipboard.writeText(teraText).then(() => {
        alert("✅ Tera Report berhasil di-copy!");
    }).catch(() => {
        alert("❌ Gagal menyalin report");
    });
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

// ================= 🆕 REFER: PALET WARNA GRUP INDUK-ANAK =================
// Tiap induk dapat 1 warna; semua anaknya ikut warna induknya.
const REF_GROUP_COLORS = [
    { bg: "rgba(255, 99, 132, 0.16)", border: "#ff6384" },   // 1. merah muda
    { bg: "rgba(54, 162, 235, 0.16)", border: "#36a2eb" },   // 2. biru
    { bg: "rgba(255, 159, 64, 0.20)", border: "#ff9f40" },   // 3. oranye
    { bg: "rgba(75, 192, 192, 0.16)", border: "#4bc0c0" },   // 4. tosca
    { bg: "rgba(153, 102, 255, 0.16)", border: "#9966ff" },  // 5. ungu
    { bg: "rgba(255, 205, 86, 0.25)", border: "#d4a900" },   // 6. kuning
    { bg: "rgba(46, 204, 113, 0.16)", border: "#2ecc71" },   // 7. hijau
    { bg: "rgba(231, 76, 160, 0.16)", border: "#e74ca0" }    // 8. magenta
];

// ================= 🆕 REFER: DETEKSI ANAK → AMBIL INC INDUKNYA =================
// Menangkap: "MEREFER TIKET INC52089170", "MEREFER KE TIKET INC52097158"
// (huruf besar/kecil tidak masalah). Kalau tidak ada → null.
function getReferParent(summary) {
    const m = String(summary || "").match(/MEREFER\s*(?:KE\s+)?TIKET\s+(INC\d+)/i);
    return m ? m[1].toUpperCase() : null;
}

// ================= 🆕 REFER: SUSUN ULANG SATU SECTION =================
// Hasil: induk tampil dulu, semua anaknya tepat di bawah induknya.
// Anak yang induknya TIDAK ada di section itu tetap di posisi semula.
function sortWithRefer(items) {
    const incOf = it => (it.row["INCIDENT"] || "").toUpperCase();
    const existing = new Set(items.map(incOf).filter(Boolean));

    const result = [];
    const used = new Set();

    items.forEach((it, idx) => {
        if (used.has(idx)) return;

        const inc = incOf(it);
        const parentRef = getReferParent(it.row["SUMMARY"]);

        // ANAK yang induknya ada di section ini → jangan tampil di posisi asli,
        // akan disisipkan tepat di bawah induknya
        if (parentRef && existing.has(parentRef)) return;

        result.push(it);
        used.add(idx);

        // kalau item ini INDUK → tarik semua anaknya tepat di bawahnya
        items.forEach((child, cIdx) => {
            if (used.has(cIdx)) return;
            if (getReferParent(child.row["SUMMARY"]) === inc) {
                result.push(child);
                used.add(cIdx);
            }
        });
    });

    // pengaman: masukkan sisa item yang belum terpakai
    items.forEach((it, idx) => {
        if (!used.has(idx)) result.push(it);
    });

    return result;
}

// ================= RENDER DATA =================
// 🆕 REFER: versi baru — anak (MEREFER) tampil di bawah induknya,
// satu grup diberi warna background yang sama, penomoran mengikuti urutan baru.
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

    // 🆕 REFER: tampung dulu per section, baru diurutkan & dirender
    const itemsJatim = [];
    const itemsBalnus = [];
    const itemsReg4 = [];

    data.forEach(row => {
        const summary = row["SUMMARY"] || "";
        const zone = (row["WORKZONE"] || "").toUpperCase();

        total++;

        if (summary.includes("(REPAIR) TRA T3") || summary.includes("(RECOVERY) TRA T3")) bb++;
        if (summary.includes("(REPAIR) IP T3") || summary.includes("(RECOVERY) IP T3")) ip++;
        if (summary.includes("DISTRIBUSI")) d++;
        if (summary.includes("FEEDER")) f++;
        if (summary.includes("GPON")) g++;

        const entry = { row };

        if (summary.includes("GAMAS R4") || summary.toUpperCase().includes("GAMAS R4")) {
            itemsReg4.push(entry);
        } else if (DB_REG4.has(zone)) {
            itemsReg4.push(entry);
        } else if (DB_JATIM.has(zone)) {
            itemsJatim.push(entry);
        } else if (DB_BALNUS.has(zone)) {
            itemsBalnus.push(entry);
        }
    });

    // 🆕 REFER: urutkan → induk dulu, anak langsung di bawahnya
    const sortedJatim = sortWithRefer(itemsJatim);
    const sortedBalnus = sortWithRefer(itemsBalnus);
    const sortedReg4 = sortWithRefer(itemsReg4);

    // jam last update worklog untuk chip header (fitur lama, tetap jalan)
    const wlJatimUsed = [];
    const wlBalnusUsed = [];

    // 🆕 REFER: penghitung warna grup (bergilir tiap induk, lintas section)
    let groupColorCounter = 0;

    // 🆕 REFER: render satu section dengan urutan baru + nomor baru + warna grup
    const renderSection = (box, items, withWL, wlBucket, setWorkzone) => {
        if (!box) return;
        let no = 1;
        const colorOfParent = new Map(); // INC induk -> index warna

        items.forEach(it => {
            const row = it.row;
            const summary = row["SUMMARY"] || "";
            const update = row["WORKLOG SUMMARY"] || "-";
            const ttr = row["TTR END TO END"] || "";
            const durasiFormatted = formatDurasi(ttr);
            const wlTime = formatWLTime(row["LAST UPDATE WORKLOG"]);
            const inc = (row["INCIDENT"] || "").toUpperCase();
            const parentRef = getReferParent(summary);

            // ---- tentukan warna grup (induk & semua anaknya sama) ----
            let colorIdx = -1;
            const isParent = items.some(x => getReferParent(x.row["SUMMARY"]) === inc);
            if (isParent) {
                if (!colorOfParent.has(inc)) {
                    colorOfParent.set(inc, groupColorCounter % REF_GROUP_COLORS.length);
                    groupColorCounter++;
                }
                colorIdx = colorOfParent.get(inc);
            } else if (parentRef && colorOfParent.has(parentRef)) {
                // anak selalu dirender SETELAH induknya (dijamin sortWithRefer)
                colorIdx = colorOfParent.get(parentRef);
            }

            // ---- buat kartu (isi teks sama persis seperti dulu) ----
            const card = document.createElement("div");
            card.className = "card";
            const cardContent = `${summary}<br><b>Update :</b> ${update}<br><b>⏱️ Durasi :</b> ${durasiFormatted}`;
            card.innerHTML = `<b>${no++}. ${row["INCIDENT"] || '-'}</b><br>${cardContent}`;

            if (setWorkzone) card.dataset.workzone = (row["WORKZONE"] || "").toUpperCase(); // NOP BALNUS

            if (withWL && wlTime) {
                addWLLine(card, wlTime);   // Update WL (tidak ikut ke-copy)
                wlBucket.push(wlTime);
            }

            // ---- warnai grup induk-anak ----
            if (colorIdx >= 0) {
                const c = REF_GROUP_COLORS[colorIdx];
                card.style.backgroundColor = c.bg;
                card.style.borderLeft = `6px solid ${c.border}`;

                // ---- 🆕 badge INDUK / ANAK (no-copy → tidak ikut ter-copy) ----
                const badge = document.createElement("span");
                badge.className = "no-copy";

                if (isParent) {
                    // hitung jumlah anak di section ini untuk label induk
                    const jmlAnak = items.filter(x => getReferParent(x.row["SUMMARY"]) === inc).length;
                    badge.textContent = jmlAnak > 1 ? `🎯 INDUK • ${jmlAnak} ANAK` : "🎯 INDUK";
                    badge.style.cssText = `display:inline-block;background:${c.border};color:#fff;font-size:.68rem;font-weight:800;letter-spacing:.5px;padding:3px 10px;border-radius:20px;margin:0 8px 6px 0;vertical-align:middle;box-shadow:0 2px 6px ${c.border}66;`;
                } else {
                    // anak: tunjukkan nomor induknya + sedikit menjorok ke dalam
                    badge.textContent = `↳ ANAK → ${parentRef}`;
                    badge.style.cssText = `display:inline-block;background:${c.border}1a;color:${c.border};border:1px dashed ${c.border};font-size:.68rem;font-weight:800;letter-spacing:.5px;padding:2px 10px;border-radius:20px;margin:0 8px 6px 0;vertical-align:middle;`;
                    card.style.marginLeft = "30px"; // efek "bertingkat" di bawah induk
                }

                card.insertBefore(badge, card.firstChild);
            }

            box.appendChild(card);
        });
    };

    renderSection(jatimBox, sortedJatim, true, wlJatimUsed, false);
    renderSection(balnusBox, sortedBalnus, true, wlBalnusUsed, true);
    renderSection(reg4Box, sortedReg4, false, null, false);

    // chip last update di header JATIM & BALNUS (fitur lama, tetap jalan)
    setHeaderWLTime("wlHeaderJatim", wlJatimUsed);
    setHeaderWLTime("wlHeaderBalnus", wlBalnusUsed);

    document.getElementById("totalCount").textContent = `TOTAL : ${total}`;
    document.getElementById("bbCount").textContent = `BB : ${bb}`;
    document.getElementById("ipCount").textContent = `IP : ${ip}`;
    document.getElementById("gponCount").textContent = `GPON : ${g}`;
    document.getElementById("feederCount").textContent = `FEEDER : ${f}`;
    document.getElementById("distriCount").textContent = `DISTRIBUSI : ${d}`;

    renderStatusBadges(data);

    // JUMLAH GAMAS
    updateRegionStats(data);

    if (!jatimBox.children.length) jatimBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
    if (!balnusBox.children.length) balnusBox.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
    if (reg4Box && !reg4Box.children.length) reg4Box.innerHTML = `<div class="empty">Data tidak ditemukan</div>`;
}

const STATUS_LIST = ['New', 'Draft', 'Analysis', 'Pending', 'Backend', 'FinalCheck', 'Resolved', 'Mediacare', 'Salamsim', 'Closed'];

// ================= TAMBAHKAN FUNGSI INI (YANG HILANG) =================
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

document.getElementById("btnSearch")?.addEventListener("click", () => applyFilters());

document.getElementById("themeToggle")?.addEventListener("click", () => document.body.classList.toggle("light"));

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

// ================= LOAD NOP DATABASE (khusus BALNUS) =================
async function loadNOPDatabase() {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSTBHJ-S5KYC1Z8zSbgbhIkoIefPRDv3aggjxHO09NyF4nrMmIR2MsTr7DZAYJ8-nf46VQCrKm2aIxg/pub?output=csv";
    
    try {
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        
        NOP_DB = {};
        
        lines.forEach((line, idx) => {
            if (idx === 0) return; // skip header
            const cols = line.split(',').map(s => s.trim().toUpperCase());
            const dbCode = cols[0];
            const dbCity = cols[1];
            const dbNop = cols[2];
            
            if (dbCode && dbNop) {
                NOP_DB[dbCode] = dbNop;
                if (dbCity) NOP_DB[dbCity] = dbNop;
            }
        });
        
        console.log("✅ NOP Database loaded:", Object.keys(NOP_DB).length, "entries");
    } catch (err) {
        console.error("❌ Gagal load NOP database:", err);
    }
}

// ================= FILE CSV =================
document.getElementById("fileInput")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileNameSpan = document.getElementById("fileName");
    if (fileNameSpan) fileNameSpan.textContent = file.name;

    const reader = new FileReader();
    reader.onload = () => {
        ALL_DATA = parseCSV(reader.result);
        applyFilters();
    };
    reader.readAsText(file);
});

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
    // 🆕 APLIKASIKAN FILTER REGIONAL
    const filteredData = filterCRAByRegional(data);
    CURRENT_CRA_DATA = [...filteredData];
    
    const tbody = document.querySelector('#craTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!filteredData.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty">Data CRA tidak ditemukan</td></tr>`;
        updateCRACounter(filteredData);
        updateMiniCRAStats(filteredData);  // 🆕 UPDATE MINI STATS
        return;
    }
    
    const processedKeys = new Set();
    const priorityData = filteredData.filter(row => {
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
    
    const reg4Data = filteredData.filter(row => {
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
        
        // 🆕 UPDATE COUNTER DAN MINI STATS SAAT STATUS BERUBAH
        tr.querySelector('select').addEventListener('change', e => {
            row.status = e.target.value;
            e.target.className = `cra-status ${getStatusClass(row.status)}`;
            
            // Update counter dan mini stats setelah status berubah
            updateCRACounter(CURRENT_CRA_DATA);
            updateMiniCRAStats(CURRENT_CRA_DATA);
        });
        
        tbody.appendChild(tr);
    });
    
    // 🆕 UPDATE COUNTER SETELAH FILTER
    updateCRACounter(filteredData);
    
    // 🆕 UPDATE MINI STATS DI SEBELAH CHECKBOX
    updateMiniCRAStats(filteredData);
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
                crq: row['CRQ'] || '',
                status: 'BELUM DIISI'
            });
        } else {
            const existing = map.get(key);
            lokasiArr.forEach(l => {
                if (!existing.lokasi.includes(l)) existing.lokasi.push(l);
            });
        }
    });
    
    CRA_DATA = Array.from(map.values());
    
    // 🆕 SIMPAN DATA ASLI DAN DATA YANG SEDANG DITAMPILKAN
    ORIGINAL_CRA_DATA = [...CRA_DATA];
    CURRENT_CRA_DATA = [...CRA_DATA];
    
    updateCRACounter(CURRENT_CRA_DATA);
    renderCRA(CURRENT_CRA_DATA);
}

// ================= FILTER REGIONAL UNTUK CRA =================
function filterCRAByRegional(data) {
    const reg5Checked = document.getElementById('filterReg5')?.checked || false;
    const reg4Checked = document.getElementById('filterReg4')?.checked || false;
    
    // Jika tidak ada yang dicentang, tampilkan semua
    if (!reg5Checked && !reg4Checked) {
        return data;
    }
    
    // Filter berdasarkan regional
    return data.filter(item => {
        const regional = (item.regional || '').toString().toUpperCase();
        
        const isReg5 = regional.includes('REG5') || regional.includes('REG 5');
        const isReg4 = regional.includes('REG4') || regional.includes('REG 4');
        
        if (reg5Checked && reg4Checked) {
            // Keduanya dicentang -> tampilkan REG5 ATAU REG4
            return isReg5 || isReg4;
        } else if (reg5Checked) {
            // Hanya REG5
            return isReg5;
        } else if (reg4Checked) {
            // Hanya REG4
            return isReg4;
        }
        return false;
    });
}

// 🆕 FUNGSI UNTUK MENERAPKAN FILTER SAAT CHECKBOX BERUBAH
function applyCRAFilter() {
    if (ORIGINAL_CRA_DATA.length > 0) {
        console.log("🔄 Menerapkan filter CRA...");
        const reg5Checked = document.getElementById('filterReg5')?.checked;
        const reg4Checked = document.getElementById('filterReg4')?.checked;
        console.log(`Filter - REG5: ${reg5Checked}, REG4: ${reg4Checked}`);
        renderCRA(ORIGINAL_CRA_DATA);
    }
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
	
	// 🆕 Update mini stats juga
    updateMiniCRAStats(data);
}

// ================= UPDATE MINI STATISTICS DI SEBELAH CHECKBOX =================
function updateMiniCRAStats(data) {
    const onSchedule = data.filter(r => r.status === "ON SCHEDULE").length;
    const cancel = data.filter(r => r.status === "CANCEL").length;
    const belum = data.filter(r => r.status === "BELUM DIISI" || !r.status || r.status === "").length;
    
    const onEl = document.getElementById('miniOnSchedule');
    const cancelEl = document.getElementById('miniCancel');
    const belumEl = document.getElementById('miniBelum');
    
    if (onEl) {
        onEl.textContent = onSchedule;
        // Animasi sedikit
        onEl.style.transform = 'scale(1.1)';
        setTimeout(() => { if(onEl) onEl.style.transform = 'scale(1)'; }, 150);
    }
    if (cancelEl) {
        cancelEl.textContent = cancel;
        cancelEl.style.transform = 'scale(1.1)';
        setTimeout(() => { if(cancelEl) cancelEl.style.transform = 'scale(1)'; }, 150);
    }
    if (belumEl) {
        belumEl.textContent = belum;
        belumEl.style.transform = 'scale(1.1)';
        setTimeout(() => { if(belumEl) belumEl.style.transform = 'scale(1)'; }, 150);
    }
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
        // perbaikan kecil: versi lama memakai "filteredData" yang tidak ada di scope ini
        updateMiniCRAStats(CRA_DATA);
    };
    reader.readAsText(file);
});

function statusWithIcon(status) {
    if (status === 'ON SCHEDULE') return 'ON SCHEDULE ✅';
    if (status === 'CANCEL') return 'CANCEL ❌';
    return 'BELUM DIISI ⌛️';
}

function exportCRAtoExcel() {
    // 🆕 GUNAKAN DATA YANG SUDAH DIFILTER
    const dataToExport = CURRENT_CRA_DATA.length > 0 ? CURRENT_CRA_DATA : CRA_DATA;
    
    if (!dataToExport.length) {
        alert('Data CRA kosong');
        return;
    }
    
    const rows = dataToExport.map((row, i) => ({
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
    // 🆕 GUNAKAN DATA YANG SUDAH DIFILTER
    const dataToExport = CURRENT_CRA_DATA.length > 0 ? CURRENT_CRA_DATA : CRA_DATA;
    
    if (!dataToExport.length) {
        alert('Data CRA kosong');
        return;
    }
    
    const total = dataToExport.length;
    const count = { 'ON SCHEDULE': 0, 'CANCEL': 0, 'BELUM DIISI': 0 };
    
    dataToExport.forEach(r => {
        const s = r.status || 'BELUM DIISI';
        count[s]++;
    });
    
    let txt = `KEGIATAN CRA MALAM INI : ${total} KEGIATAN\n\n\nON SCHEDULE : ${count['ON SCHEDULE']}\nCANCEL : ${count['CANCEL']}\nBELUM DIISI : ${count['BELUM DIISI']}\nTOTAL : ${total}\n\n\n`;
    
    dataToExport.forEach((row, i) => {
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
    // 🆕 GUNAKAN DATA YANG SUDAH DIFILTER
    const dataToExport = CURRENT_CRA_DATA.length > 0 ? CURRENT_CRA_DATA : CRA_RESULT;
    
    if (!dataToExport || dataToExport.length === 0) {
        alert("Data CRA kosong.");
        return;
    }
    
    let hasil = [];
    let total = dataToExport.length;
    let onSchedule = dataToExport.filter(r => r.status === "ON SCHEDULE").length;
    let cancel = dataToExport.filter(r => r.status === "CANCEL").length;
    let belumDiisi = dataToExport.filter(r => r.status === "BELUM DIISI" || !r.status).length;
    
    hasil.push(`KEGIATAN CRA MALAM INI : ${total} KEGIATAN\n\nON SCHEDULE : ${onSchedule}\nCANCEL : ${cancel}\nBELUM DIISI : ${belumDiisi}\nTOTAL : ${total}\n\n`);
    
    dataToExport.forEach((row, index) => {
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
    // 🆕 GUNAKAN DATA YANG SUDAH DIFILTER
    const dataToResume = CURRENT_CRA_DATA.length > 0 ? CURRENT_CRA_DATA : CRA_RESULT;
    
    if (!dataToResume.length) {
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
        "KARANGASEM": "DENPASAR", "KLUNGKUNG": "DENPASAR", "UBUD": "DENPASAR",
        "SINGARAJA": "DENPASAR", "KUTA": "DENPASAR", "NUSA DUA": "DENPASAR",
        "SANUR": "DENPASAR", "SEMINYAK": "DENPASAR", "BALI": "DENPASAR",
        "FLORES": "FLORES", "ENDE": "FLORES", "MAUMERE": "FLORES",
        "LARANTUKA": "FLORES", "LABUAN BAJO": "FLORES", "RUTENG": "FLORES",
        "BAJAWA": "FLORES", "KUPANG": "KUPANG", "TIMOR": "KUPANG",
        "SUMBA": "KUPANG", "ROTE": "KUPANG", "ATAMBUA": "KUPANG",
        "KEFAMENANU": "KUPANG", "SOE": "KUPANG", "WAIKABUBAK": "KUPANG",
        "WAINGAPU": "KUPANG", "NTT": "KUPANG", "MATARAM": "MATARAM",
        "LOMBOK": "MATARAM", "SUMBAWA": "MATARAM", "BIMA": "MATARAM",
        "PRAYA": "MATARAM", "SELONG": "MATARAM", "NTB": "MATARAM",
        "PKL": "PEKALONGAN", "PEKALONGAN": "PEKALONGAN",
        "JOGJA": "YOGYAKARTA", "YOGYAKARTA": "YOGYAKARTA", "DIY": "YOGYAKARTA",
        "PWT": "PURWOKERTO", "PURWOKERTO": "PURWOKERTO", "BANYUMAS": "PURWOKERTO",
        "MAGELANG": "MAGELANG", "SMR": "SEMARANG", "SEMARANG": "SEMARANG",
        "JATENG": "SEMARANG", "SOLO": "SURAKARTA", "SURAKARTA": "SURAKARTA",
        "KUDUS": "SEMARANG", "GOMBONG": "MAGELANG", "KEBUMEN": "MAGELANG",
        "PURWOREJO": "MAGELANG", "TEMANGGUNG": "MAGELANG", "TEGAL": "PEKALONGAN",
        "SLAWI": "PEKALONGAN", "PEMALANG": "PEKALONGAN", "BATANG": "PEKALONGAN",
        "BREBES": "PEKALONGAN", "CILACAP": "PURWOKERTO", "WONOSOBO": "PURWOKERTO",
        "BANJARNEGARA": "PURWOKERTO", "DEMAK": "SEMARANG", "JEPARA": "SEMARANG",
        "PATI": "SEMARANG", "REMBANG": "SEMARANG", "BLORA": "SURAKARTA",
        "SRAGEN": "SURAKARTA", "WONOGIRI": "SURAKARTA", "KLATEN": "SURAKARTA",
        "SUKOHARJO": "SURAKARTA", "BOYOLALI": "SURAKARTA", "SALATIGA": "SEMARANG",
        "BANTUL": "YOGYAKARTA", "SLEMAN": "YOGYAKARTA", "KULON PROGO": "YOGYAKARTA",
        "GUNUNGKIDUL": "YOGYAKARTA"
    };
    
    let totalAll = 0, totalOn = 0, totalBelum = 0, totalCancel = 0;
    
    // 🆕 GUNAKAN dataToResume (CURRENT_CRA_DATA)
    dataToResume.forEach((row) => {
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
    
    // AUTO SCROLL KE MODAL RESUME CRA
    setTimeout(() => {
        const modal = document.getElementById("resumeModalNew");
        if (modal) {
            modal.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, 100);
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

// ================= COPY COLUMN DENGAN NOP UNTUK BALNUS =================
// 🆕 WL: copy sekarang memakai getCardCopyText() → baris "Update WL"
// (class no-copy) TIDAK ikut ter-copy, sisanya sama persis seperti dulu
function copyColumn(type) {
    const box = document.querySelector(`#${type} .content`);
    if (!box || !box.children.length) {
        alert('Tidak ada data untuk di-copy');
        return;
    }
    
    let text = '';
    
    if (type === 'balnus') {
        // Format khusus BALNUS dengan pengelompokan NOP
        text = formatBalnusWithNOP(box);
    } else {
        // Format biasa untuk JATIM dan REG4
        box.querySelectorAll('.card').forEach(card => {
            text += getCardCopyText(card) + '\n\n';
        });
    }
    
    navigator.clipboard.writeText(text.trim()).then(() => alert(`Data ${type.toUpperCase()} berhasil di-copy`));
}

function formatBalnusWithNOP(box) {
    const cards = Array.from(box.querySelectorAll('.card'));
    const grouped = {};
    
    cards.forEach(card => {
        const workzone = card.dataset.workzone || '';
        // Cari NOP berdasarkan workzone
        let nop = 'LAINNYA';
        const upperWorkzone = workzone.toUpperCase();
        
        if (NOP_DB[upperWorkzone]) {
            nop = NOP_DB[upperWorkzone];
        } else {
            // Coba cari dengan partial match
            for (const [key, value] of Object.entries(NOP_DB)) {
                if (upperWorkzone.includes(key) || key.includes(upperWorkzone)) {
                    nop = value;
                    break;
                }
            }
        }
        
        if (!grouped[nop]) grouped[nop] = [];
        grouped[nop].push(getCardCopyText(card)); // 🆕 WL: tanpa baris Update WL
    });
    
    // Urutkan NOP secara alfabetis
    const sortedNops = Object.keys(grouped).sort();
    
    let result = '';
    for (const nop of sortedNops) {
        result += `#NOP ${nop} :\n`;
        grouped[nop].forEach((item, idx) => {
            // Hapus nomor urut awal dari item (karena akan diganti)
            let cleanItem = item.replace(/^\d+\.\s*/, '');
            result += `${idx + 1}. ${cleanItem}\n\n`;
        });
        result += '\n';
    }
    
    return result;
}

// ================= 🆕 WL: FUNGSI BARU LAST UPDATE WORKLOG =================

// "2026-08-07 12:06:34.181" → "2026-08-07 12:06:34" (milidetik dibuang)
function formatWLTime(raw) {
    if (!raw) return "";
    const cleaned = String(raw).trim().replace(/(\d)T(\d)/, "$1 $2"); // support format ISO "T"
    const m = cleaned.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    return m ? m[1] : "";
}

// Baris jam di bawah "⏱️ Durasi".
// Label singkat: "Update WL" (alternatif lebih pendek: "Last WL").
// class no-copy → otomatis dibuang saat COPY.
function addWLLine(card, timeStr) {
    const line = document.createElement("div");
    line.className = "wl-line no-copy";
    line.innerHTML = `🕒 <b>Update WL :</b> ${timeStr}`;
    card.appendChild(line);
}

// Chip jam last update paling baru di header section JATIM / BALNUS
function setHeaderWLTime(id, times) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!times || !times.length) {
        el.textContent = "";
        el.style.display = "none";
        return;
    }
    // format "YYYY-MM-DD HH:MM:SS" aman dibandingkan sebagai string
    const latest = times.reduce((a, b) => (a > b ? a : b));
    el.textContent = `🕒 last update : ${latest}`;
    el.style.display = "";
}

// Ambil teks kartu untuk copy TANPA elemen .no-copy (baris Update WL).
// Kartu di-clone ke holder offscreen supaya innerText tetap benar (<br> jadi enter).
function getCardCopyText(card) {
    const clone = card.cloneNode(true);
    clone.querySelectorAll('.no-copy').forEach(el => el.remove());
    
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none;';
    holder.appendChild(clone);
    document.body.appendChild(holder);
    
    const txt = clone.innerText.trim();
    holder.remove();
    return txt;
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
    loadWorkzones();
    loadPICMapping();
    loadDistrictMapping();
    loadNOPDatabase();
    renderStatusFilter();
    
    // 🆕 EVENT LISTENER UNTUK CHECKBOX FILTER CRA
    const filterReg5 = document.getElementById('filterReg5');
    const filterReg4 = document.getElementById('filterReg4');
    
    if (filterReg5) {
        filterReg5.addEventListener('change', () => applyCRAFilter());
    }
    if (filterReg4) {
        filterReg4.addEventListener('change', () => applyCRAFilter());
    }
    
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
