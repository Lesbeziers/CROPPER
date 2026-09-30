/* ================================
   VER TODO — parrilla de revisión, modo ACTORES 800x800

   Para encontrar el recorte que ha salido raro en un lote de doscientos, ir
   pasando de uno en uno es buscar; verlos todos juntos es MIRAR. El que está
   mal salta solo.

   Cómo se dibuja, que tiene truco: los previews de la vista de edición se
   pintan desde una copia de trabajo de 2000 px, y de ésas sólo se guardan tres
   —ver copia.js—. Hacer eso doscientas veces sería lentísimo y llenaría la
   memoria. Aquí cada recorte se dibuja UNA vez, directamente del original a
   tamaño de miniatura, y se guarda ya revelado como JPEG: unos 20 KB cada uno
   en vez de los 360 KB que ocuparía su lienzo. Sólo se rehace el de la imagen
   que se toque.

   Y el cambio cuadrado/redondo no redibuja nada: es una máscara de CSS encima
   de los mismos píxeles.
================================ */
import { els } from './dom.js';
import { estado } from './estado.js';
import {
  LADO, ENCUADRE_NEUTRO, calcularTransformacion, aplicarTransformacion
} from './geometria.js';
import { crearLienzo, cederControl, readToken } from '../utils.js';

/* Se ve a unos 160 px, pero en pantalla retina eso son 320 reales. A 300 se
   ve nítido sin gastar de más. */
const LADO_MINIATURA = 300;

const C = { hueco: readToken('--err','#ff6b6b') };

/* registro -> {firma, jpeg}. La firma es lo que da lugar al dibujo: si cambia
   una pupila, la barbilla o el encuadre, la miniatura se rehace; si no, se
   reaprovecha. */
const revelado = new Map();
const firmaDe = rec => JSON.stringify([rec.puntos, rec.barbilla, rec.encuadre]);

/* Un único lienzo para revelarlas todas */
let taller = null;
const tallerListo = () => (taller ||= crearLienzo(LADO_MINIATURA, LADO_MINIATURA, 'preparar la parrilla de revisión'));

let alElegir = ()=>{};
export const configurarParrilla = ({ elegir }) => { alElegir = elegir || (()=>{}); };

function revelar(rec){
  const { c, cx } = tallerListo();

  cx.setTransform(1,0,0,1,0,0);
  cx.clearRect(0,0,LADO_MINIATURA,LADO_MINIATURA);
  cx.fillStyle = C.hueco;                 // lo que la foto no cubra, en rojo
  cx.fillRect(0,0,LADO_MINIATURA,LADO_MINIATURA);

  const t = calcularTransformacion(rec.puntos, rec.barbilla, rec.encuadre || ENCUADRE_NEUTRO);
  if(!t) return null;

  cx.save();
  cx.scale(LADO_MINIATURA/LADO, LADO_MINIATURA/LADO);   // del lienzo de 800 al de la miniatura
  aplicarTransformacion(cx, t, 1);                      // se dibuja del original
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(rec.img, 0, 0);
  cx.restore();

  return c.toDataURL('image/jpeg', 0.82);
}

function celdaDe(rec, i){
  const caja = document.createElement('figure');
  caja.className = 'ac-celda-caja';

  const celda = document.createElement('button');
  celda.type = 'button';
  celda.className = 'ac-celda';
  celda.title = rec.name;
  celda.onclick = ()=> alElegir(i);

  if(rec.puntos?.length !== 2){
    /* Sin pupilas no hay recorte. Se enseñan igualmente y en ámbar, porque
       son justo las que hay que encontrar. */
    celda.classList.add('ac-celda--falta');
    const aviso = document.createElement('span');
    aviso.textContent = 'FALTA';
    celda.appendChild(aviso);
  }else{
    const img = document.createElement('img');
    img.alt = '';
    celda.appendChild(img);
  }

  /* El nombre debajo. Con treinta caras iguales de tamaño, saber cuál es cuál
     sin tener que pasar el ratón por encima cambia bastante. Va sin extensión
     y con textContent, que los nombres los pone otra gente. */
  const pie = document.createElement('figcaption');
  pie.className = 'ac-celda-nombre';
  pie.textContent = rec.name.replace(/\.[^.]+$/, '');
  pie.title = rec.name;

  caja.append(celda, pie);
  return caja;
}

/* Cada repintado lleva su número: si llega otro mientras éste va por la mitad,
   el viejo se entera y se retira en vez de seguir pintando encima. */
let vuelta = 0;

export async function refrescarParrilla(){
  const mia = ++vuelta;

  els.parrilla.innerHTML = '';
  const celdas = estado.imagenes.map((rec,i)=>{
    const c = celdaDe(rec, i);
    els.parrilla.appendChild(c);
    return c;
  });

  const conRecorte = estado.imagenes.filter(r=>r.puntos?.length === 2).length;
  let hechas = 0;

  for(let i=0; i<estado.imagenes.length; i++){
    if(mia !== vuelta) return;                 // ha entrado un repintado nuevo

    const rec = estado.imagenes[i];
    if(rec.puntos?.length !== 2) continue;

    const firma = firmaDe(rec);
    let guardada = revelado.get(rec);
    if(!guardada || guardada.firma !== firma){
      try{
        const jpeg = revelar(rec);
        if(!jpeg) continue;
        guardada = { firma, jpeg };
        revelado.set(rec, guardada);
      }catch(e){
        console.warn('No se ha podido preparar la miniatura de', rec.name, e);
        continue;
      }
      await cederControl();                    // que la interfaz respire
      if(mia !== vuelta) return;
    }

    celdas[i].querySelector('img').src = guardada.jpeg;
    hechas++;
    els.revisionCuenta.textContent = hechas < conRecorte
      ? `Preparando ${hechas} de ${conRecorte}…`
      : `${conRecorte} ${conRecorte === 1 ? 'recorte' : 'recortes'}`;
  }

  els.revisionCuenta.textContent = `${conRecorte} ${conRecorte === 1 ? 'recorte' : 'recortes'}`;
}

export function olvidarParrilla(){
  revelado.clear();
  els.parrilla.innerHTML = '';
}
