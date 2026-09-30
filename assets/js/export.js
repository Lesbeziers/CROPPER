/* ================================
   Exportación — ZIP escalado y CSV
================================ */
import { els } from './dom.js';
import { state } from './state.js';
import { render } from './viewer.js';
import { refreshList } from './list.js';
import { cederControl, crearLienzo, lienzoTieneContenido, ErrorMemoriaLienzo } from './utils.js';
import { avisar } from './modal.js';

/* ---------- Progreso de export ---------- */
export function showExportProgress(show){
  els.exportProg.style.display = show ? 'inline-flex' : 'none';
  if(!show){
    els.exportFill.style.width='0%';
    els.exportTxt.textContent='0%';
  }
}

export function setExportProgress(pct,text){
  els.exportFill.style.width = `${pct}%`;
  els.exportTxt.textContent = text ?? `${Math.round(pct)}%`;
}

/* ---------- ZIP de imágenes escaladas (PNG) ---------- */
export async function exportScaledImages(){
  const list = state.images.filter(m => m.points && m.scalePc);
  if(!list.length){
    await avisar({
      titulo :'Nada que exportar',
      mensaje:'Ninguna imagen tiene las pupilas marcadas.'
    });
    return;
  }

  const zip = new JSZip();
  let done = 0;

  showExportProgress(true);
  setExportProgress(0);

  try{
    for(const rec of list){
      const factor = rec.scalePc / 100;
      const w = Math.round(rec.width * factor);
      const h = Math.round(rec.height * factor);

      const { c, cx } = crearLienzo(w, h, `escalar «${rec.name}»`);
      cx.imageSmoothingQuality = "high";
      cx.drawImage(rec.img, 0, 0, w, h);

      // Sin esta comprobación, un lienzo agotado acabaría como un PNG en blanco
      // dentro del ZIP, y no habría forma de saberlo hasta abrirlo.
      if(!lienzoTieneContenido(cx, w, h)){
        throw new ErrorMemoriaLienzo(`escalar «${rec.name}»`);
      }

      const blob = await new Promise(res => c.toBlob(res,"image/png"));
      const base = rec.name.replace(/\.[^.]+$/, '');

      zip.file(`${base}.png`, blob);

      done++;
      setExportProgress(done * 100 / list.length);

      await cederControl();
    }

    const zipBlob = await zip.generateAsync({type:"blob"});
    const url=URL.createObjectURL(zipBlob);
    const a=document.createElement('a');
    a.href=url;
    a.download="IMAGENES_ESCALADAS.zip";
    a.click();
    URL.revokeObjectURL(url);

    setTimeout(()=>showExportProgress(false),800);
    render();
    refreshList();

  }catch(e){
    // Abortamos sin descargar nada: más vale no entregar ZIP que entregar uno
    // con imágenes en blanco dentro.
    showExportProgress(false);
    if(e instanceof ErrorMemoriaLienzo){
      await avisar({
        titulo :'Memoria insuficiente',
        mensaje:`${e.message} No se ha descargado nada. Exporta el lote en tandas más pequeñas.`
      });
    }else{
      console.error('Error exportando', e);
      await avisar({ titulo:'Error al exportar', mensaje:String(e?.message || e) });
    }
  }
}

/* ---------- CSV (oculto pero funcional) ---------- */
export function exportCsv(){
  const rows=[['Nombre','Escala %']];
  state.images.forEach(m=>{
    rows.push([m.name, m.scalePc?m.scalePc.toFixed(2):'']);
  });

  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);

  const a=document.createElement('a');
  a.href=url;
  a.download="medidas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Visibilidad de los botones ---------- */
export function updateExportButtonsVisibility(){
  if(!state.images.length){
    els.exportCsv.style.display='none';
    els.exportZip.style.display='none';
    els.exportScale.style.display='none';
    els.exportProg.style.display='none';
    return;
  }

  const allOk = state.images.every(i=>i.points && i.points.length===2);

  els.exportCsv.style.display='none';
  els.exportZip.style.display='none';

  els.exportScale.style.display = allOk ? 'inline-block' : 'none';

  if(!allOk){
    els.exportProg.style.display='none';
  }
}
