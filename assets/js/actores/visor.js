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

/* ================================
   Vista: el desplazamiento lo manda el navegador

   El lienzo mide siempre lo que la ventana —una foto de 5464x8192 al 100% no
   cabría en uno de su tamaño—, así que la imagen no se desplaza moviendo el
   lienzo, sino cambiando el punto por el que se dibuja.

   Para que el navegador pinte barras de verdad hay un ESPACIADOR del tamaño
   de la imagen ampliada. El navegador desplaza eso, y aquí se traduce su
   posición a dónde empezar a dibujar. Cuando la imagen cabe entera, no hay
   barras y se centra.
================================ */
const hueco = () => ({ ancho: els.visor.clientWidth, alto: els.visor.clientHeight });

/* El espaciador mide exactamente la imagen ampliada, y nada más.

   OJO: no debe depender del tamaño de la ventana. Lo intenté y fue peor —
   la ventana se estrecha cuando aparece una barra, así que el espaciador
   seguía a la barra y la barra seguía al espaciador. Al ser hermano del
   lienzo y estar fuera de flujo (ver actores.css), con la imagen ajustada
   manda el lienzo y no hay nada que desplazar. */
function ajustarEspacio(){
  const c = actual();
  const z = estado.vista.zoom;
  els.espacio.style.width  = c ? `${c.width  * z}px` : '0';
  els.espacio.style.height = c ? `${c.height * z}px` : '0';
  ajustarBarras();
}

/* Las barras se encienden y se apagan a mano, no se deja que el navegador lo
   deduzca del contenido.

   Dejándoselo a él, bastaba medio píxel de más —el hueco se mide redondeando
   y la columna tiene ancho fraccionario— para que el lienzo sobresaliera,
   apareciera una barra, el hueco encogiera, el lienzo encogiera, la barra se
   fuera... y temblara, incluso sin ninguna imagen cargada.

   Diciéndolo explícitamente no hay nada que deducir: con la imagen entera a
   la vista, o sin imagen, no hay barras y no puede temblar. El margen de 1 px
   evita que el caso límite —la imagen ajustada, que mide justo lo que el
   hueco— quede en la frontera. */
function ajustarBarras(){
  const c = actual();
  const { ancho, alto } = hueco();
  const z = estado.vista.zoom;

  const hayQueDesplazar = !!c && (c.width*z > ancho + 1 || c.height*z > alto + 1);
  els.visor.style.overflow = hayQueDesplazar ? 'auto' : 'hidden';
}

/* De dónde está el scroll a por dónde empezar a dibujar. Si la imagen cabe,
   el scroll no existe y manda el centrado. */
function sincronizarConElScroll(){
  const c = actual(); if(!c) return;
  const { ancho, alto } = hueco();
  const z = estado.vista.zoom;

  estado.vista.panX = c.width  * z <= ancho ? (ancho - c.width  * z)/2 : -els.visor.scrollLeft;
  estado.vista.panY = c.height * z <= alto  ? (alto  - c.height * z)/2 : -els.visor.scrollTop;
}

/* Deja centrado el punto de la imagen que se indique */
function centrarEn(ix, iy){
  const { ancho, alto } = hueco();
  const z = estado.vista.zoom;
  els.visor.scrollLeft = ix*z - ancho/2;
  els.visor.scrollTop  = iy*z - alto /2;
  sincronizarConElScroll();
}

/* Qué punto de la imagen se está mirando ahora mismo en el centro */
function centroActual(){
  const { ancho, alto } = hueco();
  const z = estado.vista.zoom;
  return { x:(ancho/2 - estado.vista.panX)/z, y:(alto/2 - estado.vista.panY)/z };
}

export function ajustarImagen(){
  const c = actual(); if(!c) return;
  const { ancho, alto } = hueco();
  estado.vista.zoom = Math.min(ancho/c.width, alto/c.height);
  ajustarEspacio();
  sincronizarConElScroll();
  pintar();
}

export function vista100(){
  const c = actual(); if(!c) return;
  estado.vista.zoom = 1;
  ajustarEspacio();
  centrarEn(c.width/2, c.height/2);   // al 100% se entra por el centro
  pintar();
}

export function aplicarZoom(f){
  const c = actual(); if(!c) return;
  const antes = estado.vista.zoom;
  const nuevo = clamp(antes*f, 0.05, 8);
  if(nuevo === antes) return;

  const centro = centroActual();      // se conserva lo que se estaba mirando
  estado.vista.zoom = nuevo;
  ajustarEspacio();
  centrarEn(centro.x, centro.y);
  pintar();
}

/* El navegador desplaza el espaciador; aquí sólo hay que repintar */
els.visor.addEventListener('scroll', ()=>{
  if(!actual()) return;
  sincronizarConElScroll();
  pintar();
});

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
  const { ancho, alto } = hueco();
  const dpr = window.devicePixelRatio || 1;

  /* El lienzo mide lo que el hueco visible, no lo que el espaciador: hay que
     decírselo a mano, porque dentro de un contenedor más grande un 100% de CSS
     se referiría al espaciador.

     Y sólo se toca SI HA CAMBIADO. Si no, el observador de tamaño repinta,
     el repintado reescribe el tamaño, eso cuenta como cambio de disposición
     y el observador vuelve a dispararse: el navegador avisa con un
     «ResizeObserver loop» y la imagen parpadea. */
  const anchoCss = `${ancho}px`, altoCss = `${alto}px`;
  if(els.stage.style.width !== anchoCss)  els.stage.style.width  = anchoCss;
  if(els.stage.style.height !== altoCss)  els.stage.style.height = altoCss;

  const px = Math.floor(ancho * dpr), py = Math.floor(alto * dpr);
  if(els.stage.width !== px)  els.stage.width  = px;
  if(els.stage.height !== py) els.stage.height = py;
  else                        ctx.clearRect(0,0,px,py);   // cambiar width ya lo limpia

  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,ancho,alto);

  if(!c){
    ctx.fillStyle = C.vacio;
    ctx.fillRect(0,0,ancho,alto);
    return;
  }

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
    inicioVista = {x:els.visor.scrollLeft, y:els.visor.scrollTop};
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
    /* El arrastre con espacio o botón derecho sigue existiendo, pero ahora
       mueve el SCROLL: así las barras acompañan al arrastre en vez de
       contradecirlo. Se arrastra la imagen, luego el scroll va al revés. */
    els.visor.scrollLeft = inicioVista.x - (ev.clientX - inicioPan.x);
    els.visor.scrollTop  = inicioVista.y - (ev.clientY - inicioPan.y);
    return;   // el repintado lo dispara el propio scroll
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

/* ---------- Redimensionado ----------
   Se observa el VISOR, no el lienzo: el lienzo ahora toma su tamaño de él, así
   que observarlo sería preguntarle a la consecuencia en vez de a la causa. */
let ultimoHueco = { ancho:0, alto:0 };

new ResizeObserver(()=>{
  // Sólo si el hueco ha cambiado de verdad: así una notificación repetida no
  // provoca otro repintado que vuelva a notificar.
  const { ancho, alto } = hueco();
  if(ancho === ultimoHueco.ancho && alto === ultimoHueco.alto) return;
  ultimoHueco = { ancho, alto };

  ajustarEspacio();            // también apaga las barras cuando no hay imagen
  if(actual()) sincronizarConElScroll();
  pintar();
}).observe(els.visor);

/* Al arrancar no hay imagen: nada que desplazar, ninguna barra. */
ajustarEspacio();
