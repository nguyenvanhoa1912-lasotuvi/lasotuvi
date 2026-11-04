const UA={"user-agent":"Mozilla/5.0 (X11; Linux x86_64) Chrome/130 Safari/537.36"};
(async()=>{
 for(const s of ["ZC=F","ZM=F","ZW=F","ZS=F","VND=X"]){
  try{const r=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(s)+"?range=1y&interval=1d",{headers:UA});const t=await r.text();
   let j;try{j=JSON.parse(t)}catch(e){console.log("YF",s,r.status,t.slice(0,200));continue}
   const res=j.chart.result&&j.chart.result[0];const ts=res.timestamp||[],c=res.indicators.quote[0].close;
   console.log("YF",s,r.status,res.meta.currency,ts.length,new Date(ts[0]*1000).toISOString().slice(0,10),c[0],new Date(ts.at(-1)*1000).toISOString().slice(0,10),c.at(-1));}catch(e){console.log("YFERR",s,e.message)}}
 for(const s of ["zc.f","zm.f","zw.f"]){try{const r=await fetch("https://stooq.com/q/d/l/?s="+s+"&i=d",{headers:UA});const t=await r.text();console.log("STQ",s,r.status,t.slice(0,120).replace(/\n/g," | "),"...",t.trim().split("\n").at(-1))}catch(e){console.log("STQERR",s,e.message)}}
 const LIST="https://channuoivietnam.com/sys_file.ctr/get_list_file/",F="31cfb8bf-e284-494d-9354-41645b966d35";
 const j=await (await fetch(LIST,{method:"POST",headers:{...UA,"content-type":"application/json"},body:JSON.stringify({page:1,id:F})})).json();
 const pdf=require("pdf-parse");
 for(const name of ["NKT5.pdf","NKT5. Chitiet.pdf","grain.pdf"]){const f=(j.list_file||[]).find(x=>x.file_name===name);if(!f){console.log("NOFILE",name);continue}
  const u="https://channuoivietnam.com/sys_file.ctr/downloadFile?id="+f.id+"&file_name="+encodeURIComponent(f.file_name);
  const buf=Buffer.from(await (await fetch(u,{headers:UA})).arrayBuffer());const d=await pdf(buf);console.log("PDF",name,d.numpages);console.log(d.text.slice(0,3500));}
 // tên các file trong toàn bộ thư mục chứa "NK" hoặc "grain"
 const all=[];for(let p=1;p<=4;p++){const jj=await (await fetch(LIST,{method:"POST",headers:{...UA,"content-type":"application/json"},body:JSON.stringify({page:p,id:F})})).json();(jj.list_file||[]).forEach(x=>all.push(x));}
 all.filter(x=>!/SPCN/i.test(x.file_name)).slice(0,40).forEach(x=>console.log("OTHER",x.ngay_xuat_ban.slice(0,10),x.file_name,"|",(x.name||"").slice(0,60)));
})();
