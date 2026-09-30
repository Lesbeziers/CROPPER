/* ================================
   Atajos de teclado — modo ACTORES 800x800

     ENTER            siguiente imagen
     ← ↑ ↓ →          mover el encuadre
     + −              escalar
     Z X              girar a izquierda y a derecha
     ⌘Z / Ctrl+Z      deshacer la última pupila o barbilla

   Salvo el deshacer, todos actúan sobre el ENCUADRE, nunca sobre las pupilas
   ni la barbilla: esos puntos se tocan sólo con el ratón, sobre la foto
   original. Así no hay forma de descolocar una medición con un teclazo.
================================ */
import { estado } from './estado.js';
import { mover, escalar, girar } from './encuadre.js';

const vista = document.getElementById('app-actores');

let alRetocar   = ()=>{};
let alSiguiente = ()=>{};
let alDeshacer  = ()=>{};
export function configurarTeclado({ retocar, siguiente, deshacer }){
  alRetocar   = retocar   || (()=>{});
  alSiguiente = siguiente || (()=>{});
  alDeshacer  = deshacer  || (()=>{});
}

/* Cuándo NO debe escuchar:
   - la vista está oculta (se está en la portada o en el otro modo)
   - hay una modal abierta, que tiene sus propias teclas
   - se está detectando, que es cuando la interfaz está bloqueada
   - se está en VER TODO, donde no hay un encuadre concreto que retocar
   - el foco está en un campo de texto */
function escuchando(){
  if(vista.hidden) return false;
  if(document.querySelector('dialog[open]')) return false;
  if(estado.detectando) return false;
  if(estado.revisando) return false;

  const foco = document.activeElement;
  if(foco && (foco.tagName === 'INPUT' || foco.tagName === 'TEXTAREA' || foco.isContentEditable)) return false;

  return true;
}

const GIRO_IZQUIERDA = ['z','Z'];
const GIRO_DERECHA   = ['x','X'];
const MAS            = ['+','='];      // '=' cubre los teclados sin + directo
const MENOS          = ['-','_'];

function accionPara(tecla){
  switch(tecla){
    case 'ArrowLeft' : return r => mover(r, -1,  0);
    case 'ArrowRight': return r => mover(r,  1,  0);
    case 'ArrowUp'   : return r => mover(r,  0, -1);
    case 'ArrowDown' : return r => mover(r,  0,  1);
  }
  if(GIRO_IZQUIERDA.includes(tecla)) return r => girar(r, -1);
  if(GIRO_DERECHA  .includes(tecla)) return r => girar(r,  1);
  if(MAS  .includes(tecla))          return r => escalar(r,  1);
  if(MENOS.includes(tecla))          return r => escalar(r, -1);
  return null;
}

window.addEventListener('keydown', ev=>{
  if(!escuchando()) return;

  /* El deshacer va antes de descartar los modificadores, que es justo lo que
     es. ⌘ en Mac, Ctrl en Windows. Con Shift sería rehacer, que no existe. */
  if((ev.metaKey || ev.ctrlKey) && !ev.shiftKey && (ev.key === 'z' || ev.key === 'Z')){
    ev.preventDefault();
    alDeshacer();
    return;
  }

  // El resto de atajos con modificador son del navegador o del sistema
  if(ev.ctrlKey || ev.metaKey || ev.altKey) return;

  if(ev.key === 'Enter'){
    /* Si el foco está en un botón, ENTER es SUYO: pulsarlo es lo que espera
       cualquiera. Adelantar imagen además sería hacer dos cosas con una tecla. */
    if(document.activeElement?.tagName === 'BUTTON') return;
    ev.preventDefault();
    alSiguiente();
    return;
  }

  const accion = accionPara(ev.key);
  if(!accion) return;

  // Sin las dos pupilas no hay encuadre que retocar
  const rec = estado.imagenes[estado.idx];
  if(!rec || rec.puntos?.length !== 2) return;

  ev.preventDefault();   // las flechas, si no, hacen desplazar la página
  alRetocar(accion);
});
