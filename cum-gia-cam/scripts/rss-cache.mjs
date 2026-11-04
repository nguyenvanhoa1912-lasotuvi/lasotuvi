// Quét tin cúm gia cầm phía máy chủ (GitHub Actions): chạy đúng logic quét của 2 trang bản đồ
// trong trình duyệt không giao diện, lấy RSS trực tiếp (không qua proxy công cộng), lưu kết quả vào rss-cache.json.
// Khi người dùng mở trang/app, trang đọc rss-cache.json trước nên có tin ngay, không phụ thuộc proxy.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(DIR, "rss-cache.json");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const strip = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const KEEP = /cum gia cam|cum a|h5n\d|h7n\d|h9n2|bird flu|avian|hpai|influenza/;

let prev = {};
try { prev = JSON.parse(readFileSync(OUT, "utf8")).feeds || {}; } catch (e) {}
const feeds = {};
let ok = 0, fail = 0, items = 0;

async function getRaw(u) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(u, { headers: { "user-agent": UA, accept: "application/rss+xml,text/xml,*/*" }, signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.text();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}
function filterItems(xml) {
  const its = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  // bỏ thẻ có tiền tố namespace (vd. News:Source của Bing) để trang đọc lại không lỗi XML
  return its.filter(it => KEEP.test(strip(it.replace(/<[^>]+>/g, " ")))).map(it => it.replace(/<\/?[A-Za-z][\w-]*:[^>]*>/g, "")).join("");
}

const browser = await chromium.launch();
for (const page of ["index.html", "the-gioi.html"]) {
  const ctx = await browser.newContext({ userAgent: UA });
  const p = await ctx.newPage();
  await p.route(/rss-cache\.json/, r => r.abort());
  await p.route(/allorigins\.win|corsproxy\.io|codetabs\.com/, async route => {
    const q = new URL(route.request().url());
    const target = q.searchParams.get("url") || q.searchParams.get("quest");
    if (!target) return route.abort();
    const raw = await getRaw(target);
    if (raw == null) {
      fail++;
      if (prev[target] != null) feeds[target] = prev[target]; // giữ kết quả lần trước nếu lần này lỗi
      return route.fulfill({ status: 502, body: "" });
    }
    ok++;
    const f = filterItems(raw);
    items += (f.match(/<item>/g) || []).length;
    feeds[target] = f;
    return route.fulfill({ status: 200, contentType: "text/xml; charset=utf-8", body: raw });
  });
  await p.goto("file://" + path.join(DIR, page), { waitUntil: "load", timeout: 120000 });
  // chờ trang quét xong (nút Quét được bật lại và đã có kết quả)
  await p.waitForFunction(() => { try { return lastScan !== null && !document.getElementById("btnScan").disabled; } catch (e) { return false; } }, null, { timeout: 600000, polling: 2000 }).catch(() => console.log("Hết thời gian chờ", page));
  console.log(page, "→", await p.evaluate(() => document.getElementById("scanStatus")?.textContent));
  await ctx.close();
}
await browser.close();

const out = { at: new Date().toISOString(), ok, fail, items, feeds };
writeFileSync(OUT, JSON.stringify(out));
console.log(`Xong: ${ok} nguồn RSS đọc được, ${fail} lỗi, ${items} tin liên quan, ${Object.keys(feeds).length} truy vấn lưu cache`);
if (ok === 0) process.exit(1);
