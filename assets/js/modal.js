/* ================================
   Modal de confirmación

   Sustituye a confirm() del navegador. Usa <dialog> nativo, que ya resuelve
   el foco atrapado, la tecla Esc y el pintado por encima de todo.
================================ */
const dlg      = document.getElementById('modal');
const elTitulo = document.getElementById('modalTitulo');
const elTexto  = document.getElementById('modalTexto');
const btnOk    = document.getElementById('modalAceptar');
const btnNo    = document.getElementById('modalCancelar');

// Pulsar fuera de la caja equivale a cancelar
dlg.addEventListener('click', ev=>{
  if(ev.target === dlg) dlg.close('cancelar');
});

function abrir({ titulo, mensaje, aceptar, cancelar, conCancelar }){
  elTitulo.textContent = titulo;
  elTexto.textContent  = mensaje;
  btnOk.textContent    = aceptar;
  btnNo.textContent    = cancelar;
  btnNo.hidden         = !conCancelar;

  dlg.showModal();
  (conCancelar ? btnNo : btnOk).focus();   // por defecto, la opción segura

  return new Promise(resolve=>{
    dlg.addEventListener('close', ()=>{
      btnNo.hidden = false;
      resolve(dlg.returnValue === 'aceptar');
    }, { once:true });
  });
}

/**
 * Confirmación de dos opciones.
 * @returns {Promise<boolean>} true si el usuario confirma
 */
export function confirmar({ titulo, mensaje, aceptar='ACEPTAR', cancelar='CANCELAR' }){
  return abrir({ titulo, mensaje, aceptar, cancelar, conCancelar:true });
}

/** Aviso de un solo botón. Sustituye a alert(). */
export function avisar({ titulo, mensaje, aceptar='ENTENDIDO' }){
  return abrir({ titulo, mensaje, aceptar, cancelar:'', conCancelar:false });
}
