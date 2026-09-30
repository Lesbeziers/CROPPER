/* ================================
   Estado y persistencia
================================ */
import { els } from './dom.js';
import { dist } from './utils.js';

export const LS_KEY='pupil-measure-v15';

export const state={
  images:[],
  idx:-1,
  view:{zoom:1,panX:0,panY:0,mode:'fit'},
  detectingEyes:false
};
state.targetDist=195;

export const current=()=>state.images[state.idx];

export function recalc(r){
  if(r.points?.length===2){
    r.distPx = dist(r.points[0],r.points[1]);
    r.scalePc = (state.targetDist / r.distPx) * 100;
  } else {
    r.distPx = null;
    r.scalePc = null;
  }
}

export function save(){
  localStorage.setItem(LS_KEY,JSON.stringify({
    targetDist:state.targetDist,
    images:state.images.map(m=>({
      name:m.name,
      points:m.points||null
    }))
  }));
}

/* Restaura sólo targetDist y los puntos, emparejando por nombre de fichero.
   Las imágenes no se guardan: hay que volver a soltarlas. */
(function load(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw) return;
    const d=JSON.parse(raw);
    state.targetDist=d.targetDist||195;
    els.target.value=state.targetDist;
    state._restored=new Map((d.images||[]).map(x=>[x.name,x.points]));
  }catch{}
})();
