/* ================================
   Carga de imágenes — modo ACTORES 800x800

   Diferencia deliberada con el modo de carátulas: aquí NADA se descarta en
   silencio. Ni los ficheros que no son imagen, ni los que fallan al leerse.
   Cada foto acabará siendo la ficha de un actor, así que una que se pierda
   por el camino es un hueco que no se ve hasta que ya está publicado.
================================ */
import { estado, nuevoRegistro, guardar } from './estado.js';
import { isCancelled, resetCancel } from '../cancel.js';
import { loadImageFromFile, makeThumb, cederControl, ErrorMemoriaLienzo } from '../utils.js';
import {
  mostrarProgreso, actualizarProgreso, ocultarProgreso,
  prepararProgresoDeteccion, pintarDescartadas
} from './progreso.js';
import { refrescarLista } from './lista.js';
import { pintar, ajustarImagen } from './visor.js';
import { pintarPreviews } from './previews.js';
import { refrescarMandos } from './mandos.js';
import { detectarLote, isModelReady } from './deteccion.js';

/* Los fallos de carga llegan de sitios distintos —FileReader, decodificación
   de la imagen, memoria de lienzo— y no todos traen un mensaje legible. */
function motivoDe(e){
  if(e instanceof ErrorMemoriaLienzo) return e.message;
  if(e?.message) return e.message;
  return 'No se ha podido leer el fichero (¿formato no soportado o dañado?)';
}

function descartar(nombre, motivo){
  estado.descartadas.push({ nombre, motivo });
  console.warn('Imagen descartada:', nombre, '—', motivo);
}

export async function anadirFicheros(ficheros){
  resetCancel();

  const todos = [...ficheros];
  const imagenes = [];

  for(const f of todos){
    if(f.type.startsWith('image/')) imagenes.push(f);
    else descartar(f.name, 'No es un fichero de imagen');
  }

  pintarDescartadas();
  if(!imagenes.length) return;

  mostrarProgreso(imagenes.length, !isModelReady());
  let hechas = 0;

  for(const f of imagenes){
    if(isCancelled()) break;

    try{
      const { img, srcUrl } = await loadImageFromFile(f);
      if(isCancelled()) break;

      const thumbUrl = await makeThumb(img, 56, 56);
      if(isCancelled()) break;

      const rec = nuevoRegistro({
        name  : f.name,
        blobUrl: srcUrl,
        img,
        width : img.naturalWidth,
        height: img.naturalHeight,
        thumbUrl
      });

      const previo = estado._restaurado?.get(f.name);
      /* Se recuperan las medidas, no el encuadre: ver estado.js. Una foto
         vuelta a soltar arranca con su encuadre automático y sin lápiz. */
      if(previo?.puntos?.length === 2){
        rec.puntos   = previo.puntos;
        rec.barbilla = previo.barbilla || null;
      }

      estado.imagenes.push(rec);
    }catch(e){
      descartar(f.name, motivoDe(e));
    }

    hechas++;
    actualizarProgreso(hechas, imagenes.length);
    await cederControl();
  }

  if(estado.idx < 0 && estado.imagenes.length){
    estado.idx = 0;
    ajustarImagen();
  }

  refrescarLista();
  pintar();
  pintarPreviews();
  refrescarMandos();
  pintarDescartadas();
  guardar();

  if(isCancelled()){
    ocultarProgreso();
    resetCancel();
    return;
  }

  prepararProgresoDeteccion(estado.imagenes.length);
  await detectarLote(estado.imagenes);

  ocultarProgreso();
  pintarDescartadas();
}
