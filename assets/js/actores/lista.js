/* ================================
   Listado de miniaturas — modo ACTORES 800x800
================================ */
import { els } from './dom.js';
import { estado } from './estado.js';
import { estaRetocada } from './encuadre.js';

/* Los nombres vienen de ficheros que elige otra gente y pueden traer comillas
   o ángulos; por eso el nombre se pone con textContent y no interpolado en
   una plantilla, que rompería el marcado. */
function crearItem(rec, i){
  const item = document.createElement('div');
  item.className = 'item'
    + (i === estado.idx ? ' active' : '')
    + (estado.detectando ? ' locked' : '');

  const mini = document.createElement('img');
  mini.className = 'thumb';
  mini.src = rec.thumbUrl;
  mini.alt = '';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const nombre = document.createElement('div');
  nombre.className = 'name';
  nombre.textContent = rec.name;
  nombre.title = rec.name;

  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = `${rec.width}×${rec.height}px`;

  meta.append(nombre, sub);

  const badge = document.createElement('div');
  badge.className = 'badge ' + (rec.puntos ? 'ok' : 'miss');
  badge.textContent = rec.puntos ? 'OK' : 'FALTA';

  item.append(mini, meta, badge);

  /* Un OK verde dice que hay pupilas, no que la hayas repasado. Esta marca
     separa "la colocó el detector y nadie la ha mirado" de "la he retocado
     yo": en un lote largo es lo que dice por dónde ibas.

     Dura lo que la sesión, porque el encuadre no se guarda (ver estado.js).
     Para deshacer está RESET, que ya existe y ya se entiende. */
  if(estaRetocada(rec)){
    const marca = document.createElement('span');
    marca.className = 'ac-retocada';
    marca.textContent = '✎';
    marca.title = 'Encuadre retocado a mano';
    item.insertBefore(marca, badge);
  }

  return item;
}

/* Quién atiende el clic lo decide el modo al arrancar, una sola vez: así
   refrescarLista() se puede llamar desde cualquier sitio sin arrastrar el
   manejador detrás, y la lista no necesita importar al que la gobierna. */
let alSeleccionar = ()=>{};
export const configurarLista = fn => { alSeleccionar = fn; };

export function refrescarLista(){
  /* Con imágenes cargadas, la zona de arrastre se pliega a una tira: a partir
     de ahí quien necesita el alto es la lista, que puede tener doscientas. */
  els.drop.classList.toggle('plegada', estado.imagenes.length > 0);

  els.lista.innerHTML = '';

  estado.imagenes.forEach((rec, i)=>{
    const item = crearItem(rec, i);
    item.onclick = ()=>{
      if(estado.detectando) return;
      alSeleccionar(i);
    };
    els.lista.appendChild(item);
  });
}
