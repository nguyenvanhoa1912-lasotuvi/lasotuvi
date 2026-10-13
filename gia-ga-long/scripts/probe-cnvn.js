// Tạm: dò cấu trúc channuoivietnam.com/portal-file bằng trình duyệt thật
const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const out = [];
  const log = s => { out.push(s); console.log(s); };
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const reqs = [];
  p.on("response", async r => {
    const u = r.url(); const ct = r.headers()["content-type"] || "";
    if (/\.(png|jpe?g|gif|svg|woff2?|css|ico)(\?|$)/i.test(u) || /fonts\.g|zalo|google-analytics|googletagmanager/.test(u)) return;
    let body = "";
    if (/json|text\/plain/.test(ct)) { try { body = (await r.text()).slice(0, 3000); } catch (e) {} }
    reqs.push({ m: r.request().method(), s: r.status(), u, ct, post: (r.request().postData() || "").slice(0, 500), body });
  });
  await p.goto("https://channuoivietnam.com/portal-file/31cfb8bf-e284-494d-9354-41645b966d35", { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(5000);
  log("TITLE " + await p.title());
  log("TEXT\n" + (await p.evaluate(() => document.body.innerText)).slice(0, 6000));
  const links = await p.evaluate(() => [...document.querySelectorAll("a")].map(a => (a.textContent.trim().slice(0, 80) + " | " + a.href)).filter(x => !/^\s*\|/.test(x)));
  log("LINKS\n" + links.slice(0, 150).join("\n"));
  log("REQS");
  reqs.forEach(r => log(`${r.m} ${r.s} ${r.u} [${r.ct}]${r.post ? " POST=" + r.post : ""}\n${r.body}`));
  await p.screenshot({ path: "/tmp/cnvn.png", fullPage: true });
  // thử bấm vào phần tử đầu tiên có chữ 'gà' hoặc '.xls'
  const cand = await p.$$("text=/xls|Excel|giá/i");
  log("CANDIDATES " + cand.length);
  fs.writeFileSync("/tmp/probe.txt", out.join("\n"));
  await b.close();
})().catch(e => { console.error(e); fs.writeFileSync("/tmp/probe.txt", "ERR " + e.stack); });
