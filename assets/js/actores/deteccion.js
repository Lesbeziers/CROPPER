/* ================================
   Autodetección de pupilas por lotes — modo ACTORES 800x800

   El algoritmo es el mismo que el de carátulas y vive en nucleo/deteccion.js.
   Aquí sólo está el recorrido del lote con la interfaz de este modo.
================================ */
import { els } from './dom.js';
import { estado, guardar } from './estado.js';
import { isCancelled, resetCancel } from '../cancel.js';
import { cederControl, ErrorMemoriaLienzo } from '../utils.js';
import { progresoOjos, actualizarProgreso, mostrarError } from './progreso.js';
import { refrescarLista } from './lista.js';
import { pintar } from './visor.js';
import { pintarPreviews } from './previews.js';
import { refrescarMandos } from './mandos.js';
import { detectEyesPoints, ensureModelReady, isModelReady } from '../nucleo/deteccion.js';

export { isModelReady };

export function cargarModelo(){
  return ensureModelReady({
    alEmpezar : ()=>{ els.mdlMsg.style.display = 'inline'; },
    alTerminar: ()=>{ els.mdlMsg.style.display = 'none';   }
  });
}

export async function detectarLote(items){
  estado.detectando = true;
  refrescarLista();
  refrescarMandos();

  await cargarModelo();

  let hechas = 0;
  progresoOjos(0, items.length);

  for(const rec of items){
    if(isCancelled()) break;

    if(!rec.puntos){
      try{
        const ojos = await detectEyesPoints(rec.img);
        if(isCancelled()) break;
        if(ojos){
          rec.puntos   = [ojos.left, ojos.right];
          rec.barbilla = ojos.barbilla || null;
        }
      }catch(e){
        if(e instanceof ErrorMemoriaLienzo){
          // No seguimos: a partir de aquí todas las detecciones saldrían mal
          // sin dar la cara. Mejor parar y decirlo.
          mostrarError(`${e.message} Trabaja con menos imágenes por lote.`);
          console.error('Memoria de lienzo agotada en', rec.name, e);
          break;
        }
        console.warn('auto-ojos', rec.name, e);
      }
    }

    hechas++;
    progresoOjos(hechas, items.length);
    actualizarProgreso(hechas, items.length);
    await cederControl();
  }

  refrescarLista();
  pintar();
  pintarPreviews();
  guardar();

  if(isCancelled()){
    setTimeout(()=>{ els.errMsg.style.display = 'none'; }, 1200);
    resetCancel();
  }

  estado.detectando = false;
  refrescarLista();
  pintar();
  pintarPreviews();
  refrescarMandos();
}
