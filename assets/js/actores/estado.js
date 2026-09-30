/* ================================
   Estado y persistencia — modo ACTORES 800x800

   Propio del modo, no compartido con CARÁTULAS JUGADORES: allí lo que se
   guarda por imagen son los puntos y una escala derivada de ellos; aquí el
   encuadre deja de ser derivado y pasa a ser estado con derecho propio.
   Clave de almacenamiento distinta, para que los dos modos no se pisen.
================================ */

export const LS_KEY = 'cropper-actores-v1';

export const estado = {
  imagenes   : [],
  idx        : -1,
  vista      : { zoom:1, panX:0, panY:0, modo:'fit' },
  detectando : false,
  guias      : true,   // plantilla superpuesta sobre el preview cuadrado
  revisando  : false,  // true en VER TODO
  parrillaRedonda: false,

  /* Ficheros que no llegaron a cargar. Antes esto era un console.warn y la
     imagen desaparecía sin más; con IDs de por medio, una foto que se pierde
     al cargar es una ficha de actor que se queda vacía y nadie se entera. */
  descartadas: []
};

export const actual = () => estado.imagenes[estado.idx];

/* Forma del registro de cada imagen.

   `encuadre` es null mientras el encuadre sea el automático puro, derivado de
   las pupilas. En cuanto se toca a mano guarda el desvío respecto a ése, y el
   botón RESET lo devuelve a null. Guardar el desvío y no el valor absoluto es
   lo que permite distinguir "no tocado" de "tocado y casualmente igual".

   `id` lo rellenará el cruce con el CSV de actores. Todavía no existe. */
export function nuevoRegistro(base){
  return {
    ...base,
    puntos  : null,   // [{x,y},{x,y}] en píxeles de la imagen original
    barbilla: null,   // {x,y} del mentón según la malla — sólo para verla
    encuadre: null,   // {dx,dy,escala,giro} o null = automático
    idManual: null    // ID tecleado en la modal; dura lo que el proyecto
  };
}

export const tieneEncuadreManual = rec => rec.encuadre != null;

export function guardar(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify({
      /* Se guardan las MEDIDAS —pupilas y barbilla—, que cuestan de obtener y
         son objetivas. El encuadre NO: es una preferencia de quien mira, dura
         lo que la sesión, y devolvérselo a alguien al día siguiente sólo
         produce marcas de lápiz que nadie recuerda haber hecho. */
      imagenes: estado.imagenes.map(m=>({
        nombre  : m.name,
        puntos  : m.puntos || null,
        barbilla: m.barbilla || null
      }))
    }));
  }catch(e){
    // Quedarse sin cuota no debe tumbar la herramienta, pero tampoco callarse
    console.warn('No se ha podido guardar el proyecto', e);
  }
}

/* Restaura las medidas emparejando por nombre de fichero. Las imágenes no se
   guardan: hay que volver a soltarlas. */
(function cargar(){
  try{
    const crudo = localStorage.getItem(LS_KEY);
    if(!crudo) return;
    const d = JSON.parse(crudo);
    estado._restaurado = new Map(
      (d.imagenes||[]).map(x=>[x.nombre, {puntos:x.puntos, barbilla:x.barbilla}])
    );
  }catch{}
})();

export function reiniciar(){
  estado.imagenes = [];
  estado.idx = -1;
  estado.descartadas = [];
  estado._restaurado = null;
  localStorage.removeItem(LS_KEY);
}
