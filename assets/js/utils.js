/* ================================
   Utilidades puras y carga de ficheros
================================ */
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

/* ================================
   Ceder el control entre elementos de un lote

   Los bucles largos (cargar, detectar, exportar) sueltan el hilo en cada vuelta
   para que la interfaz respire. Antes se hacía con requestAnimationFrame, pero
   el navegador lo SUSPENDE en pestañas ocultas: al cambiar de pestaña, el lote
   se quedaba congelado hasta volver.

   Con la pestaña visible seguimos usando rAF, que sincroniza con el repintado.
   Oculta, cedemos por MessageChannel, que —a diferencia de setTimeout, limitado
   a una vez por segundo en segundo plano— no sufre estrangulamiento.
================================ */
const canal = new MessageChannel();
const cola  = [];
canal.port1.onmessage = ()=>{ cola.shift()?.(); };

export function cederControl(){
  return new Promise(resolve=>{
    if(document.visibilityState === 'visible'){
      requestAnimationFrame(()=>resolve());
    }else{
      cola.push(resolve);
      canal.port2.postMessage(0);
    }
  });
}

/* ================================
   Guardia contra lienzos en blanco

   Cuando el navegador agota su presupuesto de memoria de canvas NO lanza ningún
   error: devuelve lienzos vacíos y el proceso sigue adelante produciendo
   resultados incorrectos en silencio. Así es como una imagen dejaba de detectar
   los ojos sin que nada lo avisara.

   Estas dos funciones convierten ese fallo invisible en un error explícito.
================================ */
export class ErrorMemoriaLienzo extends Error{
  constructor(donde){
    super(`No hay memoria suficiente para ${donde}.`);
    this.name='ErrorMemoriaLienzo';
  }
}

/* Reserva un lienzo comprobando que el navegador lo ha concedido DE VERDAD.

   No basta con mirar las dimensiones ni el contexto: asignar width=100000 se
   acepta sin protestar y getContext() devuelve un contexto igualmente. El
   lienzo simplemente no tiene memoria detrás y dibujar en él no hace nada.
   Por eso escribimos un píxel y lo leemos de vuelta: si no sobrevive, el
   lienzo está muerto. */
export function crearLienzo(w,h,donde){
  const c=document.createElement('canvas');
  c.width=w; c.height=h;
  const cx=c.getContext('2d');
  if(!cx || c.width!==w || c.height!==h) throw new ErrorMemoriaLienzo(donde);

  try{
    cx.fillStyle='#fff';
    cx.fillRect(0,0,1,1);
    const vivo = cx.getImageData(0,0,1,1).data[3] !== 0;
    cx.clearRect(0,0,1,1);          // no dejamos rastro de la sonda
    if(!vivo) throw new Error();
  }catch{
    throw new ErrorMemoriaLienzo(donde);
  }

  return {c,cx};
}

/* Muestrea una rejilla en el INTERIOR del lienzo. Los originales son recortes
   con fondo transparente, así que los bordes pueden estar vacíos de forma
   legítima: sólo miramos dentro, donde siempre hay sujeto. Basta con que una
   muestra sea opaca para dar el dibujado por bueno. */
export function lienzoTieneContenido(cx,w,h,pasos=6){
  if(!(w>0&&h>0)) return false;
  try{
    for(let i=1;i<pasos;i++){
      for(let j=1;j<pasos;j++){
        const a=cx.getImageData(Math.floor(w*i/pasos),Math.floor(h*j/pasos),1,1).data[3];
        if(a!==0) return true;
      }
    }
  }catch{
    return false;   // getImageData falla si el lienzo no es válido
  }
  return false;
}

/* Lee un token de color de css/tokens.css. Lo necesitan los dibujos sobre canvas,
   que no pueden usar var(--x) y antes llevaban el color escrito a mano. */
export function readToken(name, fallback){
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function loadImage(src){
  return new Promise((res,rej)=>{
    const im=new Image();
    im.onload=()=>res(im);
    im.onerror=rej;
    im.src=src;
  });
}

export function fileToDataURL(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => rej(r.error || new Error("FileReader error"));
    r.readAsDataURL(file);
  });
}

export async function loadImageFromFile(file){
  // CSP-friendly: uses data: URL (allowed by img-src data:) instead of blob:
  const dataUrl = await fileToDataURL(file);
  const img = await loadImage(dataUrl);
  return { img, srcUrl: dataUrl };
}

/* El fondo de la miniatura queda grabado dentro del JPEG, así que no basta con CSS. */
export async function makeThumb(img,w,h){
  const c=document.createElement('canvas');
  c.width=w; c.height=h;
  const cx=c.getContext('2d');
  cx.fillStyle=readToken('--thumb-bg','#0d111a');
  cx.fillRect(0,0,w,h);

  const r=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  const dw=img.naturalWidth*r;
  const dh=img.naturalHeight*r;
  cx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);

  return c.toDataURL('image/jpeg',.8);
}
