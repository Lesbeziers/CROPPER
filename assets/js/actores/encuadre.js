/* ================================
   Retoque manual del encuadre — modo ACTORES 800x800

   Lo que se guarda por imagen NO es el encuadre final, es el DESVÍO respecto
   al automático. Tiene dos consecuencias buenas:

   - `null` significa "esta imagen no se ha tocado", y se distingue de "se tocó
     y casualmente quedó igual". Eso es lo que permite marcarlas en la lista.
   - Si después de retocar mueves una pupila, la base se recalcula sola y tu
     retoque SIGUE aplicándose encima. No se pierde el trabajo.

   Giro y escala pivotan sobre el punto medio entre las pupilas (ver
   geometria.js): la cara crece y gira en su sitio en vez de escaparse hacia
   una esquina. Las pupilas sí se separan al escalar y se inclinan al girar —
   verlas salirse de los círculos de la guía ES la medida del desvío.
================================ */
import { ENCUADRE_NEUTRO } from './geometria.js';
import { clamp } from '../utils.js';

/* Cuánto vale una pulsación. En píxeles del lienzo de salida (800), en
   proporción y en grados. Tocar aquí cambia la sensibilidad de los botones. */
export const PASO = {
  posicion: 4,      // px
  escala  : 0.02,   // 2% por pulsación
  giro    : 0.5     // grados
};

/* Topes. El giro va corto a propósito: enderezar una cabeza más de veinte
   grados deja el cuello torcido y el resultado se vuelve inquietante, así que
   más vale rehacer la foto que forzarlo aquí. De paso evita que la imagen
   deje de cubrir el lienzo y aparezcan huecos. */
const LIMITE = {
  posicion: 400,          // medio lienzo: más allá la cara ya no se ve
  escala  : [0.2, 5],
  giro    : 20            // grados
};

const partirDe = rec => ({ ...ENCUADRE_NEUTRO, ...(rec.encuadre || {}) });

export const estaRetocada = rec => rec.encuadre != null;

export function mover(rec, pasosX, pasosY){
  const e = partirDe(rec);
  e.dx = clamp(e.dx + pasosX * PASO.posicion, -LIMITE.posicion, LIMITE.posicion);
  e.dy = clamp(e.dy + pasosY * PASO.posicion, -LIMITE.posicion, LIMITE.posicion);
  rec.encuadre = e;
}

export function escalar(rec, pasos){
  const e = partirDe(rec);
  e.escala = clamp(e.escala * (1 + PASO.escala) ** pasos, LIMITE.escala[0], LIMITE.escala[1]);
  rec.encuadre = e;
}

export function girar(rec, pasos){
  const e = partirDe(rec);
  const grados = clamp(e.giro * 180/Math.PI + pasos * PASO.giro, -LIMITE.giro, LIMITE.giro);
  e.giro = grados * Math.PI/180;
  rec.encuadre = e;
}

/* Vuelve al encuadre que sale sólo de las pupilas */
export function volverAlAutomatico(rec){
  rec.encuadre = null;
}
