/* ================================
   Exportación — modo ACTORES 800x800

   Genera un ZIP con los recortes cuadrados en JPG, dentro de una carpeta
   fechada, y cada fichero llamado como el ID del actor.

   Aquí sí se dibuja desde el ORIGINAL a resolución completa: la copia de
   trabajo de copia.js y las miniaturas de parrilla.js valen para mirar, no
   para entregar.
================================ */
import { els } from './dom.js';
import { estado } from './estado.js';
import {
  LADO, LADO_EXPORTACION, ENCUADRE_NEUTRO,
  calcularTransformacion, aplicarTransformacion
} from './geometria.js';
import { resolverTodos } from './resolver.js';
import { crearLienzo, cederControl, readToken, ErrorMemoriaLienzo } from '../utils.js';
import { isCancelled, resetCancel } from '../cancel.js';
import { avisar } from '../modal.js';

/* "máxima calidad posible", literal. Un 800x800 a 1.0 ronda los 300-400 KB
   frente a los ~120 KB que ocuparía a 0.92, que a simple vista es idéntico.
   Se deja en 1.0 porque así se pidió; cambiar este número es todo lo que hay
   que tocar si algún día pesa demasiado. */
const CALIDAD = 1.0;

const C = { hueco: readToken('--err','#ff6b6b') };

/* AA-MM-DD, como en el ejemplo que dio el usuario: "RECORTES 800x800 23-12-16".
   La medida sale de la constante, no escrita a mano: si mañana se vuelve a
   800, el nombre de la carpeta se entera solo. */
function carpetaDeHoy(){
  const d = new Date();
  const dd = n => String(n).padStart(2,'0');
  const L = LADO_EXPORTACION;
  return `RECORTES ${L}x${L} ${dd(d.getFullYear()%100)}-${dd(d.getMonth()+1)}-${dd(d.getDate())}`;
}

function recortar(rec, lienzo){
  const { c, cx } = lienzo;
  const L = LADO_EXPORTACION;

  cx.setTransform(1,0,0,1,0,0);
  cx.fillStyle = C.hueco;              // lo que la foto no cubra saldrá en rojo, no en negro
  cx.fillRect(0,0,L,L);

  const t = calcularTransformacion(rec.puntos, rec.barbilla, rec.encuadre || ENCUADRE_NEUTRO);
  if(!t) return null;

  cx.save();
  /* La plantilla vive en un espacio de 800; el fichero puede salir a otro
     tamaño. Se escala aquí, al final, y así la geometría no se entera. */
  cx.scale(L/LADO, L/LADO);
  aplicarTransformacion(cx, t, 1);     // factor 1: se dibuja del original
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(rec.img, 0, 0);
  cx.restore();

  return new Promise(res => c.toBlob(res, 'image/jpeg', CALIDAD));
}

function mostrarProgreso(visible){
  els.exportProg.style.display = visible ? 'inline-flex' : 'none';
  els.exportar.disabled = visible;
}

function avanzar(hechas, total){
  const p = Math.round(hechas*100/total);
  els.exportFill.style.width = p+'%';
  els.exportTxt.textContent = `${hechas} / ${total}`;
}

export async function exportarRecortes(){
  const imagenes = estado.imagenes;
  if(!imagenes.length) return;

  resetCancel();
  mostrarProgreso(true);
  avanzar(0, imagenes.length);

  const zip = new JSZip();
  const carpeta = zip.folder(carpetaDeHoy());
  const resueltos = resolverTodos(imagenes);

  /* Un solo lienzo de 800x800 para todos: crear doscientos sería regalar
     memoria por nada. */
  let lienzo;
  try{
    lienzo = crearLienzo(LADO_EXPORTACION, LADO_EXPORTACION, 'preparar el lienzo de exportación');
  }catch(e){
    mostrarProgreso(false);
    await avisar({ titulo:'No se ha podido exportar', mensaje:e.message });
    return;
  }

  const usados = new Map();     // nombre de fichero -> veces visto
  let hechas = 0, fallidas = [];

  for(const item of resueltos){
    if(isCancelled()) break;

    const { rec, id } = item;

    /* Sin ID por ninguna vía, sale con su nombre original y el sufijo, para
       que se vea de lejos cuál hay que repasar. */
    const base = id || `${rec.name.replace(/\.[^.]+$/,'')}_NoID`;

    /* Red de seguridad: dos imágenes que resolvieran al mismo ID se pisarían
       dentro del ZIP y una desaparecería sin más. No debería pasar nunca
       —son fotos oficiales, una por actor—, pero si pasa se ve. */
    const vistas = (usados.get(base) || 0) + 1;
    usados.set(base, vistas);
    const nombre = vistas === 1 ? `${base}.jpg` : `${base}_${vistas}.jpg`;

    try{
      const blob = await recortar(rec, lienzo);
      if(!blob) throw new Error('no se ha podido generar el recorte');
      carpeta.file(nombre, blob);
    }catch(e){
      fallidas.push(`${rec.name}: ${e.message || e}`);
      console.warn('Fallo al exportar', rec.name, e);
    }

    hechas++;
    avanzar(hechas, imagenes.length);
    await cederControl();
  }

  if(isCancelled()){
    mostrarProgreso(false);
    resetCancel();
    return;
  }

  els.exportTxt.textContent = 'Comprimiendo…';
  const paquete = await zip.generateAsync(
    { type:'blob', compression:'DEFLATE', compressionOptions:{ level:1 } },
    meta => { els.exportFill.style.width = Math.round(meta.percent)+'%'; }
  );

  mostrarProgreso(false);

  /* Sólo se avisa si algo ha SALIDO MAL.

     Contar los recortes que sí han salido sobra: detrás de esto aparece el
     diálogo del sistema para elegir dónde guardar, y cuando terminas te
     encuentras una ventana contándote algo que ya sabes.

     Lo que no se puede callar es un fallo: un ZIP con 199 de 200 no se nota al
     abrirlo. Las que salen sin ID tampoco se mencionan — ésas ya las aprobaste
     tú en la ventana anterior.

     EL ORDEN IMPORTA. Primero se lee el aviso y se confirma; la descarga sale
     al aceptar. Al revés —que era como estaba— el diálogo del sistema aparecía
     medio segundo después y tapaba el mensaje antes de que diera tiempo a
     leerlo, que es exactamente lo contrario de avisar. */
  if(fallidas.length){
    await avisar({
      titulo : 'Algunas imágenes no han salido',
      mensaje: `${fallidas.length} de ${imagenes.length} no se han podido generar y no estarán en el ZIP: ` +
               fallidas.slice(0,4).join('; ') + (fallidas.length > 4 ? '…' : ''),
      aceptar: 'DESCARGAR EL ZIP'
    });
  }

  descargar(paquete, `${carpetaDeHoy()}.zip`);
}

/* Sin blob: — la CSP corporativa no lo admite — hace falta una URL de objeto,
   que sí está permitida para descargas. Se revoca en cuanto el navegador la
   ha tomado. */
function descargar(blob, nombre){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 4000);
}
