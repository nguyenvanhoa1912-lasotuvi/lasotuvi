const XLSX = require("xlsx"); const fs = require("fs");
const out = []; const log = s => { out.push(s); console.log(s); };
const UA = { "user-agent": "Mozilla/5.0 (compatible; gia-ga-long-scanner/1.0)" };
(async () => {
  const r0 = await fetch("https://channuoivietnam.com/sys_file.ctr/get_list_file/", { method: "POST", headers: { ...UA, "content-type": "application/json" }, body: JSON.stringify({ page: 1, id: "31cfb8bf-e284-494d-9354-41645b966d35" }) });
  const list = (await r0.json()).list_file;
  const spcn = list.filter(f => /Thi truong SPCN ca nuoc/i.test(f.file_name));
  log(`SPCN files: ${spcn.length}; 2026: ${spcn.filter(f => f.ngay_xuat_ban >= "2026").length}; first ${spcn[spcn.length - 1]?.ngay_xuat_ban} last ${spcn[0]?.ngay_xuat_ban}`);
  log("2026 dates: " + spcn.filter(f => f.ngay_xuat_ban >= "2026").map(f => f.ngay_xuat_ban.slice(0, 10)).reverse().join(" "));
  log("name patterns: " + [...new Set(list.filter(f => /xls/i.test(f.file_name) && f.ngay_xuat_ban >= "2025").map(f => f.file_name.replace(/\d{4}\.\d{2}\.\d{2}/, "YYYY.MM.DD")))].join(" || "));
  for (const f of spcn.filter(f => /2026\.10\.13|2026\.09\.22|2026\.01\.06/.test(f.file_name))) {
    const u = "https://channuoivietnam.com/sys_file.ctr/downloadFile?id=" + f.id + "&file_name=" + encodeURIComponent(f.file_name);
    const r = await fetch(u, { headers: UA }); const b = Buffer.from(await r.arrayBuffer());
    log(`\n=== ${f.file_name} ${r.status} ${r.headers.get("content-type")} ${b.length} ${b.slice(0, 2).toString()}`);
    const wb = XLSX.read(b, { type: "buffer" });
    wb.SheetNames.forEach(sn => { const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "" }); log(`--- sheet "${sn}" ${rows.length} rows`); rows.forEach((row, k) => { if (row.some(c => String(c).trim())) log(k + ": " + row.map(c => String(c).trim()).join(" | ")); }); });
  }
  fs.writeFileSync("/tmp/probe.txt", out.join("\n"));
})().catch(e => fs.writeFileSync("/tmp/probe.txt", out.join("\n") + "\nERR " + e.stack));
