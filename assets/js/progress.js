/* ================================
   Barra de progreso (carga y detección)
================================ */
import { els } from './dom.js';

/* Un error grave deja el recuadro de progreso a la vista: si se ocultara,
   el aviso desaparecería antes de que diera tiempo a leerlo. */
let hayError=false;

export function mostrarError(mensaje){
  hayError=true;
  els.errMsg.textContent=mensaje;
  els.errMsg.style.display='inline';
}

export function showProgress(total,msgModel=false){
  hayError=false;
  els.drop.style.display='none';
  els.progressBox.style.display='block';
  els.progressNum.textContent=`0 / ${total}`;
  els.progressPct.textContent='0%';
  els.progressFill.style.width='0%';
  els.errMsg.style.display='none';
  els.mdlMsg.style.display=msgModel?'inline':'none';
  els.phaseMsg.textContent='Cargando imágenes…';
  els.phaseMsg.style.display='inline';
}

export function updateProgress(done,total){
  const p=Math.round(done*100/total);
  els.progressFill.style.width=p+'%';
  els.progressNum.textContent=`${done} / ${total}`;
  els.progressPct.textContent=p+'%';
}

export function showEyesProgress(done,total){
  els.progressEyes.style.display='inline';
  els.progressEyes.textContent=`Ojos: ${done} / ${total}`;
}

export function hideProgress(){
  els.mdlMsg.style.display='none';
  if(hayError){
    els.drop.style.display='block';   // se puede seguir soltando imágenes
    return;                           // pero el aviso se queda
  }
  els.progressBox.style.display='none';
  els.drop.style.display='block';
  els.progressEyes.style.display='none';
}

export function resetProgressForDetection(total){
  els.progressFill.style.width='0%';
  els.progressNum.textContent=`0 / ${total}`;
  els.progressPct.textContent='0%';
  els.phaseMsg.textContent='Detectando ojos…';
  els.phaseMsg.style.display='inline';
  els.mdlMsg.style.display='none';
}
