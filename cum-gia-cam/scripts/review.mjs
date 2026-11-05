// Ghi quyết định xác minh tin (Có/Không) từ issue "[review]" của chủ repo vào cum-gia-cam/review.json
import { readFileSync, writeFileSync } from "node:fs";
const body = process.env.ISSUE_BODY || "";
const m = body.match(/```json\s*([\s\S]*?)```/);
if (!m) { console.log("Không thấy khối JSON"); process.exit(1); }
const d = JSON.parse(m[1]);
const F = "cum-gia-cam/review.json";
const R = JSON.parse(readFileSync(F, "utf8"));
const sc = d.scope === "world" ? "world" : d.scope === "vn" ? "vn" : null;
if (!sc || !d.key || typeof d.key !== "string" || d.key.length > 80) { console.log("Dữ liệu không hợp lệ"); process.exit(1); }
const S = R[sc] || (R[sc] = { ignore: [], confirm: [] });
const clip = (v, n) => typeof v === "string" ? v.slice(0, n) : v;
if (!S.ignore.some(x => x.key === d.key)) S.ignore.push({ key: d.key, title: clip(d.title, 300), link: clip(d.link || (d.record && d.record.url), 600), date: clip(d.date || (d.record && d.record.date), 10), action: d.action, at: new Date().toISOString() });
if (d.action === "confirm" && d.record && typeof d.record === "object") {
  const r = {};
  for (const k of ["id", "prov", "a3", "area", "date", "dt", "strain", "host", "events", "sick", "dead", "cull", "url", "src", "note"]) if (d.record[k] !== undefined) r[k] = typeof d.record[k] === "string" ? d.record[k].slice(0, 600) : d.record[k];
  if (r.id && !S.confirm.some(x => x.id === r.id)) S.confirm.push(r);
}
writeFileSync(F, JSON.stringify(R, null, 1) + "\n");
console.log("Đã lưu", sc, d.action, d.key);
