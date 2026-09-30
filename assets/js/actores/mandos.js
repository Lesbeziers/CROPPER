/* ================================
   Qué se puede pulsar y qué no — modo ACTORES 800x800

   Vive aparte porque lo tienen que refrescar tres sitios distintos —la carga,
   la detección y el propio modo—, y pasarles un callback a todos sería más
   enredo que tenerlo aquí.

   La regla de fondo: un botón encendido es una promesa. Si no hay proyecto no
   hay nada que reiniciar, ni que revisar, ni por donde navegar, así que todo
   se apaga menos volver a la portada. Y si la imagen de turno no tiene las dos
   pupilas, no hay encuadre que retocar.
================================ */
import { els } from './dom.js';
import { estado } from './estado.js';

export function refrescarMandos(){
  const hayProyecto = estado.imagenes.length > 0;
  const rec = estado.imagenes[estado.idx];

  /* ---- Sin imágenes: sólo PORTADA ---- */
  const sueltos = [
    els.reiniciar, els.edicion, els.verTodo,      // barra de acciones
    els.prev, els.next,                            // navegación
    els.ajustar, els.vista100,                     // barra del visor
    els.zoomIn, els.zoomOut, els.limpiar,
    els.guias,                                     // interruptor de guías
    els.formaCuadrado, els.formaCirculo            // forma en VER TODO
  ];
  sueltos.forEach(b => { if(b) b.disabled = !hayProyecto; });

  /* ---- Encuadre: además hacen falta las dos pupilas ---- */
  const utilizable = hayProyecto && !!rec?.puntos && rec.puntos.length === 2 && !estado.detectando;

  [els.arriba, els.abajo, els.izquierda, els.derecha,
   els.menos, els.mas, els.giroIzq, els.giroDch]
    .forEach(b => { b.disabled = !utilizable; });

  // Volver al automático sólo tiene sentido si hay algo de lo que volver
  els.reset.disabled = !utilizable || !rec?.encuadre;

  /* ---- Exportar: sólo con TODAS en OK ----
     Si falta alguna por medir, el ZIP saldría incompleto y nadie se daría
     cuenta hasta abrirlo. Más vale no dejar pulsar. */
  const todasListas = hayProyecto && !estado.detectando &&
    estado.imagenes.every(m => m.puntos?.length === 2);

  els.exportar.disabled = !todasListas;
  els.exportar.title = todasListas
    ? 'Genera el ZIP con los recortes de 800x800'
    : 'Faltan imágenes por medir: todas tienen que estar en OK';
}
