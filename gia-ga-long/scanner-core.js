/* scanner-core.js — Bộ đọc nguồn giá gà lông dùng chung cho trình duyệt và GitHub Actions (Node 20).
   Không gọi mạng: chỉ nhận chuỗi HTML/XML và trả về dữ liệu đã chuẩn hoá.
   Quy ước số: đ/kg, số nguyên. Miền: Bac | Trung | Nam (GreenFeed: Nam = Đông Nam Bộ, lưu thêm Tây Nam Bộ). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GAGL_CORE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var NCN_LIST_PAGES = function (n) {
    var out = ["https://nguoichannuoi.vn/thi-truong/gia-ca/"];
    for (var i = 2; i <= n; i++) out.push("https://nguoichannuoi.vn/thi-truong/gia-ca/page/" + i + "/");
    return out;
  };
  var GF_BASE = "https://www.greenfeed.com.vn/thuc-an-chan-nuoi-gia-suc-gia-cam/bang-gia-thi-truong/";
  var GF_URL = function (date) { return GF_BASE + "?type=vat-nuoi-price" + (date ? "&date=" + date : ""); };
  var NEWS_RSS = "https://news.google.com/rss/search?q=%22gi%C3%A1+g%C3%A0%22+when:7d&hl=vi&gl=VN&ceid=VN:vi";
  var RANGE = { min: 8000, max: 200000 };

  function decode(s) {
    return String(s || "")
      .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); })
      .replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
  }
  function strip(html) {
    return decode(String(html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  }
  function fold(s) { // bỏ dấu, chữ thường — để so khớp nhãn
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  }
  function toInt(s) { // "47.700" | "47,700" | "-2.300" -> số nguyên; "-3,7" (phần trăm) -> null
    var t = String(s || "").trim().replace(/\s/g, "");
    if (!/^-?\d{1,3}([.,]\d{3})+$|^-?\d+$/.test(t)) return null;
    return parseInt(t.replace(/[.,]/g, ""), 10);
  }
  function rows(html) {
    var out = [], m, re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    while ((m = re.exec(html))) {
      var cells = [], c, rc = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      while ((c = rc.exec(m[1]))) cells.push(strip(c[1]));
      out.push({ raw: m[0], cells: cells });
    }
    return out;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(y, m, d) { return y + "-" + pad(+m) + "-" + pad(+d); }
  function okPrice(v) { return typeof v === "number" && v >= RANGE.min && v <= RANGE.max; }

  /* ---------- Tạp chí Chăn nuôi VN (nguoichannuoi.vn) ---------- */
  var NCN_POST_RE = /https:\/\/nguoichannuoi\.vn\/gia-san-pham-chan-nuoi-[a-z-]*?ngay-(\d{1,2})-(\d{1,2})-(\d{4})\/?/gi;
  function parseNcnListing(html) {
    var seen = {}, out = [], m;
    NCN_POST_RE.lastIndex = 0;
    while ((m = NCN_POST_RE.exec(html))) {
      var url = m[0].replace(/\/?$/, "/");
      if (seen[url]) continue; seen[url] = 1;
      out.push({ url: url, date: iso(m[3], m[2], m[1]) });
    }
    return out;
  }
  function dateFromNcnUrl(url) {
    var m = /ngay-(\d{1,2})-(\d{1,2})-(\d{4})/.exec(url || "");
    return m ? iso(m[3], m[2], m[1]) : null;
  }
  /* Trả về {date, url, mau:{Bac,Trung,Nam}, trang:{...}, mauBQ, trangBQ, warnings[]} hoặc null */
  function parseNcnTable(html, url) {
    var res = { date: dateFromNcnUrl(url), url: url, mau: {}, trang: {}, mauBQ: {}, trangBQ: {}, warnings: [] };
    var h1 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(strip((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [])[1] || ""));
    if (h1) { var d1 = iso(h1[3], h1[2], h1[1]); if (res.date && d1 !== res.date) res.warnings.push("Ngày tiêu đề " + d1 + " khác ngày trên link"); res.date = res.date || d1; }
    var found = 0;
    rows(html).forEach(function (r) {
      if (r.cells.length < 3) return;
      var lab = fold(r.cells[0]);
      var reg = /mien bac/.test(lab) ? "Bac" : /mien trung/.test(lab) ? "Trung" : /mien nam/.test(lab) ? "Nam" : null;
      if (!reg) return;
      var kind = /ga thit long mau/.test(lab) ? "mau" : /ga chuyen thit|ga (cong nghiep )?long trang/.test(lab) ? "trang" : null;
      if (!kind) return;
      var nums = r.cells.slice(1).map(toInt).filter(function (v) { return v !== null; });
      var day = nums[0], avg = nums[1];
      if (!okPrice(day)) { res.warnings.push("Giá ngày ngoài khoảng hợp lý: " + r.cells.join(" | ")); return; }
      res[kind][reg] = day; if (okPrice(avg)) res[kind + "BQ"][reg] = avg; found++;
    });
    if (found < 6) { res.warnings.push("Chỉ đọc được " + found + "/6 dòng gà"); }
    return found ? res : null;
  }


  /* ---------- Chăn nuôi Việt Nam (channuoivietnam.com): file Excel gốc "Thi truong SPCN ca nuoc" ---------- */
  var CNVN = {
    LIST: "https://channuoivietnam.com/sys_file.ctr/get_list_file/",
    FOLDER: "31cfb8bf-e284-494d-9354-41645b966d35",
    DL: function (f) { return "https://channuoivietnam.com/sys_file.ctr/downloadFile?id=" + f.id + "&file_name=" + encodeURIComponent(f.file_name); },
    PAGE: "https://channuoivietnam.com/portal-file/31cfb8bf-e284-494d-9354-41645b966d35"
  };
  function cnvnFiles(json) { // lọc file bảng giá tại trại cả nước
    return ((json && json.list_file) || []).filter(function (f) { return /thi truong spcn ca nuoc/i.test(fold(f.file_name)) && /\.xlsx?$/i.test(f.file_name); })
      .map(function (f) { var m = /(\d{4})\.(\d{2})\.(\d{2})/.exec(f.file_name); return { id: f.id, file_name: f.file_name, date: m ? iso(m[1], m[2], m[3]) : String(f.ngay_xuat_ban || "").slice(0, 10), url: CNVN.DL(f) }; });
  }
  /* rows: mảng các dòng (mảng ô) đọc từ Sheet1. Trả về cùng dạng parseNcnTable */
  function parseSpcnRows(rows, url, dateHint) {
    var res = { date: dateHint || null, url: url, mau: {}, trang: {}, mauBQ: {}, trangBQ: {}, warnings: [] }, found = 0;
    (rows || []).forEach(function (r) {
      var cells = (r || []).map(function (c) { return String(c == null ? "" : c).trim(); });
      var t = /ngay\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(fold(cells[0] || ""));
      if (t && /gia san pham chan nuoi/.test(fold(cells[0]))) { var d = iso(t[3], t[2], t[1]); if (res.date && d !== res.date) res.warnings.push("Ngày trong file " + d + " khác ngày tên file " + res.date); res.date = d; return; }
      var lab = fold(cells[0] || "");
      var reg = /mien bac/.test(lab) ? "Bac" : /mien trung/.test(lab) ? "Trung" : /mien nam/.test(lab) ? "Nam" : null; if (!reg) return;
      var kind = /ga thit long mau/.test(lab) ? "mau" : /ga chuyen thit|ga (cong nghiep )?long trang/.test(lab) ? "trang" : null; if (!kind) return;
      var day = toInt(cells[2]), avg = toInt(cells[3]);
      if (!okPrice(day)) { res.warnings.push("Giá ngày ngoài khoảng hợp lý: " + cells.join(" | ")); return; }
      res[kind][reg] = day; if (okPrice(avg)) res[kind + "BQ"][reg] = avg; found++;
    });
    if (found < 6) res.warnings.push("Chỉ đọc được " + found + "/6 dòng gà");
    return found ? res : null;
  }

  /* ---------- GreenFeed: bảng giá thị trường (sản phẩm chăn nuôi) ---------- */
  function parseGfDates(html) {
    var out = [], m, re = /type=vat-nuoi-price&(?:amp;)?date=(\d{4}-\d{2}-\d{2})/g, seen = {};
    while ((m = re.exec(html))) if (!seen[m[1]]) { seen[m[1]] = 1; out.push(m[1]); }
    return out.sort();
  }
  /* Trả về {date, url, mau:{Bac,Trung,Nam,TNB}, trang:{...}, warnings[]} hoặc null */
  function parseGfTable(html, url) {
    var t = (/<table[\s\S]*?<\/table>/i.exec(html) || [])[0];
    if (!t) return null;
    var head = (/<thead[\s\S]*?<\/thead>/i.exec(t) || [""])[0];
    var hr = rows(head);
    if (hr.length < 2) return null;
    var groups = hr[0].cells.slice(1).map(fold), subs = hr[1].cells.map(fold);
    // Mỗi nhóm có 1 cột (chỉ ngày) hoặc 2 cột (ngày + kỳ trước). Dò theo hàng tiêu đề phụ.
    var idx = {}, col = 0, si = 0, date = null;
    groups.forEach(function (g) {
      var dm = /(\d{2})-(\d{2})-(\d{4})/.exec(subs[si] || ""); if (dm && !date) date = iso(dm[3], dm[2], dm[1]);
      var w = /ky truoc|previous/.test(subs[si + 1] || "") ? 2 : 1;
      if (/ga mau|native hybrid/.test(g)) idx.mau = col;
      if (/ga trang|broiler/.test(g)) idx.trang = col;
      col += w; si += w;
    });
    if (idx.mau == null || idx.trang == null) return null;
    var res = { date: date, url: url, mau: {}, trang: {}, warnings: [] };
    rows(t).forEach(function (r) {
      if (!/class="region"/.test(r.raw) || r.cells.length < 4) return;
      var name = fold(r.cells[0]);
      var reg = /mien bac|northern/.test(name) ? "Bac" : /mien trung|central/.test(name) ? "Trung" : /dong nam|southeast/.test(name) ? "Nam" : /tay nam|southwest/.test(name) ? "TNB" : null;
      if (!reg) return;
      var vals = r.cells.slice(1);
      var m = toInt(vals[idx.mau]), tr = toInt(vals[idx.trang]);
      if (okPrice(m)) res.mau[reg] = m; else res.warnings.push("GreenFeed gà màu " + reg + " không đọc được");
      if (okPrice(tr)) res.trang[reg] = tr; else res.warnings.push("GreenFeed gà trắng " + reg + " không đọc được");
    });
    return (res.date && (res.mau.Bac || res.trang.Bac)) ? res : null;
  }

  /* ---------- RSS (Google News hoặc RSS bất kỳ) ---------- */
  function parseRss(xml) {
    var out = [], m, re = /<item>([\s\S]*?)<\/item>/gi;
    var tag = function (s, n) { var r = new RegExp("<" + n + "[^>]*>([\\s\\S]*?)<\\/" + n + ">", "i").exec(s); return r ? decode(r[1].replace(/<!\[CDATA\[|\]\]>/g, "")).trim() : ""; };
    while ((m = re.exec(xml))) {
      var title = strip(tag(m[1], "title")), link = tag(m[1], "link"), pub = tag(m[1], "pubDate"), src = strip(tag(m[1], "source"));
      var d = pub ? new Date(pub) : null;
      out.push({ title: title, url: link, date: d && !isNaN(d) ? d.toISOString().slice(0, 10) : null, source: src });
    }
    return out;
  }

  /* ---------- Nguồn bổ sung: trích câu có giá gà ---------- */
  var PRICE_RE = /(\d{2,3}[.,]\d{3}|\d{2,3}(?:[.,]\d)?\s*(?:nghìn|ngàn))\s*(?:-|–|đến)?\s*(\d{2,3}[.,]\d{3})?\s*(?:đồng|đ|vnđ|vnd)?\s*\/\s*kg/i;
  function pageDate(html) {
    var m = /article:published_time"\s+content="(\d{4}-\d{2}-\d{2})/i.exec(html) || /datetime="(\d{4}-\d{2}-\d{2})/i.exec(html) || /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i.exec(html);
    return m ? m[1] : null;
  }
  function pageTitle(html) { return strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || "").slice(0, 160); }
  function extractMentions(html, url, max) {
    var text = strip(String(html || "").replace(/<head[\s\S]*?<\/head>/i, " ").replace(/<title[\s\S]*?<\/title>/gi, " ").replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " "));
    var sents = text.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ỹ0-9])/);
    var out = [];
    for (var i = 0; i < sents.length && out.length < (max || 6); i++) {
      var s = sents[i];
      if (s.length > 400) continue;
      if (!/(^|[^\p{L}])gà($|[^\p{L}])/iu.test(s) || !PRICE_RE.test(s)) continue;
      var f = fold(s);
      var kind = /long trang|cong nghiep|chuyen thit|ga trang|broiler/.test(f) ? "trang" : /long mau|ga mau|ga lai|native/.test(f) ? "mau" : /ga ta|tha vuon|ga ri|ga mia|ga doi/.test(f) ? "ta" : "khac";
      var reg = /mien bac|phia bac|ha noi|thai nguyen|bac giang|bac ninh/.test(f) ? "Bac" : /mien trung|tay nguyen|thanh hoa|nghe an/.test(f) ? "Trung" : /mien nam|phia nam|dong nai|dong nam bo|tp\.? ?hcm|tay nam bo/.test(f) ? "Nam" : null;
      out.push({ text: s, kind: kind, region: reg });
    }
    return { url: url, title: pageTitle(html), date: pageDate(html), mentions: out };
  }
  function classify(url) {
    if (/channuoivietnam\.com\/portal-file/i.test(url)) return "cnvn-list";
    if (/nguoichannuoi\.vn\/gia-san-pham-chan-nuoi-/i.test(url)) return "ncn-table";
    if (/nguoichannuoi\.vn\/thi-truong\/gia-ca/i.test(url)) return "ncn-list";
    if (/greenfeed\.com\.vn\/.*(bang-gia-thi-truong|market-price)/i.test(url)) return "gf-table";
    if (/\.rss|\/rss|\/feed\/?$|format=rss|news\.google\.com\/rss/i.test(url)) return "rss";
    return "page";
  }

  /* ---------- Hợp nhất & kiểm tra ---------- */
  /* weekly: [[date, màuB, màuT, màuN, trắngB, trắngT, trắngN]]; thêm/ghi đè theo ngày, đánh dấu lệch mạnh */
  function mergeNcn(data, rec, origin) {
    var row = [rec.date, rec.mau.Bac, rec.mau.Trung, rec.mau.Nam, rec.trang.Bac, rec.trang.Trung, rec.trang.Nam];
    if (row.slice(1).some(function (v) { return !okPrice(v); })) return { added: false, reason: "thiếu dòng" };
    var w = data.weekly, i = w.findIndex(function (r) { return r[0] === rec.date; });
    var changed = i < 0 || w[i].join() !== row.join();
    if (i < 0) w.push(row); else w[i] = row;
    w.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    // tự đánh dấu cần xác minh: lệch >25% so với kỳ liền trước cùng loại × miền
    var k = w.findIndex(function (r) { return r[0] === rec.date; });
    data.flags = data.flags || [];
    if (k > 0) {
      var prev = w[k - 1], keys = [["mau", "Bac", 1], ["mau", "Trung", 2], ["mau", "Nam", 3], ["trang", "Bac", 4], ["trang", "Trung", 5], ["trang", "Nam", 6]];
      keys.forEach(function (kk) {
        var a = prev[kk[2]], b = row[kk[2]];
        if (a && Math.abs(b - a) / a > 0.25 && !data.flags.some(function (f) { return f[0] === rec.date && f[1] === kk[0] && f[2] === kk[1]; }))
          data.flags.push([rec.date, kk[0], kk[1], "auto: lệch " + Math.round((b - a) / a * 100) + "% so với kỳ " + prev[0]]);
      });
    }
    data.meta = data.meta || {}; data.meta.origin = data.meta.origin || {}; data.meta.origin[rec.date] = origin;
    if (rec.url) { data.meta.src = data.meta.src || {}; data.meta.src[rec.date] = rec.url; }
    return { added: i < 0, changed: changed };
  }
  function mergeGf(data, rec) {
    var row = [rec.date, rec.mau.Bac, rec.mau.Trung, rec.mau.Nam, rec.trang.Bac, rec.trang.Trung, rec.trang.Nam, rec.mau.TNB || null, rec.trang.TNB || null];
    data.gf = data.gf || [];
    var i = data.gf.findIndex(function (r) { return r[0] === rec.date; });
    var changed = i < 0 || data.gf[i].join() !== row.join();
    if (i < 0) data.gf.push(row); else data.gf[i] = row;
    data.gf.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    return { added: i < 0, changed: changed };
  }

  return {
    CNVN: CNVN, cnvnFiles: cnvnFiles, parseSpcnRows: parseSpcnRows,
    NCN_LIST_PAGES: NCN_LIST_PAGES, GF_URL: GF_URL, NEWS_RSS: NEWS_RSS,
    strip: strip, fold: fold, toInt: toInt,
    parseNcnListing: parseNcnListing, parseNcnTable: parseNcnTable, dateFromNcnUrl: dateFromNcnUrl,
    parseGfDates: parseGfDates, parseGfTable: parseGfTable,
    parseRss: parseRss, extractMentions: extractMentions, classify: classify,
    mergeNcn: mergeNcn, mergeGf: mergeGf, okPrice: okPrice
  };
});
