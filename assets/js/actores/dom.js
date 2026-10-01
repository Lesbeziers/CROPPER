/* ================================
   Referencias DOM — modo ACTORES 800x800

   Propias del modo: su vista tiene tres lienzos (original, preview cuadrado y
   preview redondo) donde la de carátulas tiene uno, y controles de encuadre
   que allí no existen. Todos los ids van con prefijo `ac` para no chocar.
================================ */
export const els = {
  /* Barra de acciones */
  portada  : document.getElementById('acPortada'),
  reiniciar: document.getElementById('acReiniciar'),
  exportar : document.getElementById('acExportar'),
  exportProg    : document.getElementById('acExportProg'),
  exportFill    : document.getElementById('acExportFill'),
  exportTxt     : document.getElementById('acExportTxt'),
  exportCancelar: document.getElementById('acExportCancelar'),
  prev     : document.getElementById('acPrev'),
  next     : document.getElementById('acNext'),

  /* Conmutador EDICIÓN / VER TODO */
  edicion  : document.getElementById('acEdicion'),
  verTodo  : document.getElementById('acVerTodo'),
  layout   : document.getElementById('acLayout'),
  revision : document.getElementById('acRevision'),
  parrilla : document.getElementById('acParrilla'),
  revisionCuenta: document.getElementById('acRevisionCuenta'),
  formaCuadrado : document.getElementById('acFormaCuadrado'),
  formaCirculo  : document.getElementById('acFormaCirculo'),

  /* Carga */
  drop : document.getElementById('acDrop'),
  input: document.getElementById('acFileInput'),

  /* Progreso */
  progressBox : document.getElementById('acProgressBox'),
  progressFill: document.getElementById('acProgressFill'),
  progressNum : document.getElementById('acProgressNum'),
  progressPct : document.getElementById('acProgressPct'),
  progressEyes: document.getElementById('acProgressEyes'),
  mdlMsg      : document.getElementById('acMdlMsg'),
  phaseMsg    : document.getElementById('acPhaseMsg'),
  errMsg      : document.getElementById('acErrMsg'),
  cancelar    : document.getElementById('acCancelar'),

  /* Avisos de ficheros descartados */
  descartes    : document.getElementById('acDescartes'),
  descartesTxt : document.getElementById('acDescartesTxt'),

  /* Listado */
  lista: document.getElementById('acLista'),

  /* Controles de encuadre */
  arriba    : document.getElementById('acArriba'),
  abajo     : document.getElementById('acAbajo'),
  izquierda : document.getElementById('acIzquierda'),
  derecha   : document.getElementById('acDerecha'),
  menos     : document.getElementById('acMenos'),
  mas       : document.getElementById('acMas'),
  giroIzq   : document.getElementById('acGiroIzq'),
  giroDch   : document.getElementById('acGiroDch'),
  reset     : document.getElementById('acReset'),

  /* Previews de salida */
  previewCuadrado: document.getElementById('acPreviewCuadrado'),
  previewRedondo : document.getElementById('acPreviewRedondo'),
  guias          : document.getElementById('acGuias'),

  /* Visor del original */
  visor    : document.getElementById('acVisor'),
  espacio  : document.getElementById('acEspacio'),
  stage    : document.getElementById('acStage'),
  ajustar  : document.getElementById('acAjustar'),
  vista100 : document.getElementById('acVista100'),
  zoomIn   : document.getElementById('acZoomIn'),
  zoomOut  : document.getElementById('acZoomOut'),
  limpiar  : document.getElementById('acLimpiar')
};

export const ctx = els.stage.getContext('2d');
