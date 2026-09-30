/* ================================
   Cancelación compartida entre carga y detección
================================ */
let cancelRequested=false;

export const isCancelled=()=>cancelRequested;
export function requestCancel(){ cancelRequested=true; }
export function resetCancel(){ cancelRequested=false; }
