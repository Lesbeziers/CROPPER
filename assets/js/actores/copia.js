/* ================================
   Copia de trabajo reducida — modo ACTORES 800x800

   Los originales rondan los 45 megapíxeles y la salida son 800x800. Redibujar
   los previews desde el original en cada pulsación de flecha sería tirar el
   99% del trabajo; se hace una vez una copia reducida y se dibuja de ahí.
   El original sólo se toca al exportar, donde la calidad sí importa.

   Se hace PEREZOSAMENTE y sólo para las imágenes que se están mirando: una
   copia por imagen de un lote de 200 llenaría la memoria sin que nadie la
   mire. Se guardan las últimas y las demás se sueltan.
================================ */
import { crearLienzo } from '../utils.js';

const LADO_MAXIMO = 2000;
const CUANTAS_GUARDAMOS = 3;

const cache = new Map();   // registro -> {fuente, factor}

/* `factor` es cuánto se ha encogido respecto al original: las pupilas están
   guardadas en coordenadas del original, así que quien dibuje tiene que
   multiplicarlas por él. Con factor 1 la fuente ES el original. */
export function copiaDeTrabajo(rec){
  const guardada = cache.get(rec);
  if(guardada) return guardada;

  const mayor = Math.max(rec.width, rec.height);

  let copia;
  if(mayor <= LADO_MAXIMO){
    // Ya es bastante pequeña: no vale la pena duplicarla en memoria
    copia = { fuente: rec.img, factor: 1 };
  }else{
    const factor = LADO_MAXIMO / mayor;
    const w = Math.max(1, Math.round(rec.width  * factor));
    const h = Math.max(1, Math.round(rec.height * factor));

    const {c,cx} = crearLienzo(w, h, 'preparar la copia de trabajo de la imagen');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(rec.img, 0, 0, w, h);

    copia = { fuente: c, factor };
  }

  cache.set(rec, copia);

  // Las más viejas se van; Map conserva el orden de inserción
  while(cache.size > CUANTAS_GUARDAMOS){
    cache.delete(cache.keys().next().value);
  }

  return copia;
}

export function olvidarCopias(){
  cache.clear();
}
