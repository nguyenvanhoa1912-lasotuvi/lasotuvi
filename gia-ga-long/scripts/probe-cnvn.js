// Tạm: tải thử file Excel giá SPCN từ channuoivietnam.com và in nội dung
const XLSX = require("xlsx"); const fs = require("fs");
const BASE = "https://channuoivietnam.com";
const H = { "content-type": "application/json", "user-agent": "Mozilla/5.0 (gia-ga-long-scanner)" };
const out = []; const log = s => { out.push(s); console.log(s); };
(async () => {
  const all = [];
  for (const page of [1, 2, 3, 4, 5, 6]) {
    const r = await fetch(BASE + "/sys_file.ctr/get_list_file/", { method: "POST", headers: H, body: JSON.stringify({ page, id: "31cfb8bf-e284-494d-9354-41645b966d35" }) });
    const j = await r.json(); const l = j.list_file || [];
    log(`PAGE ${page}: ${l.length} files; keys=${Object.keys(j).join(",")}`);
    l.forEach(f => { all.push(f); log(`  ${f.ngay_xuat_ban.slice(0, 10)} | ${f.file_name} | ${f.file_path}`); });
  }
  const pick = all.filter(f => /2026\.10\.13|2026\.10\.06|2026\.01\./.test(f.file_name)).slice(0, 4);
  for (const f of pick) {
    const r = await fetch(BASE + f.file_path, { headers: { "user-agent": H["user-agent"] } });
    const buf = Buffer.from(await r.arrayBuffer());
    log(`\n=== ${f.file_name} status ${r.status} ${r.headers.get("content-type")} bytes ${buf.length}`);
    try {
      const wb = XLSX.read(buf, { type: "buffer" });
      wb.SheetNames.forEach(sn => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "" });
        log(`--- sheet "${sn}" ${rows.length} rows`);
        rows.slice(0, 70).forEach((row, i) => { if (row.some(c => String(c).trim())) log(i + ": " + row.map(c => String(c).trim()).join(" | ")); });
      });
    } catch (e) { log("XLSX ERR " + e.message + " head=" + buf.slice(0, 16).toString("hex")); }
  }
  // Google Sheets đồ thị diễn biến giá (bảng xuất bản công khai)
  const gs = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKfC5wp3w62Dgfv81kiUxaySxbTo1dHfmLH9zbIUh6MrSFfuGkDBk1MEdjV2KWKHEBPvjOkz-qiCSZ";
  for (const u of [gs + "/pub?output=csv", gs + "/pubhtml"]) {
    const r = await fetch(u, { redirect: "follow" }); const t = await r.text();
    log(`\n=== GSHEET ${u} ${r.status} ${r.headers.get("content-type")} ${t.length}\n` + t.slice(0, 2500));
  }
  fs.writeFileSync("/tmp/probe.txt", out.join("\n"));
})().catch(e => { console.error(e); fs.writeFileSync("/tmp/probe.txt", out.join("\n") + "\nERR " + e.stack); });
