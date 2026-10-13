const UA={headers:{"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}};
const get=async (u,o={})=>{try{const r=await fetch(u,{...UA,...o});const t=await r.text();console.log("GET",u,r.status,r.headers.get("content-type"),t.length);return t}catch(e){console.log("ERR",u,e.message);return ""}};
const strip=s=>s.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
(async()=>{
 const h=await get("https://channuoivietnam.com/");
 const srcs=[...h.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]);console.log("SCRIPTS",srcs);
 for(const s of srcs){const js=await get(new URL(s,"https://channuoivietnam.com/").href);
   const urls=[...new Set(js.match(/https?:\/\/[a-zA-Z0-9.\-]+(\/[a-zA-Z0-9_\-\/.]*)?/g)||[])].filter(u=>!/w3\.org|angular|google|github|mozilla/.test(u));
   if(urls.length)console.log("URLS in",s,urls.slice(0,60));
   const api=[...new Set(js.match(/["'`][^"'`]{0,60}(api|portal-file|Portal|getFile|price|gia)[^"'`]{0,80}["'`]/gi)||[])].slice(0,80);console.log("APIHINTS",api.join("\n"));}
 for(const ty of ["vat-nuoi-price","con-giong-price"]){
  const g=await get(`https://www.greenfeed.com.vn/thuc-an-chan-nuoi-gia-suc-gia-cam/en/market-price/?type=${ty}&date=2026-10-08`);
  const t=(g.match(/<table[\s\S]*?<\/table>/)||[""])[0];
  const heads=[...t.matchAll(/<th[^>]*?(colspan="(\d+)")?[^>]*>([\s\S]*?)<\/th>/g)].map(m=>(m[2]||"1")+":"+strip(m[3]));console.log(ty,"HEADS",heads.join(" | "));
  const rows=[...t.matchAll(/<tr class="region"[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x=>strip(x[1])).join(" ; "));console.log(ty,"REGION ROWS\n"+rows.join("\n"));
 }
 const v=await get("https://www.greenfeed.com.vn/thuc-an-chan-nuoi-gia-suc-gia-cam/bang-gia-thi-truong/?type=vat-nuoi-price&date=2026-10-08");
 const tv=(v.match(/<table[\s\S]*?<\/table>/)||[""])[0];console.log("VI HEADS",[...tv.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m=>strip(m[1])).join(" | "));
 console.log("VI REGION",[...tv.matchAll(/<tr class="region"[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>strip(m[1])).join("\n"));
})();
