/* ================================
   Maestro de IDs — modo ACTORES 800x800

   Cruza el nombre del fichero con el ID del actor. Es la parte de la
   herramienta con más riesgo: un recorte feo se rehace, pero un ID equivocado
   publica la cara de un actor bajo la ficha de otro y nadie se entera hasta
   que lo ve alguien de fuera. Por eso aquí NO se adivina nada.

   ================================
   Lo que trae el fichero de verdad (medido sobre assets/docs/nombres.csv el
   2026-09-30, 116.057 líneas):

   - DOS CODIFICACIONES MEZCLADAS. Las primeras ~112.000 líneas son UTF-8 y
     después hay un bloque de 1.459 en Latin-1 — parecen dos exportaciones
     pegadas. Un TextDecoder de UTF-8 se atraganta ahí y se lleva por delante
     esos 1.459 nombres. Por eso se decodifica LÍNEA A LÍNEA con respaldo.
   - Formato `nombre.jpg,ID.jpg;;` con saltos CRLF.
   - 195 líneas con comillas CSV envolviendo la fila entera y comillas dobles
     dentro del nombre: `"Manuel Cano ""El Pireo"".jpg,55380.jpg";;`
   - 114.738 nombres distintos, de los cuales 114.721 (el 99,985%) resuelven a
     un único ID. **17 son homónimos reales** con IDs distintos.

   Los 17 ambiguos se tratan como si no existieran: se mandan a resolver a
   mano. Elegir uno de dos al azar es exactamente el fallo que no podemos
   permitirnos.
================================ */

/* CÓMO SE SALVA LA MEZCLA DE CODIFICACIONES, y por qué así.

   Lo evidente es decodificar línea a línea probando UTF-8 y cayendo al
   respaldo cuando falle. Funciona, pero cuesta 4,8 s sobre este fichero:
   son 116.000 llamadas a TextDecoder más 1.459 excepciones.

   Lo que se hace en su lugar: decodificar el fichero ENTERO dos veces —una
   en UTF-8 tolerante, que mete el carácter de reemplazo donde no entiende, y
   otra con el respaldo, que nunca falla—, partir las dos en líneas y elegir
   por cada una. Los saltos de línea ocupan un byte en las dos codificaciones,
   así que las dos listas salen con las mismas líneas y en el mismo orden.
   Dos pasadas nativas en vez de 116.000 llamadas: baja a unos 200 ms.

   `windows-1252`, no `latin-1`: esa etiqueta ni siquiera existe para
   TextDecoder. Y es lo que produce de verdad una exportación hecha en
   Windows — coincide con Latin-1 en las vocales acentuadas. */
const REEMPLAZO = '�';

function lineasDelFichero(datos){
  const enUtf8    = new TextDecoder('utf-8').decode(datos).split('\n');
  const enRespaldo = new TextDecoder('windows-1252').decode(datos).split('\n');

  return enUtf8.map((linea, i) =>
    linea.includes(REEMPLAZO) ? enRespaldo[i] : linea
  );
}

/* Para comparar nombres: sin extensión, sin acentos, sin mayúsculas y sin
   espacios de más. Nada más — cualquier cosa más lista (quitar palabras,
   parecidos, iniciales) abre la puerta a emparejar a dos personas distintas. */
/* La mayoría de los 114.738 nombres son ASCII puro, y quitarles acentos que no
   tienen cuesta lo mismo que quitárselos a los que sí. Con el atajo, 20.000
   nombres pasan de 145 ms a 52. */
const SOLO_ASCII = /^[\x20-\x7E]*$/;

export function normalizar(nombre){
  const punto = nombre.lastIndexOf('.');
  let s = punto > 0 ? nombre.slice(0, punto) : nombre;   // la extensión

  if(!SOLO_ASCII.test(s)){
    s = s.normalize('NFKD').replace(/\p{M}/gu, '');      // los acentos
  }

  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function partirLinea(linea){
  let l = linea.trim();

  let fin = l.length;                              // los `;;` del final
  while(fin > 0 && l.charCodeAt(fin-1) === 59) fin--;
  if(fin !== l.length) l = l.slice(0, fin);

  // La fila entera puede venir envuelta en comillas
  if(l.charCodeAt(0) === 34 && l.charCodeAt(l.length-1) === 34) l = l.slice(1, -1);

  const coma = l.lastIndexOf(',');                 // el nombre puede llevar comas
  if(coma < 1) return null;

  let nombre = l.slice(0, coma).trim();
  if(nombre.indexOf('"') >= 0) nombre = nombre.replace(/""/g, '"');   // sólo 195 filas

  let id = l.slice(coma + 1).trim();
  const punto = id.lastIndexOf('.');
  if(punto > 0) id = id.slice(0, punto);
  if(id.indexOf('"') >= 0) id = id.replace(/"/g, '');

  if(!nombre || !id) return null;
  for(let i=0;i<id.length;i++){                    // que el ID sea sólo dígitos
    const c = id.charCodeAt(i);
    if(c < 48 || c > 57) return null;
  }
  return { nombre, id };
}

/* El resultado: un índice listo para consultar, más el recuento de lo que se
   ha encontrado, que se enseña al usuario para que sepa qué ha cargado. */
export function interpretar(bytes){
  const porNombre = new Map();   // normalizado -> Set de IDs
  let filas = 0, descartadas = 0;

  for(const linea of lineasDelFichero(new Uint8Array(bytes))){
    if(!linea.trim()) continue;                  // el CRLF ya lo quita partirLinea

    const fila = partirLinea(linea);
    if(!fila){ descartadas++; continue; }

    filas++;
    const clave = normalizar(fila.nombre);
    if(!clave) continue;
    if(!porNombre.has(clave)) porNombre.set(clave, new Set());
    porNombre.get(clave).add(fila.id);
  }

  let ambiguos = 0;
  for(const ids of porNombre.values()) if(ids.size > 1) ambiguos++;

  return { porNombre, filas, descartadas, nombres: porNombre.size, ambiguos };
}

/* ================================
   El maestro en uso
================================ */
const RUTA = new URL('../../docs/nombres.csv', import.meta.url).href;

let maestro = null;          // el índice cargado
let cargando = null;         // la promesa en curso, para no pedirlo dos veces

export const hayMaestro = () => maestro !== null;
export const resumenMaestro = () => maestro && {
  nombres: maestro.nombres, ambiguos: maestro.ambiguos, descartadas: maestro.descartadas
};

/* Se pide sólo cuando hace falta —son 3,8 MB que no tienen por qué bajarse
   para entrar en la portada— pero se pide PRONTO: el modo lo lanza al entrar,
   mientras el usuario coloca pupilas. Leerlo cuesta unos dos segundos, y
   pagarlos ahí es gratis; pagarlos al pulsar EXPORTAR sería una espera con el
   usuario mirando. Si ya está cargado o cargándose, esta llamada no repite. */
export function cargarMaestro(){
  if(maestro)  return Promise.resolve(maestro);
  if(cargando) return cargando;

  /* `no-cache` obliga al navegador a preguntar al servidor si el fichero ha
     cambiado. No lo vuelve a bajar si sigue igual —para eso están ETag y
     Last-Modified—, pero evita que alguien siga trabajando semanas con un
     listado caducado en su caché sin enterarse. El fichero se actualiza por
     FTP cada dos semanas. */
  cargando = fetch(RUTA, { cache:'no-cache' })
    .then(r=>{
      if(!r.ok) throw new Error(`No se ha podido leer el maestro de IDs (${r.status})`);
      return r.arrayBuffer();
    })
    .then(b=>{ maestro = interpretar(b); cargando = null; return maestro; })
    .catch(e=>{ cargando = null; throw e; });

  return cargando;
}

/* Sustituye el maestro por uno traído por el usuario. Sustituye, no suma: si
   el de aplicativo se ha quedado viejo, mezclarlo sólo serviría para arrastrar
   lo viejo. */
export async function usarCsvPropio(fichero){
  const bytes = await fichero.arrayBuffer();
  const nuevo = interpretar(bytes);
  if(!nuevo.nombres) throw new Error('Ese fichero no tiene ninguna fila utilizable.');
  maestro = nuevo;
  return nuevo;
}

/* ================================
   La consulta

   Devuelve un veredicto explícito en vez de un ID o null, porque «no está» y
   «está dos veces» son dos problemas distintos y el usuario tiene que poder
   distinguirlos.
================================ */
export function buscarId(nombreFichero){
  if(!maestro) return { estado:'sin-maestro' };

  const ids = maestro.porNombre.get(normalizar(nombreFichero));
  if(!ids)          return { estado:'no-esta' };
  if(ids.size > 1)  return { estado:'ambiguo', candidatos:[...ids].sort() };
  return { estado:'encontrado', id:[...ids][0] };
}
