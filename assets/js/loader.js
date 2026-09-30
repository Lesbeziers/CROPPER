/* ================================
   Carga de imágenes y arranque de la detección
================================ */
import { state, recalc, save } from './state.js';
import { isCancelled, resetCancel } from './cancel.js';
import { loadImageFromFile, makeThumb, cederControl } from './utils.js';
import { showProgress, updateProgress, hideProgress, resetProgressForDetection } from './progress.js';
import { refreshList } from './list.js';
import { render, fitView } from './viewer.js';
import { autoDetectBatch, isModelReady } from './detector.js';
import { updateExportButtonsVisibility } from './export.js';

export async function addFiles(files){
  resetCancel();

  const arr=[...files].filter(f=>f.type.startsWith('image/'));
  if(!arr.length){ updateExportButtonsVisibility(); return; }

  showProgress(arr.length, !isModelReady());
  let done=0;

  for(const f of arr){
    if(isCancelled()) break;

    try{
      const { img, srcUrl } = await loadImageFromFile(f);
      const url = srcUrl;
      if(isCancelled()) break;

      const th=await makeThumb(img,56,56);
      if(isCancelled()) break;

      const rec = {
        name: f.name,
        blobUrl: url,
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        thumbUrl: th,
        points: null,
        distPx: null,
        scalePc: null
      };

      const rest=state._restored?.get(f.name);
      if(rest?.length===2){
        rec.points=rest;
        recalc(rec);
      }

      state.images.push(rec);
    }catch(e){
      console.warn('Error',f?.name,e);
    }

    done++;
    updateProgress(done,arr.length);
    await cederControl();
  }

  if(isCancelled()){
    if(state.idx<0 && state.images.length){
      state.idx=0;
      fitView();
    }
    refreshList(); render(); save();
    hideProgress(); updateExportButtonsVisibility();
    resetCancel();
    return;
  }

  if(state.idx<0 && state.images.length){
    state.idx=0;
    fitView();
  }

  refreshList(); render(); save();

  // AUTO-DETECCIÓN
  resetProgressForDetection(state.images.length);
  await autoDetectBatch(state.images);

  hideProgress();
  updateExportButtonsVisibility();
}
