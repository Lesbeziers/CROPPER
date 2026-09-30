/* ================================
   Carcasa — portada y carga perezosa de modos

   El núcleo no sabe nada de plantillas: cada modo vive en ./modos/, declara
   qué vista le corresponde y se importa sólo la primera vez que se entra en
   él. Así la portada no arrastra MediaPipe ni el resto de la herramienta.
================================ */
import { mostrarVista } from './router.js';

const MODOS = {
  'caratulas-jugadores': {
    vista : 'app',
    cargar: () => import('./modos/caratulas-jugadores.js')
  },
  'actores-800': {
    vista : 'app-actores',
    cargar: () => import('./modos/actores-800.js')
  }
};

const instanciados = new Map();

async function entrarEnModo(id){
  const def = MODOS[id];
  if(!def){
    console.warn('Modo no disponible:', id);
    return;
  }

  let modo = instanciados.get(id);
  if(!modo){
    modo = await def.cargar();
    modo.init();
    instanciados.set(id, modo);
  }

  mostrarVista(def.vista);
  modo.activar?.();
}

document.querySelectorAll('.modo[data-modo]').forEach(boton=>{
  boton.addEventListener('click', ()=> entrarEnModo(boton.dataset.modo));
});
