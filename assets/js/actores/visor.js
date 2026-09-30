/* ================================
   Visor del original — modo ACTORES 800x800

   La zona de medir: enseña la foto tal cual y deja colocar y arrastrar las dos
   pupilas. El ZOOM de este visor es el que MIRA —agrandar la foto para afinar
   los puntos—, y no tiene nada que ver con la ESCALA del encuadre de salida,
   que vivirá en el panel de la derecha.
================================ */
import { els, ctx } from './dom.js';
import { estado, actual } from './estado.js';
import { barbillaPorDefecto } from './geometria.js';
import { recordar } from './historial.js';
import { clamp, readToken } from '../utils.js';

/* El canvas no entiende var(--x): los colores se leen de tokens.css */
const C = {
  pt1      : readToken('--pt-1','#7fe39a'),
  pt2      : readToken('--pt-2','#ffd166'),
  ptStroke : readToken('--pt-stroke','rgba(0,0,0,.6)'),
  pupilLine: readToken('--pupil-line','rgba(233,166,60,.95)'),
  barbilla : readToken('--barbilla-medida','#4fc3f7'),
  vacio    : readToken('--stage-empty','#0d0d0d')
};

/* `alArrastrar` se dispara en cada movimiento del ratón y sólo debe repintar
   los previews: tiene que ser barato. `alSoltar` se dispara al terminar y ya
   puede refrescar la lista y guardar. */
let alArrastrar = ()=>{};
let alSoltar    = ()=>{};
export function configurarVisor({ arrastrando, soltar }){
  alArrastrar = arrastrando || (()=>{});
  alSoltar    = soltar     || (()=>{});
}

/* El punto de barbilla que se ve y se puede agarrar. Si el detector lo
   encontró, es el suyo; si no, uno estimado que deja el encuadre como si no
   hubiera corrección, para que siempre haya algo que arrastrar. */
export const barbillaVisible = rec => rec?.barbilla || barbillaPorDefecto(rec?.puntos);

/* Los dos modos pueden estar cargados a la vez (portada → A → portada → B),
   y ambos escuchan en window. Sin esta guarda, el visor del modo oculto
   respondería igualmente al teclado y al ratón. */
const estaVisible = () => els.stage.offsetParent !== null;

/* ---------- Vista ---------- */
export function recalcularEncuadreVista(){
  const c = actual(); if(!c) return;
  const r = els.stage.getBoundingClientRect();

  if(estado.vista.modo === 'fit'){
    estado.vista.panX = (r.width  - c.width  * estado.vista.zoom)/2;
    estado.vista.panY = (r.height - c.height * estado.vista.zoom)/2;
  }else if(estado.vista.modo === '100'){
    estado.vista.panX = (r.width - c.width * estado.vista.zoom)/2;
    estado.vista.panY = 0;
  }
}

export function ajustarImagen(){
  const c = actual(); if(!c) return;
  const r = els.stage.getBoundingClientRect();
  estado.vista.zoom = Math.min(r.width/c.width, r.height/c.height);
  estado.vista.modo = 'fit';
  recalcularEncuadreVista();
  pintar();
}

export function vista100(){
  const c = actual(); if(!c) return;
  estado.vista.zoom = 1;
  estado.vista.modo = '100';
  recalcularEncuadreVista();
  pintar();
}

export function aplicarZoom(f){
  if(!actual()) return;
  const r = els.stage.getBoundingClientRect();
  const antes = estado.vista.zoom;
  estado.vista.zoom = clamp(estado.vista.zoom*f, 0.05, 8);
  const factor = estado.vista.zoom/antes;

  estado.vista.panX = r.width /2 + (estado.vista.panX - r.width /2)*factor;
  estado.vista.panY = r.height/2 + (estado.vista.panY - r.height/2)*factor;

  estado.vista.modo = 'custom';
  pintar();
}

/* ---------- Pintado ---------- */
function pupila(p, color, zoom){
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6/zoom, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2/zoom;
  ctx.strokeStyle = C.ptStroke;
  ctx.stroke();
}

/* Hueco = estimado, relleno = puesto por el detector o por el usuario. La
   diferencia importa: un punto estimado no dice nada sobre la cara, sólo
   marca dónde habría que arrastrarlo. */
function marcaHueca(p, color, zoom){
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6/zoom, 0, Math.PI*2);
  ctx.lineWidth = 2/zoom;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function pintar(){
  const c = actual();
  const r = els.stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  els.stage.width  = Math.floor(r.width  * dpr);
  els.stage.height = Math.floor(r.height * dpr);

  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,r.width,r.height);

  if(!c){
    ctx.fillStyle = C.vacio;
    ctx.fillRect(0,0,r.width,r.height);
    return;
  }

  if(estado.vista.modo !== 'custom') recalcularEncuadreVista();

  ctx.save();
  ctx.translate(estado.vista.panX, estado.vista.panY);
  ctx.scale(estado.vista.zoom, estado.vista.zoom);

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c.img, 0, 0, c.width, c.height);

  const z = estado.vista.zoom;

  /* La barbilla, en el mismo azul que la línea de los previews. Se puede
     arrastrar: el detector marca el mentón óseo, y en una cara con barba o con
     papada eso queda por encima de lo que el ojo llama barbilla. */
  const bar = barbillaVisible(c);
  if(bar){
    if(c.barbilla) pupila(bar, C.barbilla, z);
    else           marcaHueca(bar, C.barbilla, z);
  }

  if(c.puntos?.[0]) pupila(c.puntos[0], C.pt1, z);
  if(c.puntos?.[1]) pupila(c.puntos[1], C.pt2, z);

  if(c.puntos?.length === 2){
    ctx.setLineDash([6/z, 6/z]);
    ctx.strokeStyle = C.pupilLine;
    ctx.lineWidth = 2/z;
    ctx.beginPath();
    ctx.moveTo(c.puntos[0].x, c.puntos[0].y);
    ctx.lineTo(c.puntos[1].x, c.puntos[1].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/* ---------- Interacción ---------- */
const pantallaAImagen = (x,y)=>{
  const rect = els.stage.getBoundingClientRect();
  return {
    x: (x - rect.left - estado.vista.panX)/estado.vista.zoom,
    y: (y - rect.top  - estado.vista.panY)/estado.vista.zoom
  };
};

let arrastrando = -1;
let desfase = {x:0,y:0};
let paneando = false;
let inicioPan = null;
let inicioVista = null;
let teclaMano = false;

function actualizarCursor(){
  els.stage.style.cursor = paneando ? 'grabbing' : (teclaMano ? 'grab' : 'default');
}

window.addEventListener('keydown', e=>{
  if(!estaVisible()) return;
  if(e.code === 'Space'){ teclaMano = true; actualizarCursor(); }
});
window.addEventListener('keyup', e=>{
  if(e.code === 'Space'){ teclaMano = false; actualizarCursor(); }
});

els.stage.addEventListener('contextmenu', e=>e.preventDefault());

els.stage.addEventListener('mousedown', ev=>{
  const c = actual(); if(!c) return;
  if(estado.detectando) return;

  if(ev.button === 2 || (ev.button === 0 && teclaMano)){
    paneando = true;
    inicioPan = {x:ev.clientX, y:ev.clientY};
    inicioVista = {x:estado.vista.panX, y:estado.vista.panY};
    estado.vista.modo = 'custom';
    actualizarCursor();
    return;
  }

  const {x,y} = pantallaAImagen(ev.clientX, ev.clientY);
  const alcance = 12/estado.vista.zoom;

  /* Una sola foto del estado por GESTO, aquí y no en cada movimiento del
     ratón: si no, un arrastre llenaría el historial de pasos intermedios. */
  recordar(c);

  if(c.puntos){
    const tocado = c.puntos.findIndex(p=>Math.hypot(p.x-x,p.y-y) < alcance);
    if(tocado > -1){
      arrastrando = tocado;
      desfase = {x:c.puntos[tocado].x - x, y:c.puntos[tocado].y - y};
      return;
    }
  }

  // La barbilla se agarra igual que una pupila. Si era la estimada, al tocarla
  // pasa a ser suya: desde ese momento la decide el usuario.
  const bar = barbillaVisible(c);
  if(bar && Math.hypot(bar.x - x, bar.y - y) < alcance){
    c.barbilla = {x:bar.x, y:bar.y};
    arrastrando = 'barbilla';
    desfase = {x:bar.x - x, y:bar.y - y};
    return;
  }

  if(!c.puntos) c.puntos = [];

  // Con las dos pupilas ya puestas, un clic fuera empieza de cero
  if(c.puntos.length >= 2) c.puntos = [{x,y}];
  else                     c.puntos.push({x,y});

  pintar();
  alArrastrar();
  alSoltar();

  arrastrando = c.puntos.length - 1;
  desfase = {x:0, y:0};
});

window.addEventListener('mousemove', ev=>{
  if(!estaVisible()) return;
  const c = actual(); if(!c) return;

  if(paneando){
    estado.vista.panX = inicioVista.x + (ev.clientX - inicioPan.x);
    estado.vista.panY = inicioVista.y + (ev.clientY - inicioPan.y);
    pintar();
    return;
  }

  if(arrastrando !== -1){
    const {x,y} = pantallaAImagen(ev.clientX, ev.clientY);
    const p = {
      x: clamp(x + desfase.x, 0, c.width),
      y: clamp(y + desfase.y, 0, c.height)
    };
    if(arrastrando === 'barbilla') c.barbilla = p;
    else                           c.puntos[arrastrando] = p;

    pintar();
    alArrastrar();   // los previews siguen el arrastre en vivo
  }else{
    actualizarCursor();
  }
});

window.addEventListener('mouseup', ()=>{
  if(!estaVisible()) return;
  const soltabaAlgo = arrastrando !== -1;
  paneando = false;
  arrastrando = -1;
  actualizarCursor();
  if(soltabaAlgo) alSoltar();
});

els.stage.addEventListener('mouseleave', ()=>{
  if(!paneando) els.stage.style.cursor = 'default';
});

/* ---------- Redimensionado ---------- */
new ResizeObserver(()=>{
  if(actual() && estado.vista.modo !== 'custom') recalcularEncuadreVista();
  pintar();
}).observe(els.stage);
