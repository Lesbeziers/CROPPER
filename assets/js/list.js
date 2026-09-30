/* ================================
   Listado lateral de miniaturas
================================ */
import { els } from './dom.js';
import { state } from './state.js';
import { render } from './viewer.js';
import { updateExportButtonsVisibility } from './export.js';

export function refreshList(){
  els.list.innerHTML='';

  // Mientras el modelo trabaja, las miniaturas quedan atenuadas y sin clic
  const locked = state.detectingEyes;

  state.images.forEach((m,i)=>{
    const d=document.createElement('div');

    let cls = 'item';
    if(i === state.idx) cls += ' active';
    if(locked) cls += ' locked';
    d.className = cls;

    d.innerHTML = `
      <img class="thumb" src="${m.thumbUrl}">
      <div class="meta">
        <div class="name" title="${m.name}">${m.name}</div>
        <div class="sub">${m.width}×${m.height}px</div>
      </div>
      <div class="badge ${m.points ? 'ok' : 'miss'}">${m.points ? 'OK' : 'FALTA'}</div>
    `;

    d.onclick = () => {
      if(state.detectingEyes) return;

      state.idx = i;
      render();
      refreshList();
    };

    els.list.appendChild(d);
  });

  updateExportButtonsVisibility();
}
