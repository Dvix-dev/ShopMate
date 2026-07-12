// ────────────────────────────────────────────────────────────────────────────
//  firebase-config.js — Loader de la configuración Firebase.
//
//  Estrategia:
//    1. Intenta cargar dinámicamente `firebase-config.local.js`     ← gitignored, contiene claves reales
//    2. Si falla (no existe), carga `firebase-config.example.js`   ← plantilla con placeholders
//    3. Exporta `firebaseConfig` ya resuelto como un objeto plano
//
//  `app.js` hace simplemente:
//      import { firebaseConfig } from "./firebase-config.js";
//      const app = initializeApp(firebaseConfig);
//
//  ⚠️ Este archivo NO contiene claves reales. Sólo el `.local.js` gitignored
//     contiene las claves. Subir este archivo al repo es seguro.
//
//  ⚠️ Requiere soporte de **top-level await** en módulos ES (Chrome 89+,
//     Firefox 89+, Safari 15+). Si necesitas compatibilidad con navegadores
//     muy antiguos, sustituye el TLA por una función async + variable
//     `firebaseConfigPromise` y consume la promesa desde `app.js`.
// ────────────────────────────────────────────────────────────────────────────

let local  = null;
let example = null;
try {
  local  = await import("./firebase-config.local.js");
} catch (_err) {
  // .local.js no existe o tiene errores — caer al fallback
  local = null;
}
example = await import("./firebase-config.example.js");

export const firebaseConfig = (local && local.firebaseConfig)
  ? local.firebaseConfig
  : example.firebaseConfig;
