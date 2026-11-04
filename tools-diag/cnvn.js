const XLSX=require("xlsx");
const UA={"user-agent":"Mozilla/5.0"};
(async()=>{
 const LIST="https://channuoivietnam.com/sys_file.ctr/get_list_file/",F="31cfb8bf-e284-494d-9354-41645b966d35";
 const j=await (await fetch(LIST,{method:"POST",headers:{...UA,"content-type":"application/json"},body:JSON.stringify({page:1,id:F})})).json();
 console.log("KEYS",Object.keys(j));
 const files=j.list_file||[];console.log("N files",files.length);
 files.slice(0,60).forEach(f=>console.log("FILE",f.ngay_xuat_ban,f.file_name));
 if(j.list_folder)console.log("FOLDERS",JSON.stringify(j.list_folder).slice(0,3000));
 const sp=files.filter(f=>/SPCN/i.test(f.file_name)).sort((a,b)=>String(b.file_name).localeCompare(a.file_name))[0];
 if(sp){const u="https://channuoivietnam.com/sys_file.ctr/downloadFile?id="+sp.id+"&file_name="+encodeURIComponent(sp.file_name);
  const buf=Buffer.from(await (await fetch(u,{headers:UA})).arrayBuffer());const wb=XLSX.read(buf,{type:"buffer"});
  for(const n of wb.SheetNames){console.log("SHEET",n);XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:""}).forEach((r,i)=>{if(r.some(c=>c!==""))console.log("R"+i,JSON.stringify(r).slice(0,300))})}}
 // thư mục gốc portal-file?
 for(const id of ["", "00000000-0000-0000-0000-000000000000"]){try{const r=await fetch(LIST,{method:"POST",headers:{...UA,"content-type":"application/json"},body:JSON.stringify({page:1,id})});console.log("ROOT",id,(await r.text()).slice(0,1500))}catch(e){console.log("ROOTERR",e.message)}}
})();
