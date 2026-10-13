// Tạm thời: in mẫu HTML nguồn để viết bộ đọc bảng giá
const UA={headers:{"user-agent":"Mozilla/5.0 (compatible; gia-ga-long-scanner/1.0; +https://nguyenvanhoa1912-lasotuvi.github.io/lasotuvi/gia-ga-long/)"}};
const get=async u=>{const r=await fetch(u,UA);console.log("GET",u,r.status);return r.text()};
(async()=>{
 const l=await get("https://nguoichannuoi.vn/thi-truong/gia-ca/page/2/");
 console.log([...new Set(l.match(/https:\/\/nguoichannuoi\.vn\/gia-san-pham[^"'\s]+/g)||[])]);
 const t=await get("https://nguoichannuoi.vn/gia-san-pham-chan-nuoi-gia-tai-trai-ca-nuoc-ngay-22-09-2026/");
 const i=t.search(/l(ô|&ocirc;)ng m(à|&agrave;)u/i);console.log("IDX",i);console.log(t.slice(Math.max(0,i-3000),i+2500));
 const g=await get("https://www.greenfeed.com.vn/thuc-an-chan-nuoi-gia-suc-gia-cam/en/market-price/");
 const j=g.search(/NORTHERN REGION/i);console.log("GIDX",j);console.log(g.slice(Math.max(0,j-6000),j+1500));
 const gv=await get("https://www.greenfeed.com.vn/thuc-an-chan-nuoi-gia-suc-gia-cam/gia-thi-truong/");
 const k=gv.search(/MIỀN BẮC|Miền Bắc/);console.log("GVIDX",k);console.log(gv.slice(Math.max(0,k-3000),k+800));
 const n=await get("https://news.google.com/rss/search?q=%22gi%C3%A1+g%C3%A0%22+when:7d&hl=vi&gl=VN&ceid=VN:vi");console.log(n.slice(0,1500));
})();
