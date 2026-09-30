/* ================================
   De nombre de fichero a ID — modo ACTORES 800x800

   Une las dos fuentes: el maestro que baja de aplicativo y el vocabulario que
   el editor ha ido escribiendo a mano.

   ORDEN DE PRIORIDAD: **manda el maestro cuando tiene una respuesta clara.**
   Lo escrito a mano sólo rellena huecos y desempata los 17 homónimos.

   Podría parecer al revés —lo que teclea una persona debería pesar más que un
   fichero— y así estaba al principio. Pero el maestro **nunca cambia un ID,
   sólo añade actores nuevos**, y se actualiza cada dos semanas. Con la
   prioridad invertida, un dígito mal tecleado hoy se seguiría usando dentro de
   un mes, cuando ese actor ya estuviera en el listado con su ID bueno.

   Lo que se teclea vive en la propia imagen y **muere con el proyecto**. Hubo
   una versión que lo guardaba entre sesiones, y el problema era justamente ése:
   un ID mal metido se quedaba pegado sin forma visible de cambiarlo.
================================ */
import { buscarId } from './csv.js';

/* Devuelve, por cada imagen, o un ID con su procedencia, o el motivo por el
   que no lo hay. El motivo importa: «no está en el maestro» y «está dos veces»
   se resuelven igual pero se explican distinto. */
export function resolver(rec){
  const v = buscarId(rec.name);
  if(v.estado === 'encontrado') return { rec, id:v.id, origen:'maestro' };

  // El maestro no sabe, o sabe de más: aquí sí vale lo escrito a mano
  const mio = (rec.idManual || '').trim();
  if(mio) return { rec, id:mio, origen:'a-mano', motivo:v.estado, candidatos:v.candidatos || null };

  return { rec, id:null, motivo:v.estado, candidatos:v.candidatos || null };
}

export const resolverTodos = imagenes => imagenes.map(resolver);

export const sinResolver = resueltos => resueltos.filter(r => !r.id);
