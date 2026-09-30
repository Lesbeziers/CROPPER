/* ================================
   MODO — Carátulas de jugadores

   Distancia interpupilar objetivo: 195 px.
   Cablea la herramienta y expone init()/activar() a la carcasa (main.js).
================================ */
import { els } from '../dom.js';
import { state, recalc, save, LS_KEY } from '../state.js';
import { requestCancel } from '../cancel.js';
import { addFiles } from '../loader.js';
import { refreshList } from '../list.js';
import { render, fitView, view100, applyZoom } from '../viewer.js';
import { exportScaledImages, exportCsv, updateExportButtonsVisibility } from '../export.js';
import { mostrarPortada } from '../router.js';
import { confirmar } from '../modal.js';

let iniciado = false;

export function init(){
  if(iniciado) return;
  iniciado = true;

  /* ---------- Volver a portada (reinicia el proyecto) ---------- */
  els.volverPortada.addEventListener('click', async ()=>{
    const ok = await confirmar({
      titulo : 'Volver a la portada',
      mensaje: 'Todo el proyecto se reiniciará: perderás las imágenes cargadas y las pupilas que hayas colocado.',
      aceptar: 'VOLVER A PORTADA'
    });
    if(!ok) return;
    reiniciarProyecto();
    mostrarPortada();
  });

  /* ---------- Cancelar ---------- */
  els.cancelDetect.addEventListener('click', ()=>{
    requestCancel();
    els.errMsg.textContent='Proceso cancelado por el usuario.';
    els.errMsg.style.display='inline';
  });

  /* ---------- Distancia objetivo ---------- */
  els.target.addEventListener('input',()=>{
    const v=parseFloat(els.target.value);
    if(!isNaN(v)&&v>0){
      state.targetDist=v;
      state.images.forEach(recalc);
      render();
      refreshList();
      save();
    }
  });

  /* ---------- Navegación ---------- */
  els.prev.addEventListener('click',()=>{
    if(state.images.length){
      state.idx=(state.idx-1+state.images.length)%state.images.length;
      render();
      refreshList();
    }
  });
  els.next.addEventListener('click',()=>{
    if(state.images.length){
      state.idx=(state.idx+1)%state.images.length;
      render();
      refreshList();
    }
  });

  /* ---------- Puntos y proyecto ---------- */
  els.clearPts.addEventListener('click',()=>{
    const c=state.images[state.idx]; if(!c) return;
    c.points=null;
    recalc(c);
    render();
    refreshList();
    save();
    updateExportButtonsVisibility();
  });

  els.clearAll.addEventListener('click', async ()=>{
    const ok = await confirmar({
      titulo : 'Reiniciar proyecto',
      mensaje: 'Se eliminarán todas las imágenes y sus mediciones. Esta acción no se puede deshacer.',
      aceptar: 'REINICIAR'
    });
    if(!ok) return;
    reiniciarProyecto();
  });

  /* ---------- Vista ---------- */
  els.fit.addEventListener('click',fitView);
  els.resetView.addEventListener('click',view100);
  els.zoomIn.addEventListener('click',()=>applyZoom(1.2));
  els.zoomOut.addEventListener('click',()=>applyZoom(1/1.2));

  /* ---------- Export ---------- */
  els.exportScale.addEventListener('click', exportScaledImages);
  els.exportCsv.addEventListener('click', exportCsv);

  /* ---------- Drag & Drop ---------- */
  window.addEventListener('dragover',e=>e.preventDefault());
  window.addEventListener('drop',e=>e.preventDefault());

  els.drop.addEventListener('dragover',e=>{
    e.preventDefault();
    els.drop.classList.add('drag');
  });
  els.drop.addEventListener('dragleave',()=>els.drop.classList.remove('drag'));
  els.drop.addEventListener('drop',e=>{
    e.preventDefault();
    els.drop.classList.remove('drag');
    addFiles(e.dataTransfer.files);
  });
  els.drop.addEventListener('click',()=>els.input.click());
  els.input.addEventListener('change',()=>addFiles(els.input.files));

  if(state._restored && state._restored.size) refreshList();
  updateExportButtonsVisibility();
}

function reiniciarProyecto(){
  state.images=[];
  state.idx=-1;
  localStorage.removeItem(LS_KEY);
  refreshList();
  render();
  updateExportButtonsVisibility();
}

/* La vista estaba oculta, así que el lienzo medía 0×0: hay que repintar
   al entrar. El ResizeObserver del visor hace el resto. */
export function activar(){
  render();
}
