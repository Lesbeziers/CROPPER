/* ================================
   Visor — render, vista, zoom, mano y puntos
================================ */
import { els, ctx } from './dom.js';
import { state, current, recalc, save } from './state.js';
import { clamp, readToken } from './utils.js';
import { refreshList } from './list.js';
import { updateExportButtonsVisibility } from './export.js';

/* Colores de dibujo: el canvas no entiende var(--x), así que se leen de tokens.css */
const C = {
  pt1:       readToken('--pt-1','#7fe39a'),
  pt2:       readToken('--pt-2','#ffd166'),
  ptStroke:  readToken('--pt-stroke','rgba(0,0,0,.6)'),
  pupilLine: readToken('--pupil-line','rgba(79,155,255,.9)'),
  empty:     readToken('--stage-empty','#141824')
};

/* ---------- Vista ---------- */
export function computePanForMode(){
  const c=current(); if(!c) return;
  const r=els.stage.getBoundingClientRect();

  if(state.view.mode==='fit'){
    state.view.panX=(r.width - c.width * state.view.zoom)/2;
    state.view.panY=(r.height - c.height * state.view.zoom)/2;
  }else if(state.view.mode==='100'){
    state.view.panX=(r.width - c.width * state.view.zoom)/2;
    state.view.panY=0;
  }
}

export function fitView(){
  const c=current(); if(!c) return;
  const r=els.stage.getBoundingClientRect();
  state.view.zoom=Math.min(r.width/c.width, r.height/c.height);
  state.view.mode='fit';
  computePanForMode();
  render();
}

export function view100(){
  const c=current(); if(!c) return;
  state.view.zoom=1;
  state.view.mode='100';
  computePanForMode();
  render();
}

export function applyZoom(f){
  const c=current(); if(!c) return;
  const r=els.stage.getBoundingClientRect();
  const old=state.view.zoom;
  state.view.zoom=clamp(state.view.zoom*f,0.05,8);
  const factor=state.view.zoom/old;

  state.view.panX=r.width/2 + (state.view.panX - r.width/2)*factor;
  state.view.panY=r.height/2+ (state.view.panY - r.height/2)*factor;

  state.view.mode='custom';
  render();
}

/* ---------- Render ---------- */
export function render(){
  const c=current();
  const r=els.stage.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;

  els.stage.width = Math.floor(r.width*dpr);
  els.stage.height= Math.floor(r.height*dpr);

  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,r.width,r.height);

  if(!c){
    ctx.fillStyle=C.empty;
    ctx.fillRect(0,0,r.width,r.height);
    return;
  }

  if(state.view.mode!=='custom') computePanForMode();

  ctx.save();
  ctx.translate(state.view.panX,state.view.panY);
  ctx.scale(state.view.zoom,state.view.zoom);

  ctx.imageSmoothingQuality='high';
  ctx.drawImage(c.img,0,0,c.width,c.height);

  if(c.points?.length >= 1){

    // Punto 1 — ojo izquierdo
    if(c.points[0]){
      ctx.beginPath();
      ctx.arc(c.points[0].x, c.points[0].y, 6/state.view.zoom, 0, Math.PI*2);
      ctx.fillStyle=C.pt1;
      ctx.fill();
      ctx.lineWidth=2/state.view.zoom;
      ctx.strokeStyle=C.ptStroke;
      ctx.stroke();
    }

    // Punto 2 — ojo derecho
    if(c.points[1]){
      ctx.beginPath();
      ctx.arc(c.points[1].x, c.points[1].y, 6/state.view.zoom, 0, Math.PI*2);
      ctx.fillStyle=C.pt2;
      ctx.fill();
      ctx.lineWidth=2/state.view.zoom;
      ctx.strokeStyle=C.ptStroke;
      ctx.stroke();
    }

    // Línea sólo si hay 2 puntos
    if(c.points.length === 2){
      ctx.setLineDash([6/state.view.zoom,6/state.view.zoom]);
      ctx.strokeStyle=C.pupilLine;
      ctx.lineWidth=2/state.view.zoom;
      ctx.beginPath();
      ctx.moveTo(c.points[0].x, c.points[0].y);
      ctx.lineTo(c.points[1].x, c.points[1].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}

/* ---------- Interacción ---------- */
const screenToImage=(x,y)=>{
  const rect=els.stage.getBoundingClientRect();
  return {
    x:(x-rect.left-state.view.panX)/state.view.zoom,
    y:(y-rect.top -state.view.panY)/state.view.zoom
  };
};

let dragIdx=-1;
let dragOff={x:0,y:0};
let isPanning=false;
let panStart=null;
let viewStart=null;
let handKey=false;

function updateCursor(){
  if(isPanning){
    els.stage.style.cursor='grabbing';
  }else if(handKey){
    els.stage.style.cursor='grab';
  }else{
    els.stage.style.cursor='default';
  }
}

window.addEventListener('keydown',e=>{
  if(e.code==='Space'){
    handKey=true;
    updateCursor();
  }
});
window.addEventListener('keyup',e=>{
  if(e.code==='Space'){
    handKey=false;
    updateCursor();
  }
});

els.stage.addEventListener('contextmenu',e=>e.preventDefault());

els.stage.addEventListener('mousedown',ev=>{
  const c=current(); if(!c) return;

  if(ev.button===2 || (ev.button===0 && handKey)){
    isPanning=true;
    panStart={x:ev.clientX,y:ev.clientY};
    viewStart={x:state.view.panX,y:state.view.panY};
    state.view.mode='custom';
    updateCursor();
    return;
  }

  const {x,y}=screenToImage(ev.clientX,ev.clientY);

  if(c.points){
    const hit=c.points.findIndex(p=>Math.hypot(p.x-x,p.y-y)<12/state.view.zoom);
    if(hit>-1){
      dragIdx=hit;
      dragOff={x:c.points[hit].x-x, y:c.points[hit].y-y};
      return;
    }
  }

  if(!c.points) c.points = [];

  if(c.points.length === 0) {
    c.points.push({x,y});
  }
  else if(c.points.length === 1) {
    c.points.push({x,y});
  }
  else {
    // Si había más, reiniciar con un primer punto nuevo
    c.points = [{x,y}];
  }

  recalc(c);
  render();
  refreshList();
  save();
  updateExportButtonsVisibility();

  dragIdx=c.points.length-1;
  dragOff={x:0,y:0};
});

window.addEventListener('mousemove',ev=>{
  const c=current(); if(!c) return;

  if(isPanning){
    const dx=ev.clientX-panStart.x;
    const dy=ev.clientY-panStart.y;
    state.view.panX=viewStart.x+dx;
    state.view.panY=viewStart.y+dy;
    render();
    return;
  }

  if(dragIdx>-1){
    const {x,y}=screenToImage(ev.clientX,ev.clientY);
    const nx=clamp(x+dragOff.x,0,c.width);
    const ny=clamp(y+dragOff.y,0,c.height);
    c.points[dragIdx]={x:nx,y:ny};
    recalc(c);
    render();
  } else {
    updateCursor();
  }
});

window.addEventListener('mouseup',()=>{
  isPanning=false;
  dragIdx=-1;
  save();
  updateExportButtonsVisibility();
  updateCursor();
});

els.stage.addEventListener('mouseleave',()=>{
  if(!isPanning) els.stage.style.cursor='default';
});

/* ---------- Resize ---------- */
new ResizeObserver(()=>{
  if(!current()){
    render();
    updateExportButtonsVisibility();
    return;
  }
  if(state.view.mode!=='custom') computePanForMode();
  render();
  updateExportButtonsVisibility();
}).observe(els.stage);
