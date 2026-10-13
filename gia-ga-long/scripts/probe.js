const UA={headers:{"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}};
const get=async u=>{try{const r=await fetch(u,UA);const ct=r.headers.get("content-type");const b=Buffer.from(await r.arrayBuffer());console.log("GET",u,r.status,ct,b.length);return {ct,b,t:b.toString("utf8")}}catch(e){console.log("ERR",u,e.message);return {t:""}}};
(async()=>{
 const f=await get("https://channuoivietnam.com/portal-file/31cfb8bf-e284-494d-9354-41645b966d35");
 console.log("HEAD-BYTES",f.b&&f.b.slice(0,8).toString("hex"));console.log(f.t.slice(0,3000));
 const h=await get("https://channuoivietnam.com/");
 console.log([...new Set(h.t.match(/href="[^"]*"/g)||[])].filter(x=>/gia|portal|bang|thi-truong|price/i.test(x)).slice(0,80).join("\n"));
 const g=await get("https://www.greenfeed.com.vn/thuc-an-chan-nuoi-gia-suc-gia-cam/en/market-price/");
 const tabs=g.t.match(/<table[\s\S]*?<\/table>/g)||[];console.log("TABLES",tabs.length);
 tabs.forEach((x,i)=>{if(/chicken|gà/i.test(x))console.log("TABLE",i,x.length,"\n",x.slice(0,6000))});
 const sel=g.t.match(/<select[\s\S]*?<\/select>/g)||[];console.log("SELECTS",sel.map(s=>s.slice(0,1500)).join("\n----\n"));
 const fm=g.t.match(/<form[\s\S]{0,1500}/g)||[];console.log("FORMS",fm.slice(0,3).join("\n----\n"));
 const a=await get("https://www.greenfeed.com.vn/thuc-an-chan-nuoi-gia-suc-gia-cam/en/ngay-09-10-2026-gia-heo-hoi-cat-da-giam-tren-toan-quoc-gia-ga-ri-tai-mien-bac-giam-nhe/");
 const k=a.t.search(/chicken/i);console.log("ART",k);const body=(a.t.match(/<div class="[^"]*(entry|content|article)[^"]*"[\s\S]{0,12000}/)||[""])[0];console.log(body.replace(/<script[\s\S]*?<\/script>/g,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,4000));
})();
