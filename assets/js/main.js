/* ================================
   Carcasa — portada y carga perezosa de modos

   El núcleo no sabe nada de plantillas: cada modo vive en ./modos/, declara
   qué vista le corresponde y se importa sólo la primera vez que se entra en
   él. Así la portada no arrastra MediaPipe ni el resto de la herramienta.
================================ */
import { mostrarVista } from './router.js';
import { LADO_EXPORTACION } from './actores/geometria.js';

/* El botón de ACTORES anuncia lo que va a medir el fichero, y eso ya ha
   cambiado una vez (800 → 400 mientras auditan el espacio en nube) y volverá a
   cambiar. Escrito a mano se quedaría mintiendo desde la portada, que es lo
   primero que se ve. Sale de la misma constante que los rótulos de los previews
   y que el nombre de la carpeta del ZIP: un solo número que tocar.

   Importar geometria.js aquí no rompe la carga perezosa de arriba: es
   aritmética suelta, sin imports ni DOM. La portada sigue sin arrastrar
   MediaPipe. */
(function rotularModos(){
  const medida = document.getElementById('modoActoresMedida');
  if(medida) medida.textContent = `${LADO_EXPORTACION}x${LADO_EXPORTACION}`;
})();

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
