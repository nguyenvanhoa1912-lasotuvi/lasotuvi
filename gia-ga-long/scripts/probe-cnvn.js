const { chromium } = require("playwright"); const fs = require("fs");
const out = []; const log = s => { out.push(s); console.log(s); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  const seen = [];
  ctx.on("request", r => { const u = r.url(); if (!/\.(png|jpe?g|gif|svg|woff2?|css|ico|js)(\?|$)/i.test(u) && !/fonts\.|zalo|zdn|i18n/.test(u)) seen.push(r.method() + " " + u + (r.postData() ? " POST=" + r.postData().slice(0, 300) : "")); });
  ctx.on("page", np => log("NEW PAGE " + np.url()));
  await p.goto("https://channuoivietnam.com/portal-file/31cfb8bf-e284-494d-9354-41645b966d35", { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(3000);
  const html = await p.evaluate(() => { const el = [...document.querySelectorAll("*")].find(e => e.children.length < 6 && /13\/10\/2026/.test(e.textContent)); let c = el; for (let i = 0; i < 4 && c && c.parentElement; i++) c = c.parentElement; return c ? c.outerHTML.slice(0, 4000) : "none"; });
  log("ITEM HTML\n" + html);
  seen.length = 0;
  const dlP = p.waitForEvent("download", { timeout: 15000 }).catch(() => null);
  const anchors = await p.$$("a"); let target=null; for (const a of anchors){ const t=(await a.textContent()||"").trim(); if(/Thị trường chăn nuôi trong nước/.test(t)){target=a;break} }
  log("anchor outer: " + (target ? await target.evaluate(e=>e.outerHTML.slice(0,800)) : "none"));
  if (target) await target.click().catch(e=>log("click "+e.message));
  await p.waitForTimeout(5000);
  log("URL after click " + p.url());
  log("REQS after click\n" + seen.join("\n"));
  const dl = await dlP; if (dl) { log("DOWNLOAD url=" + dl.url() + " name=" + dl.suggestedFilename()); }
  const btns = await p.evaluate(() => [...document.querySelectorAll("a,button")].filter(e => /tải|download|xem|file/i.test(e.textContent + (e.getAttribute("href") || ""))).map(e => e.tagName + " " + e.textContent.trim().slice(0, 60) + " href=" + (e.getAttribute("href") || "")));
  log("BUTTONS\n" + btns.join("\n"));
  const iframes = await p.evaluate(() => [...document.querySelectorAll("iframe")].map(f => f.src));
  log("IFRAMES " + iframes.join("\n"));
  log("TEXT\n" + (await p.evaluate(() => document.body.innerText)).slice(0, 2500));
  fs.writeFileSync("/tmp/probe.txt", out.join("\n")); await b.close();
})().catch(e => fs.writeFileSync("/tmp/probe.txt", out.join("\n") + "\nERR " + e.stack));
