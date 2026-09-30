/* ================================
   Router — enseña una vista y esconde las demás

   Cada modo tiene su propia <section class="vista">, así que basta con
   nombrar la que toca: añadir un modo no obliga a tocar este fichero.
================================ */
const vistas = [...document.querySelectorAll('.vista')];

export function mostrarVista(id){
  vistas.forEach(v => { v.hidden = (v.id !== id); });
}

export const mostrarPortada = () => mostrarVista('portada');
export const mostrarApp     = () => mostrarVista('app');
