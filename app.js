// ============================================================
// DEBUG FLAG
// Lee `shopmate:debug` de localStorage. Si es '0', todos los
// console.* salvo console.error quedan silenciados. Si es '1'
// o no existe, muestra todo. Pensado para que en local David
// pueda activar/desactivar logs sin tocar el codigo.
// ============================================================
const DEBUG = (() => {
  try { return localStorage.getItem('shopmate:debug') !== '0'; }
  catch { return true; }
})();
const log    = (...a) => { if (DEBUG) console.log  (...a); };
const warn   = (...a) => { if (DEBUG) console.warn (...a); };
const logerr = (...a) => {              console.error(...a); };

// ============================================================
// Firebase
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getDatabase, ref, onValue, push, update, remove, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// Firebase config (externalizada) — loader transparente, ver ./firebase-config.js
import { firebaseConfig } from "./firebase-config.js";

log('[firebase] init con proyecto', firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// ============================================================
// Referencias al DOM
// ============================================================
const checklistEl = document.getElementById('checklist');
const inputEl     = document.getElementById('item-input');
const addBtn      = document.getElementById('add-btn');
const validarBtn  = document.getElementById('validar-btn');
log('[dom] refs OK', {
  checklistEl: !!checklistEl,
  inputEl: !!inputEl,
  addBtn: !!addBtn,
  validarBtn: !!validarBtn,
});

// ============================================================
// Cap blando por colección (movido de rules.json por
// incompatibilidad del emulador RTDB v4.11 con newData.numChildren()).
// La validación de esquema (nombre, comprado, nota, hasChildren)
// sigue endurecida en database.rules.json. Este cap es defensa-en-
// profundidad de tipo UX: si el esquema pasa, este techo evita que
// la lista se dispare. Un atacante con cliente custom se lo salta,
// pero en Fase 1.A eso ya queda bloqueado por auth != null.
// ============================================================
const MAX_ITEMS = 500;
let currentItemCount = 0;
log('[cap] MAX_ITEMS', MAX_ITEMS);

// ============================================================
// Renderizado (modulo aislado)
// ============================================================
function renderLista(snapshot) {
  log('[render] snapshot recibido, hijos:', snapshot.size);
  checklistEl.innerHTML = '';
  let hayMarcados = false;

  snapshot.forEach(childSnapshot => {
    const key = childSnapshot.key;
    const item = childSnapshot.val();
    log('[render] item', key, item);

    const wrapper = document.createElement('div');
    wrapper.classList.add('list-item');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = key;
    checkbox.checked = item.comprado || false;
    checkbox.addEventListener('change', () => {
      log('[render] toggle comprado', key, checkbox.checked);
      update(ref(db, 'items/' + key), { comprado: checkbox.checked })
        .catch(err => logerr('[render] update ERROR', key, err));
    });

    const label = document.createElement('label');
    label.setAttribute('for', key);
    label.textContent = item.nombre;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    checklistEl.appendChild(wrapper);

    if (item.comprado) hayMarcados = true;

    if (item.nota) {
      log('[render] item con nota -> anado icono', key, item.nota);
      const notaIcon = document.createElement('span');
      notaIcon.innerText = '📝';
      notaIcon.style.cursor = 'pointer';
      notaIcon.title = 'Ver nota';
      notaIcon.style.marginLeft = '10px';
      notaIcon.addEventListener('click', () => {
        log('[render] click icono nota', key, item.nombre);
        mostrarNotaPopup(item.nombre, item.nota);
      });
      wrapper.appendChild(notaIcon);
    }
  });

  validarBtn.style.display = hayMarcados ? 'block' : 'none';
  currentItemCount = snapshot.size;
  log('[render] hayMarcados', hayMarcados, 'currentItemCount', currentItemCount);
}

// ============================================================
// Anadir item (modulo aislado)
// ============================================================
function addItem() {
  const raw = inputEl.value.trim();
  log('[add] click, raw=', raw);
  const { nombre, nota } = procesarInput(raw);
  log('[add] parsed', { nombre, nota });
  if (!nombre) {
    warn('[add] nombre vacio, abort');
    return;
  }
  if (currentItemCount >= MAX_ITEMS) {
    warn('[add] cap MAX_ITEMS alcanzado -> abort', { currentItemCount, MAX_ITEMS });
    return;
  }
  const payload = { nombre, comprado: false, nota };
  log('[add] pushing a /items', payload);
  push(ref(db, 'items'), payload)
    .then(ref => log('[add] OK ref=', ref.key))
    .catch(err => logerr('[add] push ERROR', err));
  inputEl.value = '';
  inputEl.focus();
}

// ============================================================
// Validar y eliminar marcados (modulo aislado)
// ============================================================
function validarComprados() {
  log('[validator] click');
  onValue(ref(db, 'items'), snapshot => {
    const toRemove = [];
    snapshot.forEach(childSnapshot => {
      if (childSnapshot.val().comprado) toRemove.push(childSnapshot.key);
    });
    log('[validator] marcados a eliminar', toRemove);
    toRemove.forEach(k => {
      remove(ref(db, 'items/' + k))
        .then(() => log('[validator] removed', k))
        .catch(err => logerr('[validator] remove ERROR', k, err));
    });
  }, { onlyOnce: true });
}

// ============================================================
// Popup de notas (modulo aislado con aislamiento de errores)
// ============================================================
function mostrarNotaPopup(nombre, nota) {
  log('[popup] mostrarNotaPopup', { nombre, nota });
  const popupEl   = document.getElementById('nota-popup');
  const tituloEl  = document.getElementById('popup-titulo');
  const notaTxtEl = document.getElementById('popup-nota');

  if (!popupEl) {
    logerr('[popup] #nota-popup no existe en el DOM — el HTML no tiene el contenedor');
    return;
  }
  if (!tituloEl || !notaTxtEl) {
    logerr('[popup] faltan nodos internos (#popup-titulo o #popup-nota)');
    return;
  }

  tituloEl.textContent = nombre;
  notaTxtEl.textContent = nota;
  popupEl.classList.remove('hidden');
  log('[popup] shown');
}

function cerrarPopup() {
  log('[popup] cerrarPopup');
  const popupEl = document.getElementById('nota-popup');
  if (!popupEl) {
    logerr('[popup] #nota-popup no existe en el DOM al cerrar');
    return;
  }
  popupEl.classList.add('hidden');
  log('[popup] hidden');
}
// Nota: index.html tiene un `cerrarPopup` inline para el onclick="cerrarPopup()".
// Hace lo mismo (classList.add('hidden')). Si renombras la logica, actualiza
// ambos sitios o mueve el onclick a app.js.

// ============================================================
// Base de datos isolada para testing
// Bloque ejecutado ANTES del listener `onValue` para que el emulador
// tome el control de RTDB antes de cualquier operacion (suscripcion,
// push, update, remove). Ver dev-isolation.txt.
// ============================================================
if (window.location.search.includes('env=emul')) {
  connectDatabaseEmulator(db, 'localhost', 9000);
  log('[firebase] usando EMULADOR local');
}

// ============================================================
// Sincronizacion RTDB
// Suscrita DESPUES del bloque del emulador por la razón de arriba.
// ============================================================
onValue(ref(db, 'items'),
  renderLista,
  err => logerr('[firebase] onValue ERROR', err)
);

// ============================================================
// Eventos UI
// ============================================================
addBtn    .addEventListener('click',  addItem);
inputEl   .addEventListener('keypress', e => { if (e.key === 'Enter') { log('[add] Enter'); addItem(); } });
validarBtn.addEventListener('click',  validarComprados);

// Cerrar popup al pulsar fuera del card
document.addEventListener('click', e => {
  const popupEl = document.getElementById('nota-popup');
  if (!popupEl) return;
  if (popupEl.classList.contains('hidden')) return;
  if (!e.target.closest('.popup-content') && !e.target.closest('.popup-close')) {
    log('[popup] click fuera del card -> cerrar');
    popupEl.classList.add('hidden');
  }
});
// Cerrar popup con Escape
document.addEventListener('keydown', e => {
  const popupEl = document.getElementById('nota-popup');
  if (!popupEl) return;
  if (e.key === 'Escape' && !popupEl.classList.contains('hidden')) {
    log('[popup] Escape -> cerrar');
    popupEl.classList.add('hidden');
  }
});

// ============================================================
// Helpers
// ============================================================
function procesarInput(input) {
  log('[processor] procesarInput', { input });
  // Extraer nombre y nota (si existe)
  // Formato esperado: "nombre (nota)" o "nombre"
  const match = input.match(/^(.*?)\s*(?:\((.*)\))?$/);
  if (!match) {
    return { nombre: '', nota: '' };
  }
  
  const nombre = match[1]?.trim() || '';
  const nota = match[2]?.trim() || '';
  
  return { nombre, nota };
}
