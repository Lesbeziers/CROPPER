/* ================================
   Referencias DOM
================================ */
export const els={
  drop:document.getElementById('drop'),
  input:document.getElementById('fileInput'),
  progressBox:document.getElementById('progressBox'),
  progressFill:document.getElementById('progressFill'),
  progressNum:document.getElementById('progressNum'),
  progressPct:document.getElementById('progressPct'),
  progressEyes:document.getElementById('progressEyes'),
  mdlMsg:document.getElementById('mdlMsg'),
  phaseMsg:document.getElementById('phaseMsg'),
  errMsg:document.getElementById('errMsg'),

  cancelDetect:document.getElementById('cancelDetect'),
  list:document.getElementById('list'),
  stage:document.getElementById('stage'),

  volverPortada:document.getElementById('volverPortada'),

  target:document.getElementById('target'),
  prev:document.getElementById('prev'),
  next:document.getElementById('next'),

  clearPts:document.getElementById('clearPts'),
  fit:document.getElementById('fit'),
  zoomIn:document.getElementById('zoomIn'),
  zoomOut:document.getElementById('zoomOut'),
  resetView:document.getElementById('resetView'),

  exportCsv:document.getElementById('exportCsv'),
  exportZip:document.getElementById('exportZip'),
  exportScale:document.getElementById('exportScale'),

  exportProg:document.getElementById('exportProg'),
  exportFill:document.getElementById('exportFill'),
  exportTxt:document.getElementById('exportTxt'),

  clearAll:document.getElementById('clearAll')
};

export const ctx=els.stage.getContext('2d');
