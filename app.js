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
import {
  getAuth, onAuthStateChanged,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  signOut, connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Firebase config (externalizada) — loader transparente, ver ./firebase-config.js
import { firebaseConfig } from "./firebase-config.js";

log('[firebase] init con proyecto', firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
log('[auth] instancia inicializada');

// ============================================================
// Referencias al DOM
// ============================================================
const checklistEl = document.getElementById('checklist');
const inputEl     = document.getElementById('item-input');
const addBtn      = document.getElementById('add-btn');
const validarBtn  = document.getElementById('validar-btn');
const popupEl     = document.getElementById('nota-popup');
const appContentEl    = document.getElementById('app-content');
const authModalEl     = document.getElementById('auth-modal');
const authFormEl      = document.getElementById('auth-form');
const authEmailEl     = document.getElementById('auth-email');
const authSendBtnEl   = document.getElementById('auth-send');
const authCancelBtnEl = document.getElementById('auth-cancel');
const authErrorEl     = document.getElementById('auth-error');
const authMessageEl   = document.getElementById('auth-message');
const userInfoEl      = document.getElementById('user-info');
const userEmailEl     = document.getElementById('user-email');
const logoutBtnEl     = document.getElementById('logout-btn');
log('[dom] refs OK', {
  checklistEl: !!checklistEl,
  inputEl: !!inputEl,
  addBtn: !!addBtn,
  validarBtn: !!validarBtn,
  popupEl: !!popupEl,
  appContentEl: !!appContentEl,
  authModalEl: !!authModalEl,
  authFormEl: !!authFormEl,
  authEmailEl: !!authEmailEl,
  userInfoEl: !!userInfoEl,
  logoutBtnEl: !!logoutBtnEl,
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
  if (!requireAuth('addItem')) return;
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
  if (!requireAuth('validarComprados')) return;
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
  // Diferimos el `remove('hidden')` al siguiente tick del event loop. Sin esto,
  // el click que abrió el popup burbujea hasta `document` y el listener global
  // "click fuera del card" lo cierra instantáneamente. Hacerlo async hace a
  // `mostrarNotaPopup` self-contained: cualquier opener futuro (teclado,
  // autocompletado, deep link...) queda blindado sin acordarse de stopPropagation.
  setTimeout(() => {
    popupEl.classList.remove('hidden');
    log('[popup] shown');
  }, 0);
}

function cerrarPopup() {
  log('[popup] cerrarPopup');
  if (!popupEl) {
    logerr('[popup] #nota-popup no existe en el DOM al cerrar');
    return;
  }
  popupEl.classList.add('hidden');
  log('[popup] hidden');
}
// Antes esta funcion estaba duplicada inline en index.html (onclick +
// <script> adicional). Movida la logica al 100% aqui (unica fuente de
// verdad: regla #03). El boton X del popup se conecta via addEventListener
// mas abajo, sin onclick en HTML.

// ============================================================
// Auth (Fase 1.A)
// Flujo: email-link magic-link (passwordless). onAuthStateChanged
// es la fuente de verdad: si hay user → ocultar modal, mostrar
// #app-content, suscribirse a /items, pintar email en cabecera.
// Si no hay user → ocultar #app-content, mostrar modal, y detectar
// si el navegador viene del email-link para completar el login.
// ============================================================
const AUTH_STORAGE_EMAIL = 'shopmate:auth:email';
const AUTH_MAX_AGE_MS    = 24 * 60 * 60 * 1000; // 24h

function actionCodeSettings() {
  // Mismo origen donde está montada la app. handleCodeInApp=true
  // es OBLIGATORIO para que Firebase gestione el link dentro de la
  // app en lugar de saltar a la web de cuentas de Google.
  // La URL debe estar en Authorized domains en Firebase Console.
  return {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true,
  };
}

const AUTH_ERROR_MAP = {
  'auth/invalid-email':          'Email no válido. Revísalo e inténtalo de nuevo.',
  'auth/missing-email':          'Introduce tu email.',
  'auth/quota-exceeded':         'Has superado la cuota de envíos. Inténtalo más tarde.',
  'auth/network-request-failed': 'Error de red. Comprueba tu conexión.',
  'auth/missing-continue-uri':   'Config: añade este dominio a Authorized domains en Firebase Console.',
  'auth/unauthorized-continue-uri': 'Config: la URL de retorno no está autorizada.',
  'auth/invalid-action-code':    'El enlace ha expirado o ya se usó. Vuelve a pedir uno.',
  'auth/expired-action-code':    'El enlace ha expirado. Vuelve a pedir uno.',
};

function authErrorMessage(code) {
  return AUTH_ERROR_MAP[code] || `Error desconocido (${code}). Mira la consola.`;
}

// requireAuth: guard para acciones que tocan RTDB.
// Antes de endurecer las RTDB rules (commit 2, auth != null) las
// acciones funcionaban sin auth; tras endurecerlas, addItem y
// validarComprados fallarían con PERMISSION_DENIED si el usuario
// no está logueado. Esta función centraliza la verificación y
// deja un log claro de quién intentó qué sin sesión.
function requireAuth(label = 'acción') {
  if (!auth || !auth.currentUser) {
    warn('[auth] acción bloqueada (sin user):', label);
    return false;
  }
  return true;
}

function showAuthView(state, opts = {}) {
  if (!authModalEl || !authFormEl) return;
  log('[auth] showAuthView', state, opts);
  authFormEl.classList.remove('hidden');
  if (authErrorEl)   { authErrorEl.classList.add('hidden');   authErrorEl.textContent = ''; }
  if (authMessageEl) authMessageEl.classList.add('hidden');
  if (authCancelBtnEl) authCancelBtnEl.classList.add('hidden');

  switch (state) {
    case 'form':
      if (authEmailEl) {
        authEmailEl.value = opts.email || '';
        authEmailEl.focus();
      }
      break;
    case 'sent':
      authFormEl.classList.add('hidden');
      if (authCancelBtnEl) authCancelBtnEl.classList.remove('hidden');
      if (authMessageEl) {
        authMessageEl.classList.remove('hidden');
        authMessageEl.textContent = `Hemos enviado un enlace a ${opts.email}. Ábrelo desde este dispositivo para entrar.`;
      }
      break;
    case 'completing':
      authFormEl.classList.add('hidden');
      if (authMessageEl) {
        authMessageEl.classList.remove('hidden');
        authMessageEl.textContent = 'Completando acceso...';
      }
      break;
  }
  authModalEl.classList.remove('hidden');
}

function hideAuthModal() {
  if (!authModalEl) return;
  authModalEl.classList.add('hidden');
  log('[auth] modal oculto');
}

function showAppContent() {
  if (appContentEl) { appContentEl.classList.remove('hidden'); appContentEl.style.display = ''; }
  if (userInfoEl)    userInfoEl.classList.remove('hidden');
  log('[auth] appContent + user-info visibles');
}

function hideAppContent() {
  if (appContentEl) { appContentEl.classList.add('hidden'); appContentEl.style.display = 'none'; }
  if (userInfoEl)    userInfoEl.classList.add('hidden');
  log('[auth] appContent + user-info ocultos');
}

function showAuthError(message) {
  if (!authErrorEl) {
    logerr('[auth] no se puede mostrar error visible, #auth-error falta', message);
    return;
  }
  authErrorEl.textContent = message;
  authErrorEl.classList.remove('hidden');
}

function readStoredEmail() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_EMAIL);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email || !parsed.ts) return null;
    if (Date.now() - parsed.ts > AUTH_MAX_AGE_MS) {
      warn('[auth] email persistido expirado (>24h), descartando');
      return null;
    }
    return parsed.email;
  } catch (_err) {
    return null;
  }
}

function persistEmail(email) {
  try {
    localStorage.setItem(AUTH_STORAGE_EMAIL,
      JSON.stringify({ email, ts: Date.now() }));
  } catch (_err) { /* ignore quota / privacy mode */ }
}

function clearStoredEmail() {
  try { localStorage.removeItem(AUTH_STORAGE_EMAIL); } catch (_err) {}
}

async function sendSignInLink(email) {
  log('[auth] sendSignInLink', email);
  if (authSendBtnEl) authSendBtnEl.disabled = true;
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings());
    persistEmail(email);
    showAuthView('sent', { email });
  } catch (err) {
    logerr('[auth] sendSignInLink ERROR', err);
    showAuthError(authErrorMessage(err && err.code));
    showAuthView('form', { email });
  } finally {
    if (authSendBtnEl) authSendBtnEl.disabled = false;
  }
}

async function completeSignInFromLink() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return false;
  log('[auth] completeSignInFromLink (venimos del email)');
  showAuthView('completing');
  let email = readStoredEmail();
  if (!email) {
    // Email enviado desde otro dispositivo o tras limpiar localStorage.
    email = window.prompt('Confirma tu email para completar el inicio de sesión:');
    if (!email) {
      showAuthError('Necesitamos tu email para completar el acceso.');
      showAuthView('form');
      return false;
    }
  }
  try {
    await signInWithEmailLink(auth, email, window.location.href);
    log('[auth] signInWithEmailLink OK', email);
    clearStoredEmail();
    return true;  // onAuthStateChanged tomará el relevo.
  } catch (err) {
    logerr('[auth] signInInWithEmailLink ERROR', err);
    showAuthError(authErrorMessage(err && err.code));
    showAuthView('form', { email });
    return false;
  }
}

async function handleLogout() {
  log('[auth] handleLogout click');
  try {
    await signOut(auth);
    log('[auth] signOut OK');
    clearStoredEmail();
    // onAuthStateChanged disparará con user=null y mostrará el modal.
  } catch (err) {
    logerr('[auth] signOut ERROR', err);
    showAuthError('No pudimos cerrar sesión. Inténtalo de nuevo.');
  }
}

// Submit del form de email.
if (authFormEl && authEmailEl) {
  authFormEl.addEventListener('submit', e => {
    e.preventDefault();
    const raw = authEmailEl.value.trim();
    log('[auth] submit', raw);
    if (!raw) { showAuthError('Introduce un email.'); return; }
    // Regex pragmático (no RFC 5322 estricto). Suficiente para UX; el
    // server de Firebase rechazará con auth/invalid-email si está mal.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      showAuthError('Formato de email no válido.');
      return;
    }
    sendSignInLink(raw);
  });
} else {
  warn('[auth] #auth-form o #auth-email faltan — el login no funcionará');
}

// Botón Cancelar del estado 'sent'.
if (authCancelBtnEl) {
  authCancelBtnEl.addEventListener('click', () => {
    log('[auth] cancelar envio -> volver a form');
    clearStoredEmail();
    showAuthView('form');
  });
}

// Logout desde cabecera.
if (logoutBtnEl) {
  logoutBtnEl.addEventListener('click', handleLogout);
} else {
  warn('[auth] #logout-btn no encontrado — el usuario no podrá cerrar sesión desde la cabecera');
}

// Auth state observer: fuente de verdad de la UI.
onAuthStateChanged(auth, async user => {
  if (user) {
    log('[auth] signed-in uid=', user.uid, 'email=', user.email);
    hideAuthModal();
    if (userEmailEl) userEmailEl.textContent = user.email || user.uid;
    showAppContent();
    subscribeItems();
  } else {
    log('[auth] signed-out (o nunca llegado)');
    unsubscribeItems();
    if (userEmailEl) userEmailEl.textContent = '';
    hideAppContent();
    // Antes de mostrar el form, mira si el navegador viene del
    // email (caso típico de continuar el login desde el link).
    const completed = await completeSignInFromLink();
    if (!completed) showAuthView('form');
  }
});

// ============================================================
// Base de datos isolada para testing
// Bloque ejecutado ANTES del subscribeItems() para que el emulador
// tome el control de RTDB antes de cualquier operacion. Auth emulator
// también se conecta aquí (puerto 9099, separado del 9000 de RTDB):
// Ver dev-isolation.txt.
// ============================================================
if (window.location.search.includes('env=emul')) {
  try {
    connectDatabaseEmulator(db,   'localhost', 9000);
    connectAuthEmulator   (auth, 'localhost', 9099);
    log('[firebase] usando EMULADOR local (RTDB:9000 + Auth:9099)');
    warn('[firebase] Auth emulador NO envía emails reales — el link aparece en los logs del emulador');
  } catch (err) {
    logerr('[firebase] connect emulador ERROR', err);
  }
}

// ============================================================
// Items: subscribe/unsubscribe gateado por el auth state observer
// Mientras el usuario no esté autenticado, NO se suscribe a RTDB
// (las reglas endurecidas `auth != null` rechazan reads;
// centralizar el control aquí evita errores PERMISSION_DENIED
// ruidosos). Ambos helpers son idempotentes.
// ============================================================
let unsubItems = null;
function subscribeItems() {
  if (unsubItems) return;
  log('[firebase] subscribe /items');
  unsubItems = onValue(ref(db, 'items'),
    renderLista,
    err => logerr('[firebase] onValue ERROR', err)
  );
}
function unsubscribeItems() {
  if (!unsubItems) return;
  unsubItems();
  unsubItems = null;
  log('[firebase] unsubscribe /items');
}

// ============================================================
// Eventos UI
// ============================================================
addBtn    .addEventListener('click',  addItem);
inputEl   .addEventListener('keypress', e => { if (e.key === 'Enter') { log('[add] Enter'); addItem(); } });
validarBtn.addEventListener('click',  validarComprados);

// Cerrar popup al pulsar fuera del card
document.addEventListener('click', e => {
  if (!popupEl) return;
  if (popupEl.classList.contains('hidden')) return;
  if (!e.target.closest('.popup-content') && !e.target.closest('.popup-close')) {
    log('[popup] click fuera del card -> cerrar');
    popupEl.classList.add('hidden');
  }
});
// Escape: cerrar popup de notas, o actuar sobre auth-modal según estado.
// Auth-modal es bloqueante por diseño (David lo eligió fullscreen en
// la pregunta 1 del kickoff de Fase 1.A), así que Escape NO cierra el
// flow. En su lugar: 'form' → refocus del input email; 'sent' →
// dispara el botón Cancelar; 'completing' → no-op para no abortar
// una transacción Firebase en curso.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (popupEl && !popupEl.classList.contains('hidden')) {
    log('[popup] Escape -> cerrar');
    popupEl.classList.add('hidden');
  }
  if (authModalEl && !authModalEl.classList.contains('hidden')) {
    const formVisible   = authFormEl && !authFormEl.classList.contains('hidden');
    const cancelVisible = authCancelBtnEl && !authCancelBtnEl.classList.contains('hidden');
    if (formVisible && authEmailEl) {
      authEmailEl.focus();
      log('[auth] Escape -> focus email input');
    } else if (cancelVisible) {
      log('[auth] Escape -> cancelar envio (botón Cancelar)');
      authCancelBtnEl.click();
    } else {
      // 'completing' state: ignorar para no abortar el flujo Firebase.
      log('[auth] Escape ignorado en completing (mid-flujo)');
    }
  }
});

// Botón X del popup — antes era `onclick="cerrarPopup()"` inline en el HTML.
// Ahora conectado desde aquí para tener una única fuente de verdad (regla #03):
// cualquier lógica futura (focus restoration, animación de cierre…) se aplica
// sin sincronizar HTML y JS. Reentrada: ejecutar cerrarPopup con popup ya
// cerrado es idempotente (classList.add no se duplica, solo registra en log).
const popupCloseEl = document.getElementById('popup-close');
if (popupCloseEl) {
  popupCloseEl.addEventListener('click', () => {
    log('[popup] click X -> cerrarPopup');
    cerrarPopup();
  });
} else {
  warn('[popup] no se encontró #popup-close — el botón X no cerrará el popup');
}

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
