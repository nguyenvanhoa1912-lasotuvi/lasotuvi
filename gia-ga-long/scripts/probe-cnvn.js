const XLSX = require("xlsx"); const fs = require("fs");
const out = []; const log = s => { out.push(s); console.log(s); };
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36" };
async function tryGet(u, opt = {}) { try { const r = await fetch(u, { headers: { ...UA, ...(opt.headers || {}) }, method: opt.method || "GET", body: opt.body, redirect: "follow" }); const b = Buffer.from(await r.arrayBuffer()); log(`TRY ${opt.method || "GET"} ${u} -> ${r.status} ${r.headers.get("content-type")} ${b.length} head=${b.slice(0, 4).toString("hex")}`); return { r, b }; } catch (e) { log(`TRY ${u} ERR ${e.message}`); return {}; } }
(async () => {
  const js = (await (await fetch("https://channuoivietnam.com/main.e48b6e072486c4c6e7e9.js", { headers: UA })).text());
  let i = -1, n = 0; while ((i = js.indexOf("FileManager", i + 1)) >= 0 && n < 12) { log("JS@" + i + ": " + js.slice(Math.max(0, i - 300), i + 200).replace(/\s+/g, " ")); n++; }
  ["apiUrl", "baseUrl", "base_url", "urlApi", "host:", "environment", "downloadFile", "file_path"].forEach(k => { let j = js.indexOf(k); if (j >= 0) log("KEY " + k + ": " + js.slice(Math.max(0, j - 200), j + 250).replace(/\s+/g, " ")); });
  const fp = "/FileManager/Download/?filename=%5cThi+truong+SPCN+ca+nuoc.+Phuong.+2026.10.13.xlsx";
  for (const host of ["https://channuoivietnam.com", "https://channuoivietnam.worldsoft.com.vn", "https://www.channuoivietnam.com", "http://channuoivietnam.com"]) {
    const { b } = await tryGet(host + fp, { headers: { referer: "https://channuoivietnam.com/portal-file/31cfb8bf-e284-494d-9354-41645b966d35", accept: "application/octet-stream,*/*" } });
    if (b && b.slice(0, 2).toString() === "PK") {
      const wb = XLSX.read(b, { type: "buffer" });
      wb.SheetNames.forEach(sn => { const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "" }); log(`--- sheet "${sn}" ${rows.length}`); rows.slice(0, 60).forEach((row, k) => { if (row.some(c => String(c).trim())) log(k + ": " + row.map(c => String(c).trim()).join(" | ")); }); });
      break;
    }
  }
  await tryGet("https://channuoivietnam.com" + fp.replace("/Download/", "/download/"));
  await tryGet("https://channuoivietnam.com/FileManager/Download", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: "\\Thi truong SPCN ca nuoc. Phuong. 2026.10.13.xlsx" }) });
  const ph = await (await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vQKfC5wp3w62Dgfv81kiUxaySxbTo1dHfmLH9zbIUh6MrSFfuGkDBk1MEdjV2KWKHEBPvjOkz-qiCSZ/pubhtml")).text();
  log("GS TABS " + [...ph.matchAll(/gid=(\d+)[^>]*>([^<]{1,80})</g)].map(m => m[1] + ":" + m[2]).join(" || "));
  log("GS sheet-menu " + [...ph.matchAll(/id="sheet-button-(\d+)"[\s\S]{0,200}?>([^<]+)</g)].map(m => m[1] + ":" + m[2]).join(" || "));
  fs.writeFileSync("/tmp/probe.txt", out.join("\n"));
})().catch(e => { fs.writeFileSync("/tmp/probe.txt", out.join("\n") + "\nERR " + e.stack); });
