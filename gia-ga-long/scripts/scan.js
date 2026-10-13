// scan.js — Quét nguồn giá gà lông và cập nhật gia-ga-long/data.json (chạy trên GitHub Actions, Node 20+).
// Chạy tay: node gia-ga-long/scripts/scan.js
"use strict";
const fs = require("fs");
const path = require("path");
const C = require("../scanner-core.js");

const DIR = path.join(__dirname, "..");
const DATA = path.join(DIR, "data.json");
const SRC = path.join(DIR, "sources.json");
const UA = { "user-agent": "Mozilla/5.0 (compatible; gia-ga-long-scanner/1.0; +https://nguyenvanhoa1912-lasotuvi.github.io/lasotuvi/gia-ga-long/)", "accept-language": "vi,en;q=0.8" };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.text();
      log(`HTTP ${r.status} ${url}`);
      if (r.status < 500) return null;
    } catch (e) { log(`Lỗi tải ${url}: ${e.message}`); }
    await sleep(2000);
  }
  return null;
}
const LOG = [];
function log(s) { console.log(s); LOG.push(s); }

(async () => {
  const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const cfg = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const before = JSON.stringify({ w: data.weekly, g: data.gf, n: data.news, m: data.mentions, f: data.flags });
  const stats = { ncnNew: [], gfNew: 0, news: 0, mentions: 0, errors: 0 };
  const have = new Set(data.weekly.map(r => r[0]));

  // 1) Tạp chí Chăn nuôi VN: danh mục Giá cả -> bảng giá tại trại chưa có
  const posts = [];
  for (const u of C.NCN_LIST_PAGES(cfg.ncn_list_pages || 3)) {
    const h = await get(u); if (!h) { stats.errors++; continue; }
    C.parseNcnListing(h).forEach(p => { if (!posts.some(x => x.url === p.url)) posts.push(p); });
    await sleep(800);
  }
  (cfg.extra || []).filter(s => C.classify(s.url) === "ncn-table").forEach(s => {
    const d = C.dateFromNcnUrl(s.url); if (d && !posts.some(x => x.url === s.url)) posts.push({ url: s.url, date: d });
  });
  log(`Tạp chí Chăn nuôi: thấy ${posts.length} bảng giá trong danh mục`);
  for (const p of posts.filter(p => !have.has(p.date) && p.date >= "2026-01-01")) {
    const h = await get(p.url); if (!h) { stats.errors++; continue; }
    const rec = C.parseNcnTable(h, p.url);
    if (!rec) { log(`Không đọc được bảng ${p.url}`); continue; }
    rec.warnings.forEach(w => log(`  ⚠ ${rec.date}: ${w}`));
    const r = C.mergeNcn(data, rec, "auto");
    if (r.added) { stats.ncnNew.push(rec.date); log(`  + ${rec.date}: trắng ${rec.trang.Bac}/${rec.trang.Trung}/${rec.trang.Nam} · màu ${rec.mau.Bac}/${rec.mau.Trung}/${rec.mau.Nam}`); }
    else if (r.reason) log(`  bỏ qua ${rec.date}: ${r.reason}`);
    await sleep(800);
  }

  // 2) GreenFeed: bảng giá thị trường theo ngày
  const gfHave = new Set((data.gf || []).map(r => r[0]));
  const gfIndex = await get(C.GF_URL());
  if (gfIndex) {
    const dates = C.parseGfDates(gfIndex).filter(d => d >= "2026-01-01").slice(-(cfg.gf_backfill_dates || 60));
    const todo = dates.filter(d => !gfHave.has(d));
    log(`GreenFeed: ${dates.length} ngày có bảng giá, cần đọc ${todo.length}`);
    for (const d of todo) {
      const h = await get(C.GF_URL(d)); if (!h) { stats.errors++; continue; }
      const rec = C.parseGfTable(h, C.GF_URL(d));
      if (!rec) { log(`  Không đọc được GreenFeed ${d}`); continue; }
      if (rec.date !== d) log(`  ⚠ GreenFeed ${d}: bảng ghi ngày ${rec.date}`);
      rec.date = d;
      if (C.mergeGf(data, rec).added) stats.gfNew++;
      await sleep(600);
    }
  } else stats.errors++;

  // 3) Tin tức (RSS)
  const news = [];
  for (const u of (cfg.news_rss || [C.NEWS_RSS])) {
    const x = await get(u); if (!x) { stats.errors++; continue; }
    C.parseRss(x).forEach(it => { if (it.title && !news.some(n => n.title === it.title)) news.push(it); });
  }
  for (const s of (cfg.extra || []).filter(s => C.classify(s.url) === "rss")) {
    const x = await get(s.url); if (!x) { stats.errors++; continue; }
    C.parseRss(x).filter(it => /gà/i.test(it.title)).forEach(it => { if (!news.some(n => n.title === it.title)) news.push({ ...it, source: it.source || s.name }); });
  }
  news.sort((a, b) => (b.date || "") < (a.date || "") ? -1 : 1);
  data.news = news.slice(0, 25); stats.news = data.news.length;

  // 4) Nguồn bổ sung dạng trang: trích câu có giá gà
  const mentions = [];
  for (const s of (cfg.extra || []).filter(s => C.classify(s.url) === "page")) {
    const h = await get(s.url); if (!h) { stats.errors++; mentions.push({ url: s.url, name: s.name, error: true, mentions: [] }); continue; }
    const m = C.extractMentions(h, s.url, 8); m.name = s.name || m.title; mentions.push(m);
    await sleep(600);
  }
  data.mentions = mentions; stats.mentions = mentions.reduce((a, m) => a + m.mentions.length, 0);

  // Ghi
  const now = new Date().toISOString();
  data.meta.lastScan = now;
  const after = JSON.stringify({ w: data.weekly, g: data.gf, n: data.news, m: data.mentions, f: data.flags });
  const summary = `Bảng giá mới: ${stats.ncnNew.length ? stats.ncnNew.join(", ") : "không"} · GreenFeed mới: ${stats.gfNew} ngày · tin: ${stats.news} · câu trích nguồn bổ sung: ${stats.mentions} · lỗi tải: ${stats.errors}`;
  log(summary);
  data.log = [{ at: now, summary, newTables: stats.ncnNew, gfNew: stats.gfNew, errors: stats.errors, detail: LOG.slice(-40) }].concat(data.log || []).slice(0, 30);
  if (after !== before) data.meta.updated = now;
  fs.writeFileSync(DATA, JSON.stringify(data, null, 1));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Quét giá gà lông\n${summary}\n\n\`\`\`\n${LOG.join("\n")}\n\`\`\`\n`);
})().catch(e => { console.error(e); process.exit(1); });
