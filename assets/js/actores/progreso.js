/* ================================
   Progreso y avisos — modo ACTORES 800x800
================================ */
import { els } from './dom.js';
import { estado } from './estado.js';

/* Un error grave deja el recuadro de progreso a la vista: si se ocultara,
   el aviso desaparecería antes de que diera tiempo a leerlo. */
let hayError = false;

export function mostrarError(mensaje){
  hayError = true;
  els.errMsg.textContent = mensaje;
  els.errMsg.style.display = 'inline';
}

export function mostrarProgreso(total, avisarModelo=false){
  hayError = false;
  els.drop.style.display = 'none';
  els.progressBox.style.display = 'block';
  els.progressNum.textContent = `0 / ${total}`;
  els.progressPct.textContent = '0%';
  els.progressFill.style.width = '0%';
  els.errMsg.style.display = 'none';
  els.mdlMsg.style.display = avisarModelo ? 'inline' : 'none';
  els.phaseMsg.textContent = 'Cargando imágenes…';
  els.phaseMsg.style.display = 'inline';
}

export function actualizarProgreso(hechas, total){
  const p = total ? Math.round(hechas*100/total) : 0;
  els.progressFill.style.width = p+'%';
  els.progressNum.textContent = `${hechas} / ${total}`;
  els.progressPct.textContent = p+'%';
}

export function progresoOjos(hechas, total){
  els.progressEyes.style.display = 'inline';
  els.progressEyes.textContent = `Ojos: ${hechas} / ${total}`;
}

export function ocultarProgreso(){
  els.mdlMsg.style.display = 'none';
  if(hayError){
    els.drop.style.display = 'block';   // se puede seguir soltando imágenes
    return;                             // pero el aviso se queda
  }
  els.progressBox.style.display = 'none';
  els.drop.style.display = 'block';
  els.progressEyes.style.display = 'none';
}

export function prepararProgresoDeteccion(total){
  els.progressFill.style.width = '0%';
  els.progressNum.textContent = `0 / ${total}`;
  els.progressPct.textContent = '0%';
  els.phaseMsg.textContent = 'Detectando ojos…';
  els.phaseMsg.style.display = 'inline';
  els.mdlMsg.style.display = 'none';
}

/* ================================
   Ficheros descartados

   En el modo de carátulas, una imagen que fallaba al cargar se perdía con un
   console.warn y nada más. Aquí cada foto acabará siendo la ficha de un actor,
   así que una que desaparezca en silencio es un hueco que nadie ve hasta que
   ya está publicado. Se enumeran, con su motivo, y no se van solas.
================================ */
export function pintarDescartadas(){
  const n = estado.descartadas.length;
  if(!n){
    els.descartes.style.display = 'none';
    els.descartesTxt.innerHTML = '';
    return;
  }

  els.descartes.style.display = 'block';
  els.descartesTxt.innerHTML =
    `<strong>${n} ${n===1?'imagen no se ha podido cargar':'imágenes no se han podido cargar'}:</strong>` +
    estado.descartadas
      .map(d=>`<div class="ac-descarte"><span>${d.nombre}</span><em>${d.motivo}</em></div>`)
      .join('');
}
