/* ================================
   MODO — Actores 800x800

   Salida: un único fichero de 800x800 por actor. A diferencia de CARÁTULAS
   JUGADORES, este modo no sólo escala: también reencuadra, con ajuste manual
   de posición, escala y giro. La máscara redonda la aplica la plataforma; la
   herramienta la previsualiza.

   Construido salvo la exportación y el cruce con el CSV de IDs, que son los
   dos pasos que quedan.
================================ */
import { els } from '../actores/dom.js';
import { estado, guardar, reiniciar as vaciarEstado } from '../actores/estado.js';
import { requestCancel } from '../cancel.js';
import { anadirFicheros } from '../actores/carga.js';
import { refrescarLista, configurarLista } from '../actores/lista.js';
import { pintar, ajustarImagen, vista100, aplicarZoom, configurarVisor } from '../actores/visor.js';
import { pintarPreviews } from '../actores/previews.js';
import { olvidarCopias } from '../actores/copia.js';
import { mover, escalar, girar, volverAlAutomatico } from '../actores/encuadre.js';
import { refrescarMandos } from '../actores/mandos.js';
import { configurarTeclado } from '../actores/teclado.js';
import { refrescarParrilla, olvidarParrilla, configurarParrilla } from '../actores/parrilla.js';
import { recordar, deshacer as deshacerUltimo, olvidarHistorial } from '../actores/historial.js';
import { cargarMaestro } from '../actores/csv.js';
import { resolverTodos, sinResolver } from '../actores/resolver.js';
import { pedirIdsQueFaltan } from '../actores/modal-ids.js';
import { exportarRecortes } from '../actores/exportar.js';
import { pintarDescartadas } from '../actores/progreso.js';
import { mostrarPortada } from '../router.js';
import { confirmar } from '../modal.js';

let iniciado = false;

/* ---------- EDICIÓN / VER TODO ----------
   Dos vistas excluyentes. En VER TODO desaparece todo lo de editar: ahí el
   original y los puntos son ruido. */
function mostrarEdicion(){
  estado.revisando = false;
  els.layout.hidden = false;
  els.revision.hidden = true;
  els.edicion.classList.add('activo');
  els.verTodo.classList.remove('activo');
  pintar();
  pintarPreviews();
  refrescarMandos();
}

function mostrarRevision(){
  estado.revisando = true;
  els.layout.hidden = true;
  els.revision.hidden = false;
  els.verTodo.classList.add('activo');
  els.edicion.classList.remove('activo');
  refrescarParrilla();
}

function cambiarForma(redonda){
  estado.parrillaRedonda = redonda;
  els.parrilla.classList.toggle('ac-parrilla--redonda', redonda);
  els.formaCirculo .classList.toggle('activo',  redonda);
  els.formaCuadrado.classList.toggle('activo', !redonda);
}

function irA(i){
  if(!estado.imagenes.length) return;
  estado.idx = (i + estado.imagenes.length) % estado.imagenes.length;
  pintar();
  pintarPreviews();
  refrescarLista();
  refrescarMandos();
}

/* Todo retoque pasa por aquí: aplica, repinta los dos previews y guarda. */
function retocar(accion){
  const rec = estado.imagenes[estado.idx];
  if(!rec || rec.puntos?.length !== 2) return;
  accion(rec);
  pintarPreviews();
  refrescarLista();
  refrescarMandos();
  guardar();
}

/* Igual, pero para el teclado. Manteniendo una flecha pulsada el sistema
   repite decenas de veces por segundo, y guardar en disco en cada repetición
   convierte un desplazamiento suave en un traqueteo. Lo que se ve se actualiza
   al instante; lo que cuesta (redibujar la lista y guardar) espera a que dejes
   de pulsar. */
let guardadoPendiente = null;
function retocarDeSeguido(accion){
  const rec = estado.imagenes[estado.idx];
  if(!rec || rec.puntos?.length !== 2) return;
  accion(rec);
  pintarPreviews();
  refrescarMandos();

  clearTimeout(guardadoPendiente);
  guardadoPendiente = setTimeout(()=>{
    refrescarLista();
    guardar();
  }, 250);
}

function reiniciarProyecto(){
  vaciarEstado();
  olvidarCopias();
  olvidarParrilla();
  olvidarHistorial();   // el historial apunta a imágenes que ya no existen
  mostrarEdicion();          // sin imágenes, la parrilla no tiene sentido
  refrescarLista();
  pintarDescartadas();
  pintar();
  pintarPreviews();
  refrescarMandos();
}

export function init(){
  if(iniciado) return;
  iniciado = true;

  configurarLista(i => irA(i));

  configurarTeclado({
    retocar  : retocarDeSeguido,
    siguiente: ()=> irA(estado.idx + 1),

    /* Deshacer lleva a la imagen restaurada si no era la que se estaba
       mirando: deshacer algo que no se ve es peor que no deshacer nada. */
    deshacer : ()=>{
      const rec = deshacerUltimo();
      if(!rec) return;

      const i = estado.imagenes.indexOf(rec);
      if(i >= 0 && i !== estado.idx) estado.idx = i;

      pintar();
      pintarPreviews();
      refrescarLista();
      refrescarMandos();
      guardar();
    }
  });

  /* Pulsar una miniatura lleva a editar ESA: ves la que chirría y la arreglas.
     Sin esto la parrilla informaría pero no llevaría a ningún sitio. */
  configurarParrilla({
    elegir: i => { mostrarEdicion(); irA(i); }
  });

  /* ---------- Exportar ----------
     El maestro puede seguir cargándose: se espera a él antes de decidir qué
     falta, o diría que no encuentra nada por no haber mirado todavía. */
  els.exportar.addEventListener('click', async ()=>{
    els.exportar.disabled = true;
    try{
      await cargarMaestro();
    }catch(e){
      console.warn('Sin maestro de IDs:', e);   // se sigue: la modal lo dirá
    }
    refrescarMandos();

    if(sinResolver(resolverTodos(estado.imagenes)).length){
      const seguir = await pedirIdsQueFaltan();
      if(!seguir){ refrescarMandos(); return; }
    }
    await exportarRecortes();
    refrescarMandos();
  });

  els.exportCancelar.addEventListener('click', ()=>{
    requestCancel();
    els.exportTxt.textContent = 'Cancelando…';
  });

  els.edicion.addEventListener('click', mostrarEdicion);
  els.verTodo.addEventListener('click', mostrarRevision);
  els.formaCuadrado.addEventListener('click', ()=> cambiarForma(false));
  els.formaCirculo .addEventListener('click', ()=> cambiarForma(true));

  /* Mover una pupila o la barbilla recalcula la base del encuadre, pero el
     retoque manual se guarda como DESVÍO, así que sobrevive encima.
     El arrastre sólo repinta —tiene que ir fluido—; lo caro espera al soltar. */
  configurarVisor({
    arrastrando: ()=> pintarPreviews(),
    soltar: ()=>{
      pintarPreviews();
      refrescarLista();
      refrescarMandos();
      guardar();
    }
  });

  els.guias.addEventListener('change', ()=>{
    estado.guias = els.guias.checked;
    pintarPreviews();
  });

  /* ---------- Retoque del encuadre ---------- */
  els.arriba   .addEventListener('click', ()=> retocar(r => mover(r,  0, -1)));
  els.abajo    .addEventListener('click', ()=> retocar(r => mover(r,  0,  1)));
  els.izquierda.addEventListener('click', ()=> retocar(r => mover(r, -1,  0)));
  els.derecha  .addEventListener('click', ()=> retocar(r => mover(r,  1,  0)));

  els.mas  .addEventListener('click', ()=> retocar(r => escalar(r,  1)));
  els.menos.addEventListener('click', ()=> retocar(r => escalar(r, -1)));

  els.giroIzq.addEventListener('click', ()=> retocar(r => girar(r, -1)));
  els.giroDch.addEventListener('click', ()=> retocar(r => girar(r,  1)));

  els.reset.addEventListener('click', ()=> retocar(volverAlAutomatico));

  /* ---------- Barra de acciones ---------- */
  els.portada.addEventListener('click', async ()=>{
    const ok = await confirmar({
      titulo : 'Volver a la portada',
      mensaje: 'Todo el proyecto se reiniciará: perderás las imágenes cargadas y las pupilas que hayas colocado.',
      aceptar: 'VOLVER A PORTADA'
    });
    if(!ok) return;
    reiniciarProyecto();
    mostrarPortada();
  });

  els.reiniciar.addEventListener('click', async ()=>{
    const ok = await confirmar({
      titulo : 'Reiniciar proyecto',
      mensaje: 'Se eliminarán todas las imágenes y sus mediciones. Esta acción no se puede deshacer.',
      aceptar: 'REINICIAR'
    });
    if(!ok) return;
    reiniciarProyecto();
  });

  els.prev.addEventListener('click', ()=> irA(estado.idx - 1));
  els.next.addEventListener('click', ()=> irA(estado.idx + 1));

  /* ---------- Progreso ---------- */
  els.cancelar.addEventListener('click', ()=>{
    requestCancel();
    els.errMsg.textContent = 'Proceso cancelado por el usuario.';
    els.errMsg.style.display = 'inline';
  });

  /* ---------- Barra del visor ---------- */
  els.ajustar .addEventListener('click', ajustarImagen);
  els.vista100.addEventListener('click', vista100);
  els.zoomIn  .addEventListener('click', ()=> aplicarZoom(1.2));
  els.zoomOut .addEventListener('click', ()=> aplicarZoom(1/1.2));

  els.limpiar.addEventListener('click', ()=>{
    const c = estado.imagenes[estado.idx];
    if(!c) return;
    recordar(c);         // LIMPIAR también se puede deshacer
    c.puntos = null;
    c.barbilla = null;   // sin pupilas no hay eje de cara: la barbilla sobra
    pintar();
    pintarPreviews();
    refrescarLista();
    refrescarMandos();
    guardar();
  });

  /* ---------- Arrastrar y soltar ----------
     Sin estos dos, soltar una foto fuera del recuadro hace que el navegador
     la abra y se lleve por delante el proyecto. */
  window.addEventListener('dragover', e=>e.preventDefault());
  window.addEventListener('drop',     e=>e.preventDefault());

  els.drop.addEventListener('dragover', e=>{
    e.preventDefault();
    els.drop.classList.add('drag');
  });
  els.drop.addEventListener('dragleave', ()=> els.drop.classList.remove('drag'));
  els.drop.addEventListener('drop', e=>{
    e.preventDefault();
    els.drop.classList.remove('drag');
    anadirFicheros(e.dataTransfer.files);
  });
  els.drop.addEventListener('click', ()=> els.input.click());
  els.input.addEventListener('change', ()=> anadirFicheros(els.input.files));

  if(estado._restaurado?.size) refrescarLista();
}

/* La vista estaba oculta, así que el lienzo medía 0×0: hay que repintar
   al entrar. El ResizeObserver del visor hace el resto.

   Y se lanza la carga del maestro de IDs en segundo plano: tarda un par de
   segundos y más vale gastarlos ahora, mientras se colocan pupilas, que
   cuando el usuario pulse EXPORTAR y se quede mirando. Si falla, no se dice
   nada todavía: ya se avisará al exportar, que es cuando importa. */
export function activar(){
  cargarMaestro().catch(e => console.warn('No se ha podido precargar el maestro de IDs:', e));

  pintar();
  pintarPreviews();
  refrescarMandos();
}
