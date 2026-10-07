/* ================================
   Geometría de la plantilla — modo ACTORES 800x800

   Sacada de `assets/img/Referencia_Ojos_Escalado_B.svg` (mesa de 800x800), que
   es la especificación, no un asset: la herramienta no la carga en ningún
   momento. Estas guías se dibujan por código a partir de los números de aquí.

   Del SVG, literal:
     círculo izquierdo   cx=305.56  cy=313.12
     círculo derecho     cx=496.17  cy=313.12
     raya de ojos        y=311.19
     raya de barbilla    y=666.75
     eje vertical        x=404.02
     círculo inscrito    cx=400 cy=400 r=400

   A QUIÉN SE CREE Y POR QUÉ. El fichero trae pequeñas derivas de dibujo: la
   raya de ojos va 1,9 px por encima de los centros de los círculos, el eje
   vertical está 4 px descentrado y el punto medio entre pupilas cae 0,87 px a
   la derecha del centro. Mandan LOS CÍRCULOS, que son el objetivo de verdad de
   las pupilas; las rayas son ayudas visuales. Y se centra en 400 exacto, que
   es donde el propio SVG pone el círculo inscrito.

   Así la guía que se pinta es coherente consigo misma: la raya sale justo por
   los centros de las pupilas, y no 2 px más arriba.
================================ */

/* El espacio en el que está definida la plantilla. NO se toca: los números de
   abajo salieron del SVG medidos sobre un lienzo de 800. */
export const LADO = 800;

/* Lo que mide el fichero que se entrega. Es lo ÚNICO que hay que cambiar para
   mover el tamaño de salida: el recorte se revela a esta medida escalando desde
   el espacio de la plantilla, así que la geometría no se entera.

   De aquí salen también el nombre de la carpeta del ZIP, los rótulos bajo los
   previews y el botón de la portada. Ninguno está escrito a mano.

   Estuvo a 400 entre el 2026-10-01 y el 2026-10-07, mientras auditaban el
   espacio en nube. Vuelve a 800, que es la medida buena. */
export const LADO_EXPORTACION = 800;

export const PLANTILLA = {
  ojosY           : 313.12,   // altura de los centros de las pupilas
  distanciaPupilas: 190.61,   // 496.17 − 305.56

  /* La barbilla SÍ se cuadra (ver factorBarbilla más abajo). No se puede
     cumplir a la vez que la distancia entre pupilas —la razón cara/ojos varía
     de una persona a otra—, así que manda la barbilla y las pupilas se
     separan un poco de su distancia nominal. Caben en sus círculos: el radio
     de 17,29 da un margen del ±18%, que cubre el rango que hemos medido. */
  barbillaY       : 666.75
};

/* ================================
   Cómo se dibuja la guía

   Color y pupilas salen del propio SVG (clase `.st1`, trazo #e6a43c; círculos
   de radio 17,29 rellenos y sin contorno), para que la guía de la herramienta
   y la referencia que circula por el equipo hablen el mismo idioma.

   El GROSOR sí se separa a propósito. El SVG las dibuja a 1 px porque ahí son
   una ilustración; aquí son instrumentos de medida —sirven para juzgar si la
   cara está colocada— y a 1 px sobre una cara clara no se ven. Van a 3, y los
   guiones se escalan igual (4 4 del fichero × 3) para que la proporción entre
   trazo y hueco siga siendo la del diseño.

   Y no se dibuja el marco exterior que sí trae el SVG: el lienzo entero YA es
   el cuadrado, así que no aporta ninguna información.

   OJO: de aquí sale el ASPECTO, no las posiciones. Las líneas se pintan en la
   geometría ya corregida (ver arriba), no en las coordenadas literales del
   fichero: dibujar el eje en 404.02 lo dejaría visiblemente descentrado y la
   raya de ojos en 311.19 pasaría por encima de las pupilas en vez de por ellas.
================================ */
export const TRAZO = {
  color       : '#e6a43c',     // .st1 del SVG
  grosor      : 3,
  discontinua : [12, 12],      // la 4 4 del SVG, a la misma escala que el grosor
  radioPupila : 17.29,
  colorIzquierdo: '#7fe39a',   // .st2 del SVG
  colorDerecho  : '#ffd166'    // .st0 del SVG
};

/* Dónde tienen que caer las dos pupilas en el lienzo de salida */
export const objetivoIzquierdo = () => ({ x: LADO/2 - PLANTILLA.distanciaPupilas/2, y: PLANTILLA.ojosY });
export const objetivoDerecho   = () => ({ x: LADO/2 + PLANTILLA.distanciaPupilas/2, y: PLANTILLA.ojosY });

/* Encuadre sin retocar: el que sale sólo de las pupilas */
export const ENCUADRE_NEUTRO = Object.freeze({ dx:0, dy:0, escala:1, giro:0 });

/* ================================
   La transformación

   Escala, giro y traslación en una sola matriz. Lo que se sale del lienzo se
   recorta solo, así que no hace falta calcular ningún recorte.

   Clave del diseño: el pivote es el PUNTO MEDIO ENTRE LAS PUPILAS. Giro y
   escala ocurren alrededor de él, así que **el punto medio no se mueve nunca**
   con esos dos mandos — sólo `dx`/`dy` lo desplazan. La cara pivota y crece en
   su sitio en vez de irse hacia una esquina, que es lo que la haría inmanejable.

   OJO, las pupilas SÍ se mueven al escalar (se separan) y al girar (se
   inclinan); lo que no se mueve es su punto medio. Y eso es deseable: cuando
   se salen de los círculos de la guía, esa separación es exactamente la medida
   de cuánto te has apartado de la plantilla.
================================ */
/* Cuánto puede crecer o encoger el encuadre sin que las pupilas se salgan de
   sus círculos. El radio de los círculos del SVG no es decoración: es la
   tolerancia que admite el diseño. */
export const TOLERANCIA = TRAZO.radioPupila / (PLANTILLA.distanciaPupilas/2);

/* Factor que lleva la barbilla a su raya, escalando desde el punto medio entre
   pupilas —así los ojos no se mueven de la raya de arriba—.

   Va topado: si a una cara le hiciera falta más de lo que admiten los círculos,
   se aplica el máximo y su barbilla se queda corta. Eso NO se oculta: la línea
   azul simplemente no llegará a la ámbar, que es la señal de que el tope actuó.

   Sin barbilla detectada devuelve 1: el encuadre se queda en el de las pupilas.
   Pasa cuando las pupilas se han puesto a mano y no hubo detección. */
export function factorBarbilla(puntos, barbilla){
  if(!barbilla || puntos?.length !== 2) return 1;

  const [izq, dch] = puntos;
  const dx = dch.x - izq.x, dy = dch.y - izq.y;
  const separacion = Math.hypot(dx, dy);
  if(!(separacion > 0)) return 1;

  const escalaBase = PLANTILLA.distanciaPupilas / separacion;
  const giro = -Math.atan2(dy, dx);
  const centro = { x: izq.x + dx/2, y: izq.y + dy/2 };

  // A qué altura cae la barbilla con el encuadre que sale sólo de las pupilas
  const bx = (barbilla.x - centro.x) * escalaBase;
  const by = (barbilla.y - centro.y) * escalaBase;
  const caida = bx*Math.sin(giro) + by*Math.cos(giro);
  if(!(caida > 0)) return 1;

  const k = (PLANTILLA.barbillaY - PLANTILLA.ojosY) / caida;
  return Math.min(1 + TOLERANCIA, Math.max(1 - TOLERANCIA, k));
}

/* Dónde caería la barbilla si no hubiera que corregir nada, es decir el punto
   que deja el factor en 1. Sirve para tener SIEMPRE un punto que arrastrar,
   incluso cuando el detector falló y las pupilas se pusieron a mano: sin esto,
   esas imágenes se encuadrarían con otra regla que las demás.

   Se mide hacia "abajo" en el eje de la cara —perpendicular a la línea de los
   ojos—, no hacia abajo en la foto, para que valga también con la cabeza
   inclinada. */
export function barbillaPorDefecto(puntos){
  if(puntos?.length !== 2) return null;

  const [izq, dch] = puntos;
  const dx = dch.x - izq.x, dy = dch.y - izq.y;
  const separacion = Math.hypot(dx, dy);
  if(!(separacion > 0)) return null;

  const abajo = { x: -dy/separacion, y: dx/separacion };
  const distancia = (PLANTILLA.barbillaY - PLANTILLA.ojosY) * separacion / PLANTILLA.distanciaPupilas;

  return {
    x: izq.x + dx/2 + abajo.x * distancia,
    y: izq.y + dy/2 + abajo.y * distancia
  };
}

export function calcularTransformacion(puntos, barbilla = null, encuadre = ENCUADRE_NEUTRO){
  if(puntos?.length !== 2) return null;

  const [izq, dch] = puntos;
  const dx = dch.x - izq.x;
  const dy = dch.y - izq.y;
  const separacion = Math.hypot(dx, dy);
  if(!(separacion > 0)) return null;

  const k = factorBarbilla(puntos, barbilla);

  return {
    // Punto medio entre pupilas, en coordenadas de la imagen ORIGINAL
    centro : { x: izq.x + dx/2, y: izq.y + dy/2 },
    /* Escala: la que pone las pupilas a la distancia de la plantilla,
       corregida para que la barbilla caiga en su raya, y por último el
       retoque manual. Como todo pivota sobre el punto medio entre pupilas,
       los ojos no se despegan de su raya en ningún momento. */
    escala : (PLANTILLA.distanciaPupilas / separacion) * k * encuadre.escala,
    // Lo justo para poner la línea de ojos horizontal, más el retoque manual
    giro   : -Math.atan2(dy, dx) + encuadre.giro,
    // Dónde acaba ese punto medio dentro del lienzo de salida
    destino: { x: LADO/2 + encuadre.dx, y: PLANTILLA.ojosY + encuadre.dy }
  };
}

/* Deja el contexto listo para un drawImage(fuente,0,0).

   `factorFuente` es cuánto se ha encogido la fuente respecto al original (ver
   copia.js): 1 si se dibuja del original, <1 si de la copia de trabajo. Las
   pupilas están siempre en coordenadas del original, así que hay que llevarlas
   a las de la fuente antes de usarlas. */
export function aplicarTransformacion(ctx, t, factorFuente = 1){
  ctx.translate(t.destino.x, t.destino.y);
  ctx.rotate(t.giro);
  const e = t.escala / factorFuente;
  ctx.scale(e, e);
  ctx.translate(-t.centro.x * factorFuente, -t.centro.y * factorFuente);
}
