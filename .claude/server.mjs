/* Servidor estático mínimo para desarrollo local.
   Sirve la carpeta del proyecto por ruta absoluta (el volumen de red
   no admite process.cwd() dentro del sandbox). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8777;

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.css' :'text/css; charset=utf-8',
  '.js'  :'text/javascript; charset=utf-8',
  '.mjs' :'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.wasm':'application/wasm',
  '.task':'application/octet-stream',
  '.png' :'image/png',
  '.jpg' :'image/jpeg',
  '.svg' :'image/svg+xml',
  '.woff2':'font/woff2',
  '.woff':'font/woff'
};

http.createServer((req,res)=>{
  const urlPath = decodeURIComponent(new URL(req.url,'http://x').pathname);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/,'');
  const file = path.join(ROOT, rel);

  if(!file.startsWith(ROOT)){ res.writeHead(403).end('Forbidden'); return; }

  fs.readFile(file,(err,buf)=>{
    if(err){
      console.error(`404 ${urlPath}`);
      res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('No encontrado: '+urlPath);
      return;
    }
    res.writeHead(200,{'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(buf);
  });
}).listen(PORT, ()=>console.log(`Cropper servido en http://localhost:${PORT}  (raíz: ${ROOT})`));
