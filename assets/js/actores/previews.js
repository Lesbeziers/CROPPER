/* ================================
   Previews en vivo — modo ACTORES 800x800

   El cuadrado es lo que se exporta; el círculo es lo que verá la gente cuando
   la plataforma le aplique su máscara. Para que no puedan desincronizarse
   NUNCA, no se dibujan por separado: se pinta UN solo lienzo de 800x800 fuera
   de pantalla y se vuelca en los dos. El círculo son los mismos píxeles con un
   recorte encima, así que no existe un segundo encuadre que pueda discrepar.
================================ */
import { els } from './dom.js';
import { estado, actual } from './estado.js';
import { copiaDeTrabajo } from './copia.js';
import {
  LADO, PLANTILLA, TRAZO, ENCUADRE_NEUTRO,
  calcularTransformacion, aplicarTransformacion,
  objetivoIzquierdo, objetivoDerecho
} from './geometria.js';
import { crearLienzo, readToken } from '../utils.js';

const C = {
  vacio    : readToken('--stage-empty','#0d0d0d'),
  hueco    : readToken('--err','#ff6b6b'),
  barbilla : readToken('--barbilla-medida','#4fc3f7')
};

/* El lienzo intermedio se crea una vez y se reutiliza */
let intermedio = null;
function lienzoIntermedio(){
  if(!intermedio) intermedio = crearLienzo(LADO, LADO, 'preparar el preview de 800x800');
  return intermedio;
}

function prepararVisible(canvas){
  canvas.width = LADO;
  canvas.height = LADO;
  return canvas.getContext('2d');
}

function pintarVacio(){
  for(const canvas of [els.previewCuadrado, els.previewRedondo]){
    const cx = prepararVisible(canvas);
    cx.fillStyle = C.vacio;
    cx.fillRect(0, 0, LADO, LADO);
  }
}

/* Las guías son la plantilla puesta encima: la raya a la altura de los ojos y
   los dos círculos donde tienen que caer las pupilas. Mientras no se toque
   nada son redundantes —la transformación nace de los puntos—, pero en cuanto
   se retoca a mano son lo único que dice cuánto te has desviado.

   Todas con un único trazo, como la clase `.st1` del SVG; lo que se separa del
   fichero es sólo el grosor, y el porqué está en geometria.js. No se dibuja el
   marco exterior: el lienzo ya es el cuadrado y no añadiría información. */
function pintarGuias(cx){
  cx.save();

  // El trazo se pinta centrado en el contorno, así que la mitad se saldría
  const margen = TRAZO.grosor/2;

  cx.strokeStyle = TRAZO.color;
  cx.lineWidth   = TRAZO.grosor;
  cx.setLineDash(TRAZO.discontinua);

  // Eje vertical
  cx.beginPath();
  cx.moveTo(LADO/2, 0);
  cx.lineTo(LADO/2, LADO);
  cx.stroke();

  // Raya de los ojos y raya de la barbilla
  for(const y of [PLANTILLA.ojosY, PLANTILLA.barbillaY]){
    cx.beginPath();
    cx.moveTo(0, y);
    cx.lineTo(LADO, y);
    cx.stroke();
  }

  // Círculo inscrito: lo que la plataforma recorta
  cx.beginPath();
  cx.arc(LADO/2, LADO/2, LADO/2 - margen, 0, Math.PI*2);
  cx.stroke();

  /* Las dos pupilas van como AROS, no rellenas como en el SVG. En el fichero
     son ilustración; aquí, en cuanto se escala a mano, las pupilas de verdad se
     salen del objetivo — y un disco opaco taparía justo el ojo que hay que
     mirar para saber cuánto te has desviado. Hueco se ve a través. */
  cx.setLineDash([]);
  cx.lineWidth = TRAZO.grosor;
  for(const [p, color] of [[objetivoIzquierdo(), TRAZO.colorIzquierdo],
                           [objetivoDerecho(),   TRAZO.colorDerecho]]){
    cx.beginPath();
    cx.arc(p.x, p.y, TRAZO.radioPupila, 0, Math.PI*2);
    cx.strokeStyle = color;
    cx.stroke();
  }

  cx.restore();
}

/* Dónde cree la malla que está la barbilla, frente a dónde la quiere la
   plantilla. Es un DIAGNÓSTICO: sirve para juzgar si el dato es de fiar, no
   se usa para nada automático. Ver nucleo/deteccion.js.

   Primero lo pinté como una cruz del mismo ámbar que las guías, y resultó
   invisible: cuando la barbilla cae cerca de la raya —justo el caso que hay
   que medir— el marcador se funde con ella. Por eso ahora es una LÍNEA ENTERA
   y de otro color: la separación entre la cian y la ámbar ES el error, y se
   lee sin buscarla. */
function pintarBarbilla(cx, rec, t, factor){
  if(!rec.barbilla) return;

  const e = t.escala / factor;
  const dx = (rec.barbilla.x - t.centro.x) * factor * e;
  const dy = (rec.barbilla.y - t.centro.y) * factor * e;
  const p = {
    x: t.destino.x + dx*Math.cos(t.giro) - dy*Math.sin(t.giro),
    y: t.destino.y + dx*Math.sin(t.giro) + dy*Math.cos(t.giro)
  };

  cx.save();
  cx.strokeStyle = C.barbilla;
  cx.fillStyle   = C.barbilla;
  cx.setLineDash([]);          // continua: la plantilla es discontinua

  cx.lineWidth = 2;
  cx.beginPath();
  cx.moveTo(0, p.y);
  cx.lineTo(LADO, p.y);
  cx.stroke();

  // El punto exacto, para que se vea que la línea sale de algún sitio
  cx.beginPath();
  cx.arc(p.x, p.y, 6, 0, Math.PI*2);
  cx.fill();

  cx.restore();
}

export function pintarPreviews(){
  const rec = actual();

  if(!rec || rec.puntos?.length !== 2){
    pintarVacio();
    return;
  }

  const t = calcularTransformacion(rec.puntos, rec.barbilla, rec.encuadre || ENCUADRE_NEUTRO);
  if(!t){ pintarVacio(); return; }

  const { fuente, factor } = copiaDeTrabajo(rec);
  const { c: medio, cx: mcx } = lienzoIntermedio();

  /* Se rellena antes de dibujar con un color que no puede confundirse con una
     foto: si al girar o desencuadrar la imagen deja de cubrir los 800x800, el
     hueco se ve en rojo en vez de colarse como si nada. */
  mcx.setTransform(1,0,0,1,0,0);
  mcx.clearRect(0, 0, LADO, LADO);
  mcx.fillStyle = C.hueco;
  mcx.fillRect(0, 0, LADO, LADO);

  mcx.save();
  aplicarTransformacion(mcx, t, factor);
  mcx.imageSmoothingQuality = 'high';
  mcx.drawImage(fuente, 0, 0);
  mcx.restore();

  // ---- Cuadrado: el volcado tal cual, más las guías
  const ccx = prepararVisible(els.previewCuadrado);
  ccx.drawImage(medio, 0, 0);
  if(estado.guias){
    pintarGuias(ccx);
    pintarBarbilla(ccx, rec, t, factor);
  }

  // ---- Redondo: los MISMOS píxeles, recortados
  const rcx = prepararVisible(els.previewRedondo);
  rcx.fillStyle = C.vacio;
  rcx.fillRect(0, 0, LADO, LADO);
  rcx.save();
  rcx.beginPath();
  rcx.arc(LADO/2, LADO/2, LADO/2, 0, Math.PI*2);
  rcx.clip();
  rcx.drawImage(medio, 0, 0);
  rcx.restore();
}
