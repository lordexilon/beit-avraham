const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../AI_CONTEXT/pilot/workspaces');
http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 const file=path.resolve(base,'.'+name);if(!file.startsWith(base+path.sep)||!['.html','.cjs'].includes(path.extname(file))){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':path.extname(file)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'}).end(data);});
}).listen(3003,'127.0.0.1',()=>console.log('Pilot local browser server port 3003'));
