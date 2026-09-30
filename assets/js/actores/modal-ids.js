/* ================================
   Modal de IDs que faltan — modo ACTORES 800x800

   Aparece sólo si al exportar queda alguna imagen sin ID. Si todas casan, no
   se ve: no hay que molestar a nadie para contarle que todo ha ido bien.

   Enseña qué falta y por qué —no es lo mismo «no está en el maestro» que
   «está dos veces»—, deja teclear el ID a mano y permite cambiar el maestro
   por otro CSV. Ese botón estaba antes suelto en la barra; aquí es donde de
   verdad hace falta.
================================ */
import { estado } from './estado.js';
import { usarCsvPropio } from './csv.js';
import { resolverTodos, sinResolver } from './resolver.js';

const dlg     = document.getElementById('acModalIds');
const texto   = document.getElementById('acIdsTexto');
const lista   = document.getElementById('acIdsLista');
const btnCsv  = document.getElementById('acIdsCargarCsv');
const entrada = document.getElementById('acIdsCsvInput');
const btnNo   = document.getElementById('acIdsCancelar');
const btnSi   = document.getElementById('acIdsSeguir');

const MOTIVOS = {
  'no-esta'    : 'No está en el listado',
  'ambiguo'    : 'Hay varios actores con ese nombre',
  'sin-maestro': 'No se ha podido leer el listado de IDs'
};

function fila(item){
  const f = document.createElement('div');
  f.className = 'ac-ids-fila';

  const nombre = document.createElement('span');
  nombre.className = 'ac-ids-nombre';
  nombre.textContent = item.rec.name;
  nombre.title = item.rec.name;

  const motivo = document.createElement('span');
  motivo.className = 'ac-ids-motivo';
  motivo.textContent = MOTIVOS[item.motivo] || 'Sin ID';

  const campo = document.createElement('input');
  campo.className = 'ac-ids-campo';
  campo.type = 'text';
  campo.inputMode = 'numeric';
  campo.placeholder = 'ID';
  campo.value = item.rec.idManual || '';
  campo.setAttribute('aria-label', `ID para ${item.rec.name}`);
  campo.addEventListener('input', ()=>{
    item.rec.idManual = campo.value.replace(/\D/g,'');   // sólo dígitos
    if(campo.value !== item.rec.idManual) campo.value = item.rec.idManual;
    actualizarRecuento();
  });

  f.append(nombre, motivo, campo);

  /* Si el nombre está repetido en el maestro, se ofrecen los IDs candidatos
     para pulsarlos. Elegir uno es del usuario; la herramienta no se atreve. */
  if(item.candidatos?.length){
    const opciones = document.createElement('span');
    opciones.className = 'ac-ids-candidatos';
    item.candidatos.forEach(id=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ac-ids-candidato';
      b.textContent = id;
      b.onclick = ()=>{
        campo.value = id;
        item.rec.idManual = id;
        actualizarRecuento();
      };
      opciones.appendChild(b);
    });
    f.appendChild(opciones);
  }

  return f;
}

/* Las filas se calculan UNA vez, al abrir, y se quedan.

   Antes se recalculaban en cada tecla, así que en cuanto escribías un ID la
   fila desaparecía de la lista — y si te habías equivocado, ya no había forma
   de corregirlo. Lo que cambia mientras escribes es sólo el recuento. */
function pintarLista(pendientes){
  lista.innerHTML = '';
  pendientes.forEach(item => lista.appendChild(fila(item)));
}

function actualizarRecuento(){
  const n = sinResolver(resolverTodos(estado.imagenes)).length;

  texto.textContent = n
    ? `${n} ${n===1 ? 'imagen no tiene ID' : 'imágenes no tienen ID'}. ` +
      `Puedes escribirlo a mano, cargar otro listado, o exportarlas con «_NoID» en el nombre.`
    : 'Ya tienen todas su ID. Puedes exportar.';

  btnSi.textContent = n ? `EXPORTAR CON ${n} SIN ID` : 'EXPORTAR';
}

/* Devuelve true si hay que seguir adelante con la exportación. */
export function pedirIdsQueFaltan(){
  pintarLista(sinResolver(resolverTodos(estado.imagenes)));
  actualizarRecuento();
  dlg.showModal();

  return new Promise(resolve=>{
    const cerrar = seguir => {
      dlg.close();
      btnSi.removeEventListener('click', alSeguir);
      btnNo.removeEventListener('click', alCancelar);
      btnCsv.removeEventListener('click', alPedirCsv);
      entrada.removeEventListener('change', alElegirCsv);
      resolve(seguir);
    };
    const alSeguir   = ()=> cerrar(true);
    const alCancelar = ()=> cerrar(false);
    const alPedirCsv = ()=> entrada.click();

    const alElegirCsv = async ()=>{
      const f = entrada.files?.[0];
      entrada.value = '';               // que elegir el mismo fichero vuelva a contar
      if(!f) return;
      try{
        const r = await usarCsvPropio(f);
        // Con otro listado cambia quién falta: la lista sí se rehace aquí
        pintarLista(sinResolver(resolverTodos(estado.imagenes)));
        actualizarRecuento();
        texto.textContent = `Listado cambiado: ${r.nombres.toLocaleString('es-ES')} nombres.`;
      }catch(e){
        texto.textContent = `No se ha podido leer ese CSV: ${e.message}`;
      }
    };

    btnSi.addEventListener('click', alSeguir);
    btnNo.addEventListener('click', alCancelar);
    btnCsv.addEventListener('click', alPedirCsv);
    entrada.addEventListener('change', alElegirCsv);
  });
}
