/* ================================
   IA – detección de ojos del modo CARÁTULAS JUGADORES

   El algoritmo (modelo, cascada de variantes y filtro de plausibilidad) vive
   en nucleo/deteccion.js, compartido con el modo ACTORES. Aquí queda sólo el
   recorrido del lote: progreso, guardado y avisos, que son de este modo.
================================ */
import { els } from './dom.js';
import { state, recalc, save } from './state.js';
import { isCancelled, resetCancel } from './cancel.js';
import { cederControl, ErrorMemoriaLienzo } from './utils.js';
import { showEyesProgress, updateProgress, mostrarError } from './progress.js';
import { refreshList } from './list.js';
import { render } from './viewer.js';
import { updateExportButtonsVisibility } from './export.js';
import { detectEyesPoints, ensureModelReady as cargarModelo, isModelReady } from './nucleo/deteccion.js';

export { detectEyesPoints, isModelReady };

export function ensureModelReady(){
  return cargarModelo({
    alEmpezar : ()=>{ els.mdlMsg.style.display='inline'; },
    alTerminar: ()=>{ els.mdlMsg.style.display='none';  }
  });
}

export async function autoDetectBatch(items){
  // Modo "detectando ojos": miniaturas bloqueadas y semitransparentes
  state.detectingEyes = true;
  refreshList();

  await ensureModelReady();

  let done = 0;
  showEyesProgress(0, items.length);

  for (const rec of items){
    if (isCancelled()) break;

    if (!rec.points){
      try{
        const eyes = await detectEyesPoints(rec.img);
        if (isCancelled()) break;
        if (eyes){
          rec.points = [eyes.left, eyes.right];
          recalc(rec);
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

    done++;
    showEyesProgress(done, items.length);
    updateProgress(done, items.length);
    await cederControl();
  }

  refreshList();
  render();
  save();
  updateExportButtonsVisibility();

  if (isCancelled()){
    setTimeout(() => els.errMsg.style.display = 'none', 1200);
    resetCancel();
  }

  // Salimos del modo "detectando ojos"
  state.detectingEyes = false;
  refreshList();
  render();
}
