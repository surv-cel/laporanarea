// ===== DATABASE WORKZONE =====
const DB_JATIM = new Set([ /* daftar JATIM */ ]);
const DB_BALNUS = new Set([ /* daftar BALNUS */ ]);

// ===== CSV PARSER =====
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length) return [];

  let delimiter=',';
  if(lines[0].includes(';')) delimiter=';';
  else if(lines[0].includes('\t')) delimiter='\t';

  const headers = lines.shift().split(delimiter).map(h=>h.trim());

  return lines.map(l=>{
    const cols=l.split(delimiter);
    const o={};
    headers.forEach((h,i)=>o[h]=cols[i]?.trim()||'');
    return o;
  });
}

// ===== HANDLE FILE =====
document.getElementById("fileInput").addEventListener("change",e=>{
  const file=e.target.files[0];
  if(!file) return;
  const r=new FileReader();
  r.onload=()=>processData(r.result);
  r.readAsText(file);
});

function processData(csv){
  const data=parseCSV(csv);
  const jatim=document.querySelector("#jatim .content");
  const balnus=document.querySelector("#balnus .content");
  jatim.innerHTML=""; balnus.innerHTML="";

  let d=0,f=0,g=0,noJ=1,noB=1;

  data.forEach(row=>{
    const summary=row["SUMMARY"]||"";
    const update=row["WORKLOG SUMMARY"]||"-";
    const zone=(row["WORKZONE"]||"").toUpperCase();

    if(summary.includes("DISTRIBUSI")) d++;
    if(summary.includes("FEEDER")) f++;
    if(summary.includes("GPON")) g++;

    const card=document.createElement("div");
    card.className="card";

    if(DB_JATIM.has(zone)){
      card.innerHTML=`<b>${noJ++}. ${row["INCIDENT"]}</b><br>${summary}<br><br><b>Update :</b> ${update}`;
      jatim.appendChild(card);
    } else if(DB_BALNUS.has(zone)){
      card.innerHTML=`<b>${noB++}. ${row["INCIDENT"]}</b><br>${summary}<br><br><b>Update :</b> ${update}`;
      balnus.appendChild(card);
    }
  });

  document.getElementById("distriCount").textContent=`DISTRIBUSI : ${d}`;
  document.getElementById("feederCount").textContent=`FEEDER : ${f}`;
  document.getElementById("gponCount").textContent=`GPON : ${g}`;

  if(!jatim.children.length) jatim.innerHTML=`<div class="empty">Tidak ada data JATIM</div>`;
  if(!balnus.children.length) balnus.innerHTML=`<div class="empty">Tidak ada data BALNUS</div>`;
}

// ===== THEME =====
document.getElementById("themeToggle").onclick=()=>{
  document.body.classList.toggle("light");
  themeToggle.textContent=document.body.classList.contains("light")?"☀️ Light":"🌙 Dark";
};
