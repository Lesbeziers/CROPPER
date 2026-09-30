/* ================================
   Deshacer — modo ACTORES 800x800

   Cubre lo que el ratón puede destruir sin querer: las pupilas y la barbilla.
   Un clic despistado sobre la foto borra las dos pupilas de golpe, y volver a
   colocarlas a mano es el único trabajo que se pierde de verdad en toda la
   herramienta.

   NO cubre el encuadre —posición, escala, giro—. Eso ya tiene su RESET, sus
   cambios son pequeños y visibles, y meterlo aquí obligaría a decidir qué
   cuenta como «un paso» cuando se deja una flecha pulsada.

   LO QUE OCUPA, que era la duda: cada paso guarda dos pupilas y una barbilla,
   o sea seis números. Cincuenta pasos son trescientos números — unos pocos
   kilobytes, menos que cualquier icono. Deshacer sobre IMÁGENES sí costaría
   memoria; sobre coordenadas no cuesta nada.
================================ */

const MAXIMO = 50;
const pila = [];

const copiaPunto = p => p ? { x:p.x, y:p.y } : null;

/* Se llama ANTES de tocar nada, y una vez por gesto: al empezar un arrastre,
   no en cada movimiento del ratón. Si no, un solo arrastre llenaría la pila
   de pasos intermedios que nadie quiere deshacer de uno en uno. */
export function recordar(rec){
  if(!rec) return;

  pila.push({
    rec,
    puntos  : rec.puntos ? rec.puntos.map(copiaPunto) : null,
    barbilla: copiaPunto(rec.barbilla)
  });

  if(pila.length > MAXIMO) pila.shift();
}

/* Devuelve la imagen restaurada, para que quien llame pueda enseñarla:
   deshacer algo que no se ve es peor que no deshacer nada. */
export function deshacer(){
  const paso = pila.pop();
  if(!paso) return null;

  paso.rec.puntos   = paso.puntos;
  paso.rec.barbilla = paso.barbilla;
  return paso.rec;
}

export const hayAlgoQueDeshacer = () => pila.length > 0;

export function olvidarHistorial(){
  pila.length = 0;
}
