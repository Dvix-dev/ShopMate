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
// ENV detection (?env=emul + protocolo HTTP)
// IS_EMULATOR: el user pidio modo emulador (via query string).
// emulatorConnected: ademas, pudimos conectar DE VERDAD al
// emulador local (protocolo HTTP, sin errores de connect).
// Solo cuando ambos son effectively true auto-sign-in funciona.
// En HTTPS (e.g. prod server con ?env=emul) IS_EMULATOR=true
// pero emulatorConnected=false -> la app cae al flow de login
// normal SIN tocar el emulador (que no funcionaria: connectAuthEmulator
// rechaza HTTPS con auth/invalid-emulator-scheme por seguridad).
// ============================================================
const IS_EMULATOR       = window.location.search.includes('env=emul');
let   emulatorConnected = false;
log('[env] IS_EMULATOR=', IS_EMULATOR, 'protocol=', window.location.protocol);

// ============================================================
// Firebase
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getDatabase, ref, onValue, push, update, remove, get, set, serverTimestamp, runTransaction, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  signOut, connectAuthEmulator,
  signInAnonymously, updateProfile,  // emulador: auto-sign-in "test" (sin contrasena)
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
const authEmailEl           = document.getElementById('auth-email');
const authPasswordEl        = document.getElementById('auth-password');
const authPasswordConfirmEl = document.getElementById('auth-password-confirm');
const authPasswordToggleEl  = document.getElementById('auth-password-toggle');
const authModeToggleEl      = document.getElementById('auth-mode-toggle');
const authForgotPasswordEl  = document.getElementById('auth-forgot-password');
const authResetSentEl       = document.getElementById('auth-reset-sent');
const authResetEmailEl      = document.getElementById('auth-reset-email');
const authResetBackEl       = document.getElementById('auth-reset-back');
const authHelpEl            = document.getElementById('auth-help');
const authSendBtnEl         = document.getElementById('auth-send');
const authErrorEl           = document.getElementById('auth-error');
const authMessageEl         = document.getElementById('auth-message');
// El email del usuario se muestra solo en el drawer (sección Perfil).
// El header ya no muestra "Identificado como" (commit header-cleanup).
// El boton logout del header ya no existe (commit refactor). El drawer
// lateral lo reemplaza. La referencia legacy se ignora si el nodo
// no esta presente en el DOM (defensa para tests de regresion).
const logoutBtnEl     = document.getElementById('logout-btn');
// Drawer / hamburger / history
const hamburgerBtnEl     = document.getElementById('hamburger-btn');
const hamburgerMenuEl    = document.getElementById('hamburger-menu');
const hamburgerBackdropEl = document.getElementById('hamburger-backdrop');
const hamburgerCloseBtnEl = document.getElementById('hamburger-close-btn');
const menuProfileEmailEl = document.getElementById('menu-profile-email');
const menuLogoutBtnEl    = document.getElementById('menu-logout-btn');
const historyListEl      = document.getElementById('history-list');
const historyEmptyEl     = document.getElementById('history-empty');
log('[dom] refs OK', {
  checklistEl: !!checklistEl,
  inputEl: !!inputEl,
  addBtn: !!addBtn,
  validarBtn: !!validarBtn,
  hamburgerBtnEl: !!hamburgerBtnEl,
  hamburgerMenuEl: !!hamburgerMenuEl,
  hamburgerCloseBtnEl: !!hamburgerCloseBtnEl,
  historyListEl: !!historyListEl,
});

// ============================================================
// Cap blando por colección
// items: 500 (defensa-en-profundidad UX).
// compras: 20 (limite auto-trim para ahorrar almacenamiento).
// items por compra: 100 (defensa-en-profundidad UX contra un
//   usuario que valide 1000+ items en una sola compra).
// Todos enforzados client-side porque el motor de reglas RTDB
// **no soporta** `newData.numChildren()` (confirmado en deploy
// prod 2026-07-13: error "No such method/property 'numChildren'").
// La validación de esquema (nombre, comprado, nota, fecha) sigue
// endurecida en database.rules.json (server-side).
// ============================================================
const MAX_ITEMS            = 500;
const MAX_COMPRAS          = 20;
const MAX_ITEMS_PER_COMPRA = 100;
let currentItemCount = 0;
log('[cap] MAX_ITEMS', MAX_ITEMS, 'MAX_COMPRAS', MAX_COMPRAS);

// ============================================================
// Renderizado de la lista activa
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
// Anadir item
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

// ============================================================
// Validar compra: archiva los items marcados en /shared/compras/
// y luego los elimina de /items/. El archivado es atomico (un solo
// set() con la compra completa). El trim a 20 lo dispara el listener
// de /shared/compras/ al detectar size > MAX_COMPRAS.
// ============================================================
async function validarComprados() {
  if (!requireAuth('validarComprados')) return;
  log('[validator] click');
  try {
    // 1. Lee los items marcados (snapshot inicial, no transaccion todavia).
    const snapshot = await get(ref(db, 'items'));
    const toProcess = [];
    snapshot.forEach(childSnapshot => {
      const item = childSnapshot.val();
      if (item && item.comprado) {
        toProcess.push({ key: childSnapshot.key, item });
      }
    });
    log('[validator] items marcados', toProcess.length);
    if (toProcess.length === 0) return;
    // Cap blando: si intentas archivar mas de MAX_ITEMS_PER_COMPRA
    // items a la vez, aborta. No se puede enforzar server-side
    // porque el motor de reglas RTDB no soporta numChildren()
    // (deploy prod 2026-07-13 rechazo la regla). Defense-in-depth
    // UX: mejor avisar al usuario que spammear 1000 items en una
    // sola compra que revienten el nodo en RTDB. 100 items = compra
    // muy grande pero plausible (un super real rara vez pasa de 50);
    // el cap esta dimensionado contra abuso/spam, no contra uso normal.
    if (toProcess.length > MAX_ITEMS_PER_COMPRA) {
      logerr('[validator] cap MAX_ITEMS_PER_COMPRA excedido', { count: toProcess.length, cap: MAX_ITEMS_PER_COMPRA });
      return;
    }

    // 2. Para cada item, usa runTransaction para borrarlo atomicamente.
    //    Si la transaccion NO se committed (otro cliente ya borro/desmarco
    //    el item), ese item NO se archiva. Asi evitamos duplicar compras
    //    en paralelo (B1 fix: race condition en doble-archivo).
    const itemsToArchive = {};
    for (const { key, item } of toProcess) {
      try {
        const txResult = await runTransaction(ref(db, 'items/' + key), current => {
          // En RTDB v9+ SOLO `return undefined` aborta la transaccion (committed=false).
          // Retornar `current` (incluso si es null) cuenta como "no change" y
          // commitea con committed=true — que era justo el bug del B1 anterior.
          if (!current) return;            // abort: ya no existe
          if (!current.comprado) return;   // abort: alguien desmarcó
          return null;                     // commit: delete
        });
        if (txResult.committed) {
          const archived = { nombre: item.nombre };
          if (item.nota) archived.nota = item.nota;
          itemsToArchive[key] = archived;
        } else {
          log('[validator] tx no committed para', key, '- skip');
        }
      } catch (txErr) {
        logerr('[validator] runTransaction ERROR en', key, txErr);
      }
    }

    if (Object.keys(itemsToArchive).length === 0) {
      log('[validator] nada que archivar (todas las tx fallaron)');
      return;
    }

    // 3. Crea la compra con los items que SI se pudieron archivar.
    const newCompraRef = push(ref(db, 'shared/compras'));
    log('[validator] creando compra', newCompraRef.key, 'con', Object.keys(itemsToArchive).length, 'items');
    await set(newCompraRef, { fecha: serverTimestamp(), items: itemsToArchive });
    log('[validator] compra creada OK');
  } catch (err) { logerr('[validator] ERROR', err); }
}

// ============================================================
// trimCompras: si hay mas de MAX_COMPRAS, borra las mas antiguas.
// Las push keys de Firebase son time-ordered. Tomamos las primeras
// `excess` del snapshot (las mas antiguas) y las eliminamos via
// update con `null` (delete en RTDB multi-path).
// ============================================================
async function trimCompras() {
  try {
    const snapshot = await get(ref(db, 'shared/compras'));
    const count = snapshot.size;
    if (count <= MAX_COMPRAS) { log('[trim] no trim'); return; }
    const excess = count - MAX_COMPRAS;
    const oldestKeys = [];
    let i = 0;
    snapshot.forEach(childSnapshot => {
      if (i < excess) oldestKeys.push(childSnapshot.key);
      i++;
    });
    log('[trim] eliminando los', excess, 'mas antiguos:', oldestKeys);
    const updates = {};
    oldestKeys.forEach(k => { updates['shared/compras/' + k] = null; });
    await update(ref(db), updates);
    log('[trim] OK');
  } catch (err) { logerr('[trim] ERROR', err); }
}

// ============================================================
// Render del historial (dentro del drawer)
// Cada compra es un <details class="history-item"> con:
//   - <summary>: fecha formateada + contador
//   - <div class="history-item-content">: lista de items
// Push keys son time-ordered. Invertimos para most recent-first.
// Si size > MAX_COMPRAS disparamos trimCompras().
//
// B2 fix: NO destruimos el DOM en cada onValue. Reconciliamos via
// `historyItemsMap` (key -> <details>) para preservar el estado
// open/closed de cada <details> cuando llega un update de otro cliente.
// ============================================================

// Mapa key -> <details> para reconciliar sin destruir el DOM.
const historyItemsMap = new Map();

// Crea un <details> nuevo para una compra. Usado cuando llega
// una compra que no esta en el Map.
function createHistoryItem(key, val) {
  const details = document.createElement('details');
  details.classList.add('history-item');
  details.dataset.compraKey = key;
  const summary = document.createElement('summary');
  const meta = document.createElement('span');
  meta.classList.add('history-item-meta');
  const date = document.createElement('span');
  date.classList.add('history-item-date');
  date.textContent = formatCompraDate(val && val.fecha);
  const count = document.createElement('span');
  count.classList.add('history-item-count');
  const itemCount = (val && val.items) ? Object.keys(val.items).length : 0;
  count.textContent = itemCount + ' producto' + (itemCount !== 1 ? 's' : '');
  meta.appendChild(date);
  meta.appendChild(count);
  summary.appendChild(meta);
  details.appendChild(summary);
  if (val && val.items) {
    const content = document.createElement('div');
    content.classList.add('history-item-content');
    Object.values(val.items).forEach(item => {
      if (!item || !item.nombre) return;
      const product = document.createElement('div');
      product.classList.add('history-product');
      const name = document.createElement('span');
      name.classList.add('history-product-name');
      name.textContent = item.nombre;
      product.appendChild(name);
      if (item.nota) {
        const note = document.createElement('span');
        note.classList.add('history-product-note');
        note.textContent = '— ' + item.nota;
        product.appendChild(note);
      }
      content.appendChild(product);
    });
    details.appendChild(content);
  }
  return details;
}

// Actualiza el contenido (summary + content) de un <details> existente
// sin destruirlo, preservando su estado open/closed.
function updateHistoryItemContent(el, val) {
  const dateEl = el.querySelector('.history-item-date');
  if (dateEl) dateEl.textContent = formatCompraDate(val && val.fecha);
  const countEl = el.querySelector('.history-item-count');
  if (countEl) {
    const itemCount = (val && val.items) ? Object.keys(val.items).length : 0;
    countEl.textContent = itemCount + ' producto' + (itemCount !== 1 ? 's' : '');
  }
  let content = el.querySelector('.history-item-content');
  if (val && val.items) {
    if (!content) {
      content = document.createElement('div');
      content.classList.add('history-item-content');
      el.appendChild(content);
    }
    content.innerHTML = '';
    Object.values(val.items).forEach(item => {
      if (!item || !item.nombre) return;
      const product = document.createElement('div');
      product.classList.add('history-product');
      const name = document.createElement('span');
      name.classList.add('history-product-name');
      name.textContent = item.nombre;
      product.appendChild(name);
      if (item.nota) {
        const note = document.createElement('span');
        note.classList.add('history-product-note');
        note.textContent = '— ' + item.nota;
        product.appendChild(note);
      }
      content.appendChild(product);
    });
  } else if (content) {
    content.remove();
  }
}

function renderHistory(snapshot) {
  log('[history] render', snapshot.size);
  if (!historyListEl) return;

  if (snapshot.size === 0) {
    if (historyEmptyEl) historyEmptyEl.classList.remove('hidden');
    historyItemsMap.forEach(el => el.remove());
    historyItemsMap.clear();
    return;
  }
  if (historyEmptyEl) historyEmptyEl.classList.add('hidden');

  const compras = [];
  snapshot.forEach(childSnapshot => {
    compras.push({ key: childSnapshot.key, val: childSnapshot.val() });
  });
  compras.reverse();

  const newKeys = new Set(compras.map(c => c.key));

  // Elimina compras que ya no estan (e.g. tras trim).
  for (const [key, el] of historyItemsMap) {
    if (!newKeys.has(key)) {
      el.remove();
      historyItemsMap.delete(key);
    }
  }

  // Upsert en orden desc. appendChild mueve el nodo al final,
  // asi garantizamos el orden de visualizacion sin recrear nodos.
  compras.forEach(({ key, val }) => {
    let el = historyItemsMap.get(key);
    if (!el) {
      el = createHistoryItem(key, val);
      historyItemsMap.set(key, el);
    } else {
      updateHistoryItemContent(el, val);
    }
    historyListEl.appendChild(el);
  });

  if (snapshot.size > MAX_COMPRAS) {
    log('[history] size > MAX_COMPRAS -> trim');
    trimCompras();
  }
}

function formatCompraDate(ms) {
  if (!ms || typeof ms !== 'number' || ms < 1000000000000) return 'Fecha desconocida';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(ms));
  } catch (_e) { return new Date(ms).toLocaleString(); }
}

// ============================================================
// Popup de notas
// ============================================================
function mostrarNotaPopup(nombre, nota) {
  log('[popup] mostrarNotaPopup', { nombre, nota });
  const tituloEl  = document.getElementById('popup-titulo');
  const notaTxtEl = document.getElementById('popup-nota');
  if (!popupEl) { logerr('[popup] #nota-popup no existe en el DOM'); return; }
  if (!tituloEl || !notaTxtEl) { logerr('[popup] faltan nodos internos'); return; }
  tituloEl.textContent = nombre;
  notaTxtEl.textContent = nota;
  setTimeout(() => { popupEl.classList.remove('hidden'); log('[popup] shown'); }, 0);
}
function cerrarPopup() {
  log('[popup] cerrarPopup');
  if (!popupEl) { logerr('[popup] #nota-popup no existe al cerrar'); return; }
  popupEl.classList.add('hidden');
  log('[popup] hidden');
}

// ============================================================
// Hamburger / drawer
// ============================================================
function openHamburger() {
  if (!hamburgerMenuEl || !hamburgerBackdropEl || !hamburgerBtnEl) return;
  hamburgerMenuEl.classList.remove('hidden');
  hamburgerBackdropEl.classList.remove('hidden');
  hamburgerBtnEl.setAttribute('aria-expanded', 'true');
  log('[hamburger] open');
  // N1 a11y: foco al close button al abrir. Defer al siguiente tick
  // para que el elemento sea tabbable (display: block tras quitar .hidden).
  setTimeout(() => {
    if (hamburgerCloseBtnEl) { hamburgerCloseBtnEl.focus({ preventScroll: true }); return; }
    // Fallback: primer focusable del drawer.
    const first = hamburgerMenuEl.querySelector(FOCUSABLE_SELECTOR);
    if (first) first.focus({ preventScroll: true });
  }, 0);
}
function closeHamburger() {
  if (!hamburgerMenuEl || !hamburgerBackdropEl || !hamburgerBtnEl) return;
  const wasOpen = !hamburgerMenuEl.classList.contains('hidden');
  hamburgerMenuEl.classList.add('hidden');
  hamburgerBackdropEl.classList.add('hidden');
  hamburgerBtnEl.setAttribute('aria-expanded', 'false');
  log('[hamburger] close');
  // N1 a11y: devolver foco al trigger del ☰ SOLO si el drawer
  // estaba abierto (no en cierres redundantes o durante logout flow,
  // donde el modal de auth tomara el foco inmediatamente).
  if (wasOpen) { hamburgerBtnEl.focus({ preventScroll: true }); }
}
function toggleHamburger() {
  if (!hamburgerMenuEl) return;
  if (hamburgerMenuEl.classList.contains('hidden')) openHamburger();
  else closeHamburger();
}

// ============================================================
// Auth (Fase 1.A.v2) — migrado de passwordless (email-link) a
// email + password. Motivo: la cuota Spark de Firebase Auth
// (5 emails/día para sendSignInLinkToEmail) se quedaba corta
// para el volumen de la familia. Con email/password los
// SIGN-INS no consumen quota; los sign-ups pueden enviar email
// de verificación, pero aquí NO lo enviamos (skip explícito).
// ----------------------------------------------------
// Decisiones de seguridad (apply here, NOT en cliente hashing):
//   1) Passwords NUNCA se hashean en cliente. Firebase Auth los
//      hashea server-side con scrypt + salt + pepper (auditado).
//   2) Longitud mínima 8 chars enforced client-side + minlength=8
//      en HTML5 (defense-in-depth).
//   3) Anti-enumeración sign-IN: 'invalid-credential' colapsa
//      user-no-existe + password-incorrecta en Firebase v9+.
//   4) Anti-enumeración sign-UP: mensaje neutro para
//      'email-already-in-use' (sin confirmar si el email existe).
//   5) Inputs password se limpian (value='') tras submit OK y
//      error, para no dejar contraseña en claro en el DOM.
//   6) Submit se deshabilita durante la promesa Firebase para
//      evitar doble-click → dos cuentas duplicadas.
//   7) Show/hide password toggle es opt-in (👁/🙈), aria-pressed.
//   8) RTDB rules NO cambian: siguen bloqueando con auth != null.
// David DEBE hacer 1 click en Firebase Console para activarlo:
//   Build > Authentication > Sign-in method > Email/Password
//   (toggle verde). El toggle de Email-link (passwordless) puede
//   quedar ACTIVO temporalmente para cuentas legacy (ya no se
//   usa desde código; recomendable desactivarlo tras migración).
// ============================================================

let currentAuthMode = 'signin'; // 'signin' | 'signup' | 'reset'
const VALID_EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;
const AUTH_ERROR_MAP = {
  // Inputs no realizados
  'auth/invalid-email':          'Email no válido. Revísalo e inténtalo de nuevo.',
  'auth/missing-email':          'Introduce tu email.',

  // Sign-in. 'invalid-credential' es el umbrella que Firebase v9+ usa
  // para colapsar 'user-not-found' + 'wrong-password' (anti-enumeración
  // server-side). 'invalid-password' queda como fallback histórico.
  'auth/invalid-credential':     'Email o contraseña incorrectos.',
  'auth/invalid-password':       'Contraseña incorrecta.',
  'auth/user-disabled':          'Esta cuenta está deshabilitada. Contacta con David (admin del proyecto).',

  // Sign-up
  'auth/email-already-in-use':   'No pudimos crear la cuenta con ese email. Si ya tienes cuenta, usa el enlace inferior para iniciar sesión.',
  'auth/weak-password':          'La contraseña es demasiado débil. Usa al menos 8 caracteres y mezcla mayúsculas, minúsculas y números.',

  // Rate limit (Firebase server-side throttling)
  'auth/too-many-requests':      'Demasiados intentos desde este dispositivo. Espera unos minutos e inténtalo de nuevo.',

  // Red
  'auth/network-request-failed': 'Error de red. Comprueba tu conexión.',

  // Configuración (David debe arreglar)
  'auth/operation-not-allowed':  'Config: el provider Email/Password no está habilitado en Firebase Console (Build > Authentication > Sign-in method > Email/Password).',
  'auth/invalid-api-key':        'Config: la apiKey de Firebase no es válida. Revisa firebase-config.local.js.',
  'auth/app-deleted':            'Config: el proyecto Firebase fue eliminado o está en mal estado.',

  // Cuota (no aplicaría a sign-in/sign-up aquí, pero mapeamos por si
  // David activa email verification en el futuro o re-añade passwordless)
  'auth/quota-exceeded':         'Cuota diaria de Firebase Auth agotada. Considera upgrade a Blaze (pay-as-you-go) o espera a medianoche hora del Pacífico.',
};
function authErrorMessage(code) {
  return AUTH_ERROR_MAP[code] || ('Error desconocido (' + (code || 'sin-codigo') + ').');
}
function requireAuth(label) {
  if (!auth || !auth.currentUser) { warn('[auth] accion bloqueada (sin user):', label); return false; }
  return true;
}
// ============================================================
// emulatorSignInTest: signInAnonymously + updateProfile='test'.
// Solo se usa en emulador (?env=emul). En prod NUNCA se llama.
// Semantica:
//   - user es null cuando se entra aqui (lo garantiza el caller
//     onAuthStateChanged). Si ya hay sesion persistida en el
//     emulador (--export-on-exit), este path no corre.
//   - No pide contrasena: signInAnonymously crea una cuenta
//     anonima temporal en el emulador Auth.
//   - Idempotente respecto a displayName: solo lo setea si esta
//     vacio, para no pisar el nombre en sesiones persistidas.
// ============================================================
async function emulatorSignInTest() {
  try {
    const cred = await signInAnonymously(auth);
    if (cred && cred.user && !cred.user.displayName) {
      await updateProfile(cred.user, { displayName: 'test' });
    }
    log('[emul] auto-sign-in OK (displayName=test, uid=' + (cred && cred.user && cred.user.uid) + ')');
    return true;
  } catch (err) {
    logerr('[emul] auto-sign-in ERROR', err && err.code, err && err.message);
    return false;
  }
}
function showAuthView(state, opts) {
  if (!authModalEl || !authFormEl) return;
  log('[auth] showAuthView', { state, opts });

  // Limpiar mensajes residuales al cambiar de estado; el reset-sent block se oculta
  // siempre y se re-muestra solo cuando entremos a 'reset-sent'.
  if (authErrorEl)   { authErrorEl.classList.add('hidden');   authErrorEl.textContent = ''; }
  if (authMessageEl) authMessageEl.classList.add('hidden');
  if (authResetSentEl) authResetSentEl.classList.add('hidden');

  if (state === 'form-signin' || state === 'form-signup' || state === 'form-reset') {
    // Reset mode -> el form se muestra pero password fields se ocultan via CSS por data-mode.
    currentAuthMode = (state === 'form-signup') ? 'signup'
                    : (state === 'form-reset') ? 'reset'
                    : 'signin';
    authFormEl.dataset.mode = currentAuthMode;
    if (authHelpEl) {
      const ds = authHelpEl.dataset;
      if (currentAuthMode === 'reset')      authHelpEl.textContent = ds.textReset  || authHelpEl.textContent;
      else if (currentAuthMode === 'signup') authHelpEl.textContent = ds.textSignup || authHelpEl.textContent;
      else                                   authHelpEl.textContent = ds.textSignin || authHelpEl.textContent;
    }
    if (authSendBtnEl) {
      authSendBtnEl.textContent = (currentAuthMode === 'reset') ? 'Enviar enlace de recuperación'
                                 : (currentAuthMode === 'signup') ? 'Crear cuenta'
                                 : 'Iniciar sesión';
    }
    if (authModeToggleEl) {
      // En signin mode el toggle primario va a signup; en reset/signup va a signin.
      authModeToggleEl.textContent = (currentAuthMode === 'signin')
        ? '¿No tienes cuenta? Regístrate'
        : '¿Ya tienes cuenta? Inicia sesión';
    }
    authFormEl.classList.remove('hidden');
    if (authEmailEl) { authEmailEl.value = (opts && opts.email) || ''; authEmailEl.focus(); }
    // Limpieza defensiva de passwords al mostrar el modal / cambiar modo.
    if (authPasswordEl)        authPasswordEl.value = '';
    if (authPasswordConfirmEl) authPasswordConfirmEl.value = '';
    // Si la contraseña estaba visible (tipo text), la forzamos a password.
    if (authPasswordEl && authPasswordEl.type !== 'password' && authPasswordToggleEl) {
      authPasswordEl.type = 'password';
      authPasswordToggleEl.setAttribute('aria-pressed', 'false');
      authPasswordToggleEl.setAttribute('aria-label', 'Mostrar contraseña');
      const iconSpan = authPasswordToggleEl.querySelector('.modal-password-toggle-icon');
      if (iconSpan) iconSpan.textContent = '👁';
    }
  } else if (state === 'completing') {
    // Spinner UX: ocultar form, mostrar message. 'completing' aplica a los 3 modos.
    authFormEl.classList.add('hidden');
    if (authMessageEl) {
      authMessageEl.classList.remove('hidden');
      authMessageEl.textContent = (currentAuthMode === 'reset') ? 'Enviando enlace…'
                                : (currentAuthMode === 'signup') ? 'Creando cuenta…'
                                : 'Iniciando sesión…';
    }
  } else if (state === 'reset-sent') {
    // reset-sent block reemplaza el form. Mostramos email + botón 'Volver a iniciar sesión'.
    authFormEl.classList.add('hidden');
    if (authResetSentEl) {
      authResetSentEl.classList.remove('hidden');
      if (authResetEmailEl && opts && opts.email) authResetEmailEl.textContent = opts.email;
      // Foco al back button para accesibilidad (a11y): user puede tabular al email después.
      if (authResetBackEl) authResetBackEl.focus({ preventScroll: true });
    }
    log('[auth] reset-sent: email=', opts && opts.email);
  }
  authModalEl.classList.remove('hidden');
}
function hideAuthModal() { if (authModalEl) authModalEl.classList.add('hidden'); }
function showAppContent() {
  if (appContentEl) { appContentEl.classList.remove('hidden'); appContentEl.style.display = ''; }
}
function hideAppContent() {
  if (appContentEl) { appContentEl.classList.add('hidden'); appContentEl.style.display = 'none'; }
}
function showAuthError(message) {
  if (!authErrorEl) { logerr('[auth] no #auth-error', message); return; }
  authErrorEl.textContent = message; authErrorEl.classList.remove('hidden');
}
// ============================================================
// submitAuth: handler del <form#auth-form>.
// Valida client-side (formato email, longitud mínima, coincidencia
// en signup) → llama Firebase → gestiona errores y feedback UX.
// Al fallar, limpia campos password (defense-in-depth contra DOM
// scraping) y re-muestra el form en el mismo modo para corregir.
// NO loggea la contraseña. NO revela si el email existe en sign-up.
// ============================================================
async function submitAuth(e) {
  if (e && e.preventDefault) e.preventDefault();
  // Dispatch por modo (signin|signup|reset). Reset salta la rama principal
  // porque no pide password — solo email + sendPasswordResetEmail.
  if (currentAuthMode === 'reset') {
    return submitPasswordReset();
  }
  if (!authEmailEl || !authPasswordEl) return;
  const email    = authEmailEl.value.trim();
  const password = authPasswordEl.value;

  if (!email) { showAuthError('Introduce tu email.'); authEmailEl.focus(); return; }
  if (!VALID_EMAIL_RE.test(email)) { showAuthError('Formato de email no válido.'); authEmailEl.focus(); return; }
  if (!password) { showAuthError('Introduce tu contraseña.'); authPasswordEl.focus(); return; }
  if (password.length < MIN_PASSWORD_LEN) {
    showAuthError('La contraseña debe tener al menos ' + MIN_PASSWORD_LEN + ' caracteres.');
    authPasswordEl.focus();
    return;
  }
  if (currentAuthMode === 'signup') {
    const confirmVal = (authPasswordConfirmEl && authPasswordConfirmEl.value) || '';
    if (!confirmVal) {
      showAuthError('Repite la contraseña.');
      if (authPasswordConfirmEl) authPasswordConfirmEl.focus();
      return;
    }
    if (password !== confirmVal) {
      showAuthError('Las contraseñas no coinciden.');
      if (authPasswordConfirmEl) authPasswordConfirmEl.focus();
      return;
    }
  }
  if (authSendBtnEl) authSendBtnEl.disabled = true;
  showAuthView('completing');
  try {
    if (currentAuthMode === 'signup') {
      log('[auth] createUserWithEmailAndPassword', email);
      await createUserWithEmailAndPassword(auth, email, password);
      log('[auth] signUp OK', email);
    } else {
      log('[auth] signInWithEmailAndPassword', email);
      await signInWithEmailAndPassword(auth, email, password);
      log('[auth] signIn OK', email);
    }
    // Defense-in-depth: clear passwords on success. El modal se cierra
    // via hideAuthModal() pero los value siguen en el DOM hasta el
    // siguiente showAuthView o handleLogout. Una extension maliciosa o
    // un screen-sharing prolongado podrian leerlos.
    if (authPasswordEl)        authPasswordEl.value = '';
    if (authPasswordConfirmEl) authPasswordConfirmEl.value = '';
    // OK: onAuthStateChanged re-disparará con user y cerrará el modal via hideAuthModal().
  } catch (err) {
    logerr('[auth] submitAuth ERROR', err && err.code);
    showAuthError(authErrorMessage(err && err.code));
    // Re-mostrar el form en el mismo modo para corrección
    showAuthView(currentAuthMode === 'signup' ? 'form-signup' : 'form-signin', { email });
    // Defense-in-depth: clear passwords. Si el user mete la contraseña
    // mal y mira el inspector, no querés que la vea persistente.
    if (authPasswordEl)        authPasswordEl.value = '';
    if (authPasswordConfirmEl) authPasswordConfirmEl.value = '';
  } finally {
    if (authSendBtnEl) authSendBtnEl.disabled = false;
  }
}
// ============================================================
// toggleAuthMode: cambia entre Sign in y Sign up (en reset mode
// vuelve a signin), conservando el email introducido. Limpia passwords
// para no revelarlas entre modos.
// ============================================================
function toggleAuthMode() {
  if (!authFormEl || !authEmailEl) return;
  let newMode;
  if (currentAuthMode === 'signin')      newMode = 'signup';
  else if (currentAuthMode === 'signup') newMode = 'signin';
  else /* reset */                       newMode = 'signin';
  log('[auth] toggleAuthMode', { from: currentAuthMode, to: newMode });
  showAuthView(newMode === 'signup' ? 'form-signup' : 'form-signin', { email: authEmailEl.value });
}
// ============================================================
// enterResetMode: salta al state 'form-reset' desde signin mode.
// Click viene del botón "¿Olvidaste tu contraseña?".
// ============================================================
function enterResetMode() {
  if (!authEmailEl) return;
  log('[auth] enterResetMode from', currentAuthMode);
  showAuthView('form-reset', { email: authEmailEl.value });
}
// ============================================================
// backFromResetSent: vuelve al state 'form-signin' desde el bloque
// reset-sent. Click viene del botón "Volver a iniciar sesión".
// ============================================================
function backFromResetSent() {
  log('[auth] backFromResetSent');
  showAuthView('form-signin');
}
// ============================================================
// submitPasswordReset: handler del <form#auth-form> en reset mode.
// Solo valida email (formato) y llama sendPasswordResetEmail.
// En Firebase v9+ la API ya NO lanza auth/user-not-found para emails
// desconocidos (responde exito silencioso para anti-enumeración),
// por lo que llegamos casi siempre al bloque 'reset-sent'.
// Errores que si pueden salir: invalid-email, missing-email,
// network-request-failed, too-many-requests, quota-exceeded y los de
// configuracion (operation-not-allowed, invalid-api-key).
// ============================================================
async function submitPasswordReset() {
  if (!authEmailEl) return;
  const email = authEmailEl.value.trim();
  if (!email) { showAuthError('Introduce tu email.'); authEmailEl.focus(); return; }
  if (!VALID_EMAIL_RE.test(email)) {
    showAuthError('Formato de email no válido.');
    authEmailEl.focus();
    return;
  }
  if (authSendBtnEl) authSendBtnEl.disabled = true;
  showAuthView('completing');
  try {
    log('[auth] sendPasswordResetEmail', email);
    await sendPasswordResetEmail(auth, email);
    log('[auth] passwordResetEmail OK', email);
    // Anti-enumeración: Firebase v9+ devuelve exito aunque el email no exista.
    // Mostramos reset-sent para ambos casos (existe o no). Buena práctica de
    // privacidad: NO revelar si el email está registrado.
    showAuthView('reset-sent', { email });
  } catch (err) {
    logerr('[auth] passwordResetEmail ERROR', err && err.code);
    showAuthError(authErrorMessage(err && err.code));
    showAuthView('form-reset', { email });
  } finally {
    if (authSendBtnEl) authSendBtnEl.disabled = false;
  }
}
// ============================================================
// togglePasswordVisibility: muestra / oculta el campo password.
// Default masked (type=password). Click cambia a text y al revés.
// aria-pressed accesible, sin riesgo de leakage a screen readers.
// ============================================================
function togglePasswordVisibility() {
  if (!authPasswordEl || !authPasswordToggleEl) return;
  const isShown = authPasswordEl.type === 'text';
  if (isShown) {
    authPasswordEl.type = 'password';
    authPasswordToggleEl.setAttribute('aria-pressed', 'false');
    authPasswordToggleEl.setAttribute('aria-label', 'Mostrar contraseña');
  } else {
    authPasswordEl.type = 'text';
    authPasswordToggleEl.setAttribute('aria-pressed', 'true');
    authPasswordToggleEl.setAttribute('aria-label', 'Ocultar contraseña');
  }
  // El icono ahora es SVG; el slash aparece via CSS [aria-pressed="true"].
  // (Antes swapeabamos emoji 👁/🙈 en un <span>. Ya no aplica.)
  authPasswordEl.focus();
}
async function handleLogout() {
  log('[auth] handleLogout click');
  closeHamburger();
  try {
    await signOut(auth);
    log('[auth] signOut OK');
    // (Antes clearStoredEmail() — ya no aplica: ya no usamos localStorage para email.)
    // Limpieza defensiva del DOM: si quedó algo en los campos, lo vaciamos.
    if (authPasswordEl)        authPasswordEl.value = '';
    if (authPasswordConfirmEl) authPasswordConfirmEl.value = '';
    // Safety net post-logout (mobile 2026-07-13): si Firebase Auth no
    // re-dispara onAuthStateChanged con user=null en 1.5s, forzamos
    // manualmente la auth modal.
    setTimeout(() => {
      if (authModalEl && authModalEl.classList.contains('hidden')) {
        logerr('[auth] onAuthStateChanged no disparo tras signOut, forzando auth modal');
        showAuthView('form-signin');
      }
    }, 1500);
  }
  catch (err) { logerr('[auth] signOut ERROR', err); showAuthError('No pudimos cerrar sesión.'); }
}
if (authFormEl && authEmailEl) {
  // Antes: authPasswordEl también se requería para el dispatch (no es estrictamente
  // necesario en reset mode, pero el dispatch interno lo evita). Mantenemos el
  // requisito mínimo: form + email. submitAuth valida internamente.
  authFormEl.addEventListener('submit', submitAuth);
}
if (authModeToggleEl)     authModeToggleEl.addEventListener('click', toggleAuthMode);
if (authForgotPasswordEl) authForgotPasswordEl.addEventListener('click', enterResetMode);
if (authResetBackEl)      authResetBackEl.addEventListener('click', backFromResetSent);
if (authPasswordToggleEl && authPasswordEl) authPasswordToggleEl.addEventListener('click', togglePasswordVisibility);
if (logoutBtnEl)          logoutBtnEl.addEventListener('click', handleLogout);
if (menuLogoutBtnEl)      menuLogoutBtnEl.addEventListener('click', handleLogout);
onAuthStateChanged(auth, async user => {
  authStateResolved = true;
  clearTimeout(authFallbackTimer);
  // Try-catch global: si cualquier operacion dentro del callback falla
  // (e.g. isSignInWithEmailLink lanza, o un null reference), queremos
  // ASEGURARNOS de que la auth modal se muestra cuando el user es null.
  // Sin este try-catch, un error silencioso dejaba la app en un estado
  // roto: app visible, auth modal oculto, sin forma de hacer login.
  // (Bug reportado en mobile 2026-07-13.)
  try {
    if (user) {
      // En emulador: user es anonimo + displayName='test' (sin email).
      // En prod: user tiene email. Mostrar el nombre visible primero
      // (test), luego email como fallback, luego el UID como ultimo
      // recurso (en prod nunca llegamos aqui porque el user tiene email).
      log('[auth] signed-in', user.displayName || user.email || user.uid);
      hideAuthModal();
      if (menuProfileEmailEl) menuProfileEmailEl.textContent = user.displayName || user.email || user.uid;
      showAppContent();
      subscribeItems();
      subscribeCompras();
    } else {
      log('[auth] signed-out', { isEmulator: IS_EMULATOR, emulatorConnected });
      unsubscribeItems();
      unsubscribeCompras();
      if (menuProfileEmailEl) menuProfileEmailEl.textContent = '—';
      closeHamburger();
      hideAppContent();
      // En emulador REAL (HTTP, conectados de verdad): auto-sign-in como
      // "test" (anonimo + displayName=test) en lugar de mostrar la auth
      // modal. Asi la app entra directamente sin email-link ni contrasena.
      // Gateamos por emulatorConnected (NO IS_EMULATOR) para no intentar
      // signInAnonymously si estamos en HTTPS+?env=emul: ahi el SDK rechazo
      // connectAuthEmulator y signInAnonymously iria a prod (data leak
      // risk / quota prod). Mejor caer al auth modal.
      if (emulatorConnected) {
        const ok = await emulatorSignInTest();
        if (ok) return; // onAuthStateChanged re-disparara con user
      }
      // Email/password: el único punto de entrada es el modal en sign-in mode.
      showAuthView('form-signin');
    }
  } catch (err) {
    logerr('[auth] onAuthStateChanged ERROR', err);
    if (!user) showAuthView('form-signin');
  }
});

// ============================================================
// Emulador local (RTDB:9000 + Auth:9099)
// ============================================================
if (IS_EMULATOR) {
  // El emulador Auth requiere HTTP. Firebase SDK rechaza HTTPS con
  // auth/invalid-emulator-scheme (mixed-content safety). Si el user
  // abre ?env=emul en HTTPS (e.g. el server prod), NO conectamos al
  // emulador (que no funcionaria) y dejamos que la app caiga al flow
  // prod normal — no se rompe nada, solo aparece el auth modal con
  // un warning en consola explicando que necesita HTTP local.
  if (window.location.protocol !== 'http:') {
    warn('[firebase] ?env=emul ignorado: el emulador requiere HTTP (estas en ' + window.location.protocol + '). Sirve la app con `python -m http.server 8080` y abre http://localhost:8080/?env=emul en vez del server prod.');
  } else {
    try {
      // Firma RTDB: connectDatabaseEmulator(db, host, port). Host y port
      // son parametros separados, OK.
      // Firma Auth: connectAuthEmulator(auth, url). URL COMPLETA con
      // scheme 'http://' (o 'https://' si lo sirvieras por SSL local).
      // Pasar 'localhost' como segundo arg -> auth/invalid-emulator-scheme
      // (la regex interna /^https?:\/\//.test(url) del SDK falla). Esto es
      // independiente del HTTP-only check (item 16 contexto.md): ambos
      // tienen que cumplirse.
      connectDatabaseEmulator(db,   'localhost',   9000);
      connectAuthEmulator   (auth,  'http://localhost:9099');
      emulatorConnected = true;
      log('[firebase] usando EMULADOR local (RTDB:9000 + Auth:9099)');
      warn('[firebase] Auth emulador: auto-sign-in como "test" (anonimo, sin contrasena, sin email-link)');
    } catch (err) { logerr('[firebase] connect emulador ERROR', err); }
  }
}

// ============================================================
// Fallback safety net (mobile 2026-07-13)
// Si Firebase Auth no se inicializa en 5s (red lenta, browser
// issue en mobile, etc.), forzamos la auth modal para que el
// usuario no se quede sin login. Se cancela automaticamente
// cuando onAuthStateChanged dispara (callback mas abajo).
// Si el usuario esta signed-in (Firebase lee sesion persistida
// de IndexedDB), el callback dispara rapido, el timer se
// cancela y la modal NO se muestra (correcto).
// ============================================================
let authStateResolved = false;
const authFallbackTimer = setTimeout(() => {
  if (!authStateResolved) {
    // En emulador REAL el auto-sign-in es asincrono (signInAnonymously +
    // updateProfile) y puede tardar algo mas en arrancar (Firebase
    // Auth init). Si disparamos la auth modal aqui, rompemos el
    // flujo "entra directo". Dejamos que emulatorSignInTest()
    // resuelva el estado por si solo.
    // Gateamos por emulatorConnected (no IS_EMULATOR): si estamos en
    // HTTPS+?env=emul NO estamos conectados al emulador de verdad,
    // y lanzar la auth modal es lo correcto (cae al flow prod normal).
    if (emulatorConnected) {
      log('[emul] auth fallback 5s saltado (auto-sign-in asincrono en curso)');
      return;
    }
    logerr('[auth] onAuthStateChanged no disparo en 5s, forzando auth modal');
    showAuthView('form-signin');
  }
}, 5000);

// ============================================================
// Suscripciones RTDB gateadas por auth state
// ============================================================
let unsubItems = null;
function subscribeItems() {
  if (unsubItems) return;
  log('[firebase] subscribe /items');
  unsubItems = onValue(ref(db, 'items'), renderLista, err => {
    logerr('[firebase] onValue /items', err);
    // Root cause real del bug mobile (2026-07-13): si el token de
    // Auth expira o se revoca, Firebase nos devuelve PERMISSION_DENIED
    // en vez de re-disparar onAuthStateChanged con null (bug conocido
    // del Firebase Auth client en mobile). La app se queda zombie:
    // visible, sin datos, sin auth modal. Forzamos la auth modal
    // aqui para que el usuario pueda re-autenticarse.
    if (err && err.code === 'PERMISSION_DENIED') {
      logerr('[auth] onValue /items PERMISSION_DENIED, forzando auth modal');
      showAuthView('form-signin');
    }
  });
}
function unsubscribeItems() {
  if (!unsubItems) return;
  unsubItems(); unsubItems = null;
  log('[firebase] unsubscribe /items');
}
let unsubCompras = null;
function subscribeCompras() {
  if (unsubCompras) return;
  log('[firebase] subscribe /shared/compras');
  unsubCompras = onValue(ref(db, 'shared/compras'), renderHistory, err => {
    logerr('[firebase] onValue /shared/compras', err);
    if (err && err.code === 'PERMISSION_DENIED') {
      logerr('[auth] onValue /shared/compras PERMISSION_DENIED, forzando auth modal');
      showAuthView('form-signin');
    }
  });
}
function unsubscribeCompras() {
  if (!unsubCompras) return;
  unsubCompras(); unsubCompras = null;
  log('[firebase] unsubscribe /shared/compras');
}

// ============================================================
// Eventos UI
// ============================================================
addBtn    .addEventListener('click',  addItem);
inputEl   .addEventListener('keypress', e => { if (e.key === 'Enter') { log('[add] Enter'); addItem(); } });
validarBtn.addEventListener('click',  validarComprados);
if (hamburgerBtnEl)      hamburgerBtnEl    .addEventListener('click', toggleHamburger);
if (hamburgerBackdropEl) hamburgerBackdropEl.addEventListener('click', closeHamburger);
if (hamburgerCloseBtnEl)  hamburgerCloseBtnEl .addEventListener('click', closeHamburger);
document.addEventListener('click', e => {
  if (!popupEl) return;
  if (popupEl.classList.contains('hidden')) return;
  if (!e.target.closest('.popup-content') && !e.target.closest('.popup-close')) {
    log('[popup] click fuera del card -> cerrar');
    popupEl.classList.add('hidden');
  }
});
// N1 a11y: focus trap Tab/Shift+Tab dentro del drawer abierto.
// Si el foco esta fuera del drawer (click en backdrop, etc.) lo trae
// de vuelta al primer focusable. Si esta en el primero/ultimo con
// Shift/Tab, lo hace wrap-around al ultimo/primero respectivamente.
// El selector incluye <summary> para que el usuario de teclado pueda
// togglear el acordeon del historial con Enter/Space (Safari + spec).
const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && hamburgerMenuEl && !hamburgerMenuEl.classList.contains('hidden')) {
    const focusable = Array.from(hamburgerMenuEl.querySelectorAll(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const active = document.activeElement;
    const focusInDrawer = hamburgerMenuEl.contains(active);
    if (!focusInDrawer) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
    return;
  }

  if (e.key !== 'Escape') return;

  if (hamburgerMenuEl && !hamburgerMenuEl.classList.contains('hidden')) {
    log('[hamburger] Escape -> cerrar');
    closeHamburger();
    return;
  }
  if (popupEl && !popupEl.classList.contains('hidden')) {
    log('[popup] Escape -> cerrar');
    popupEl.classList.add('hidden');
    return;
  }
  if (authModalEl && !authModalEl.classList.contains('hidden')) {
    const formVisible = authFormEl && !authFormEl.classList.contains('hidden');
    if (formVisible && authEmailEl) {
      authEmailEl.focus();
      log('[auth] Escape -> focus email input');
    } else if (authResetSentEl && !authResetSentEl.classList.contains('hidden') && authResetBackEl) {
      // reset-sent state: foco al back button para keyboard a11y.
      authResetBackEl.focus();
      log('[auth] Escape -> focus reset-back button');
    } else {
      log('[auth] Escape ignorado en completing');
    }
  }
});
const popupCloseEl = document.getElementById('popup-close');
if (popupCloseEl) {
  popupCloseEl.addEventListener('click', () => { log('[popup] click X -> cerrarPopup'); cerrarPopup(); });
} else { warn('[popup] no se encontro #popup-close'); }

// ============================================================
// Helpers
// ============================================================
function procesarInput(input) {
  log('[processor] procesarInput', { input });
  const match = input.match(/^(.*?)\s*(?:\((.*)\))?$/);
  if (!match) return { nombre: '', nota: '' };
  const nombre = (match[1] || '').trim();
  const nota = (match[2] || '').trim();
  return { nombre, nota };
}
