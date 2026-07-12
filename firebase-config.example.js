// ────────────────────────────────────────────────────────────────────────────
//  firebase-config.example.js — PLANTILLA con placeholders.
//
//  ¿Cómo crear tu configuración local con claves reales?
//
//    1. Copia este archivo a `firebase-config.local.js`:
//         cp firebase-config.example.js firebase-config.local.js
//
//    2. Sustituye los placeholders (<TUS_*>) por los valores reales
//       que encontrarás en la consola de Firebase:
//         https://console.firebase.google.com/project/<TU_PROJECT_ID>/settings/general
//
//    3. `firebase-config.local.js` está en `.gitignore` y NUNCA se sube
//       al repositorio. Es tu configuración segura.
// ────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey:            "<TU_API_KEY>",
  authDomain:        "<TU_PROJECT_ID>.firebaseapp.com",
  databaseURL:       "https://<TU_PROJECT_ID>-default-rtdb.<TU_REGION>.firebasedatabase.app",
  projectId:         "<TU_PROJECT_ID>",
  storageBucket:     "<TU_PROJECT_ID>.firebasestorage.app",
  messagingSenderId: "<TU_MESSAGING_SENDER_ID>",
  appId:             "<TU_APP_ID>",
  measurementId:     "<TU_MEASUREMENT_ID>"
};
