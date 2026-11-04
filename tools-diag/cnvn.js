const UA={"user-agent":"Mozilla/5.0 (X11; Linux x86_64) Chrome/130 Safari/537.36"};
(async()=>{
 for(const id of ["PMAIZMTUSDM","PSMEAUSDM","PWHEAMTUSDM","PSOYBUSDM","PRICENPQUSDM"]){
  try{const r=await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id="+id,{headers:UA});const t=await r.text();const L=t.trim().split("\n");console.log("FRED",id,r.status,L[0],L.length,L.slice(-14).join(" ; "))}catch(e){console.log("FREDERR",id,e.message)}}
 try{const r=await fetch("https://open.er-api.com/v6/latest/USD");const j=await r.json();console.log("ER",j.result,j.time_last_update_utc,j.rates&&j.rates.VND)}catch(e){console.log("ERERR",e.message)}
 try{const r=await fetch("https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx",{headers:UA});const t=await r.text();console.log("VCB",r.status,(t.match(/CurrencyCode="USD"[^>]*/)||[t.slice(0,200)])[0])}catch(e){console.log("VCBERR",e.message)}
 for(const q of ['"giá thức ăn chăn nuôi"','"tăng giá thức ăn" OR "giảm giá thức ăn" chăn nuôi','"giá cám" gà OR heo']){
  const u="https://news.google.com/rss/search?q="+encodeURIComponent(q+" when:365d")+"&hl=vi&gl=VN&ceid=VN:vi";
  try{const t=await (await fetch(u,{headers:UA})).text();const it=t.match(/<item>[\s\S]*?<\/item>/g)||[];console.log("GN",q,it.length);it.slice(0,40).forEach(x=>{const ti=(x.match(/<title>([\s\S]*?)<\/title>/)||[])[1];const d=(x.match(/<pubDate>([\s\S]*?)<\/pubDate>/)||[])[1];console.log("  -",new Date(d).toISOString().slice(0,10),ti)})}catch(e){console.log("GNERR",e.message)}}
})();
