# 🧠 Contexto rápido — ShopMate

> Archivo de **resumen ejecutivo** diseñado para que la IA (modelos de Codex, GPT, Claude, etc.) pueda cargar el contexto del proyecto en futuras sesiones con el menor número de tokens posible. Léeme antes de hacer cambios.

---

## 1. Identidad

| Atributo | Valor |
|---|---|
| Nombre | **ShopMate** |
| Tipo | Web app estática · Lista de compra compartida en tiempo real |
| Idioma | Español (`lang="es"`) |
| Autor | David Escutia de Haro |
| Repo | Git, rama `main`, **4 commits** |
| Despliegue | SFTP a `158.179.223.22` → `/var/www/html/shopmate` |
| Hosting | Servidor propio “Dvix Server” (Ubuntu, nginx/apache servido estático) |

---

## 2. Una sola frase

> ShopMate es una lista de la compra colaborativa en tiempo real, implementada en HTML+CSS+JS puro, sincronizada vía Firebase Realtime Database, sin frameworks ni build step.

---

## 3. Archivos clave

> El archivo HTML histórico se llamó `list.html` (commits `087a2fd`–`4f15c99`). Lo más práctico es restaurarlo como `list.html` y renombrarlo a `index.html` para despliegue directo en Nginx/Apache.

```
ShopMate/
├── app.js          # Lógica + Firebase
├── main.css        # Estilos (Poppins + Caveat)
├── list.html       # UI principal  ⚠️ vacío (renombrar a index.html al desplegar)
└── assets/
    ├── icon.ico    # Favicon  ⚠️ 0 bytes (incluido en 4f15c99)
    └── logo.png    # Logo cabecera  ⚠️ 0 bytes (incluido en 4f15c99)
```

> ⚠️ ALERTA: los archivos `app.js`, `list.html`/`index.html`, `main.css` y los assets están **vacíos (0 bytes)** en el directorio de trabajo por un commit de “limpieza” (`d4ecc06`). La versión funcional está en `4f15c99`. Antes de tocar nada, considerar restaurar con `git checkout 4f15c99 -- app.js main.css list.html`.

---

## 4. Stack

- **Frontend**: HTML5 + CSS3 + JavaScript (ES Modules, sin transpilar).
- **Persistencia**: Firebase Realtime Database — proyecto `shopmate-e9195`.
- **Auth**: Activa desde Fase 1.A.v2 — Firebase Authentication con **email + password** (Email/Password provider). Los passwords se hashean server-side con scrypt + salt + pepper; **nunca** se hashean en el cliente. Longitud mínima 8 chars enforced client-side + `minlength` HTML5. Migrada desde passwordless (email magic link) el 2026-07-14 porque la cuota Spark (5 emails/día para `sendSignInLinkToEmail`) era insuficiente: con email/password los SIGN-INS NO consumen quota. Reglas RTDB endurecidas con `auth != null` desplegadas a Firebase prod desde 2026-07-13 (`d5cec7d`); el emulador local (`?env=emul`) usa las mismas reglas. Ver `roadmap.md` → 1.A.
- **Build**: Ninguno en el código web (no hay `package.json` raíz, ni `node_modules` para bundlers). **Excepción planeada Fase 2.C:** subdir `android/` con Capacitor introduce build step aislado para empaquetar la webapp como APK instalable. Ver `roadmap.md` → 2.C.
- **Fuentes**: Google Fonts — `Poppins` (body) y `Caveat` (lista).
- **Despliegue**: extensión VS Code SFTP (.vscode/sftp.json), auto-upload al guardar.

---

## 5. Arquitectura funcional

```
┌─────────────────────────────────────┐
│       index.html (DOM estático)     │
│  · #checklist  (form contenedor)    │
│  · #item-input (input nuevo item)   │
│  · #add-btn    (botón Añadir)       │
│  · #validar-btn(Validar compra ✔)   │
└──────────────┬──────────────────────┘
               │  Eventos
               ▼
┌─────────────────────────────────────┐
│   app.js  (módulo JS)               │
│  · init Firebase con firebaseConfig │
│  · db.ref('items').onValue(render)  │
│  · addItem()  → db.push(...)        │
│  · change checkbox → db.update()    │
│  · validarComprados() → db.remove() │
└──────────────┬──────────────────────┘
               │  REST/WebSocket
               ▼
┌─────────────────────────────────────┐
│   Firebase RTDB  (shopmate-e9195)   │
│   /items/<id>  { nombre, comprado } │
└─────────────────────────────────────┘
```

---

## 6. Modelo de datos (RTDB)

Colección: **`items`**

```json
{
  "items": {
    "-NxYZ123": { "nombre": "Leche",  "comprado": false },
    "-NxYZ456": { "nombre": "Pan",    "comprado": true  }
  }
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `key` | string | Generada por `push()` de Firebase |
| `nombre` | string | Texto libre introducido por el usuario |
| `comprado` | boolean | `false` por defecto; toggled al marcar checkbox |

Reglas RTDB endurecidas con `auth != null` para `/items/` y `/shared/compras/` (ver `database.rules.json`). Validación de esquema server-side en ambos paths.

### Colección: `/shared/compras` (Fase 2.A, modo compat)

Cada compra es un push-key con `{ fecha, items }`:

```json
{
  "shared": {
    "compras": {
      "-Nx1": {
        "fecha": 1752400000000,
        "items": {
          "-Nx1a": { "nombre": "Leche",  "nota": "sin lactosa" },
          "-Nx1b": { "nombre": "Pan" },
          "-Nx1c": { "nombre": "Huevos" }
        }
      }
    }
  }
}
```

- `fecha`: `serverTimestamp()` (ms epoch).
- `items`: los keys originales de `/items/` (preservados para trazabilidad post-mortem).
- Cap client-side: **20 compras**, las más antiguas se borran auto al llegar al límite (`trimCompras()`).
- Cuando aterrice §1.E Familias, este path se migra atómicamente a `/families/{fid}/compras/` per regla IA #11.

---

## 7. Sistema de diseño

| Token | Valor |
|---|---|
| `--primary` | `#35BDB2` (turquesa) — cabeceras, h1 |
| `--secondary` | `#205746` (verde oscuro) — h2 |
| `--btn` | `#28A745` (verde) |
| `--btn-hover` | `#218838` |
| `--bg-body` | `#efefef` |
| `--bg-card` | `#ffffff` (contenedor) |
| Font body | `Poppins` |
| Font lista | `Caveat` |

Animación destacada: cuando un checkbox se marca, se reproducen las animaciones `move`, `slice`, `check-01`, `check-02` y `firework` antes de aplicar `text-decoration: line-through`.

---

## 8. Convenciones del código

- Idioma de UI: español. Mensajes, placeholder, botones en español.
- Comentarios y nombres de variables: mezcla español/inglés (más español).
- Sin frameworks — no introducir React, Vue, jQuery ni nada sin acuerdo.
- Módulos ES (`type="module"` en `<script>`).
- Al guardar, cualquier archivo se sube por SFTP al servidor — evitar commits con credenciales.

---

## 9. Historial de git (resumen)

| Commit | Mensaje | Estado |
|---|---|---|
| `087a2fd` | first commit | localStorage, `list.html`, `items.json` |
| `a3b094e` | Changed styles | Refinamiento visual |
| `4f15c99` | Implemented firebase real time database | ✅ **Versión funcional** |
| `d4ecc06` | Updated | ❌ Vació los archivos (workdir actual) |

Restauración recomendada: `git checkout 4f15c99 -- app.js main.css list.html`.

---

## 10. Lo que la IA debe recordar siempre

1. 🟢 El proyecto **no usa build step** — no proponer webpack, vite, etc. sin pedirlo.
2. 🟢 El proyecto **no usa frameworks** — no asumir React/Vue.
3. 🟢 Los archivos locales están **vacíos** en HEAD pero **el código real vive en git** (commit `4f15c99`; restaurado a `index.html`/`app.js`/`main.css` reales tras `d4ecc06` gracias a los commits de la Fase 0).
4. 🟢 La configuración Firebase está **externalizada**: `app.js` importa `firebaseConfig` desde `./firebase-config.js` (loader) que prioriza `firebase-config.local.js` (gitignored). Las claves reales NO viajan en el repo.
5. 🟢 Existe una **integración SFTP** que sube al guardar — no incluir secretos en los archivos.
6. 🟢 Las reglas RTDB están **endurecidas en `database.rules.json`** con `auth != null` (commit `d5cec7d`) y **desplegadas a Firebase prod el 2026-07-13**. Tienen validación de esquema (nombre, comprado, nota) en el `.validate` cascade. El cap de **500 items se enforza client-side** (`MAX_ITEMS` en `app.js`) porque el emulador RTDB v4.11 rechaza `newData.numChildren()`. La defensa-en-profundidad UX sigue siendo útil con auth (limita coste de quota de sign-ups).
7. 🟢 La IA debe leer además `instrucciones_ai.md` (reglas explícitas) y `roadmap.md` (plan futuro).
8. 🟢 **Console logs**: `app.js` usa helper `log/warn/logerr` con prefijo de módulo. Para silenciarlos en local: `localStorage.setItem('shopmate:debug','0')`. Definido por regla activa #04.
9. 🟢 **Aislamiento dev/prod**: ver `dev-isolation.txt` para no contaminar la lista familiar cuando se prueba en local.
10. 🟢 **Historial (Fase 2.A)**: cada "Validar compra" archiva los items marcados a `/shared/compras/{pushId}/{fecha,items}` y los borra de `/items/`. El drawer lateral (menú ☰) los renderiza como acordeón con `<details>/<summary>`, ordenados por fecha desc. Cap **20 compras** auto-trim client-side. No incluye authorship (uid/displayName) — diferido a §1.B Perfiles.
11. 🟢 **Polish mobile-drawer + a11y + cap items/compra (2026-07-13)**:
    - Drawer del menú ☰: botón ✕ cerrar (44px en mobile), header sticky (permanece visible al scrollear el historial), ancho 82vw en <480px.
    - **Focus management** (N1 a11y): al abrir, foco al close button; al cerrar, foco devuelto al trigger. Focus trap Tab/Shift+Tab dentro del drawer.
    - **Cap items/compra (N2)**: 100 items max por compra, enforzado **client-side** en `validarComprados()` (`MAX_ITEMS_PER_COMPRA = 100`). **NO server-side** porque el motor de reglas RTDB **no soporta** `newData.numChildren()` — el deploy prod del 2026-07-13 rechazo la regla con `Error: No such method/property 'numChildren'`. Mismo motivo por el que `/items/` tampoco tiene cap server-side. La validación de esquema (nombre, comprado, nota, fecha) SI es server-side.
12. 🟢 **Bug auth modal mobile — root cause real (2026-07-13)**: el error `PERMISSION_DENIED at /items` que ve David en mobile NO viene de un problema de onAuthStateChanged. Viene de un **token de Firebase Auth que expiró/revocó** mientras la app estaba abierta. El Firebase Auth client en mobile tiene un bug conocido: no siempre re-dispara `onAuthStateChanged` con `null` cuando el token muere, pero SI sigue intentando leer `/items/` con el token viejo → `PERMISSION_DENIED` en cada read. La app se queda zombie: visible, sin datos, sin auth modal. **Fix**: en el error callback de `onValue` (en `subscribeItems` y `subscribeCompras`), si `err.code === 'PERMISSION_DENIED'`, forzar `showAuthView('form')` para que la auth modal salga y el usuario pueda re-autenticarse. Complementa los 2 safety nets anteriores (fallback de carga 5s + safety net post-logout 1.5s).
13. 🟢 **IMPLEMENTADO §1.D Control de items (2026-07-14)**: roadmap actualizado 2026-07-13 con CRUD básico para corregir items sin ensuciar el historial. Implementado el 2026-07-14 con long-press → menu contextual. Drag-to-reorder **DIFERIDO a §2.D** por complejidad (ver item 18.1).
14. 🟢 **Migrado a email/password (2026-07-14)**: el plan Spark (gratuito) tenía un **límite diario de 5 envios de email** para `sendSignInLinkToEmail` (passwordless). Cuando se agotaba, Firebase devolvía `auth/quota-exceeded`. **Fix elegido**: migrar el flujo de auth a email + password (Firebase Auth Email/Password provider). **Resultado**: los SIGN-INS ya NO consumen quota de email (solo sign-ups o password-resets envian emails, eventos raros). Para el volumen familiar esperado (5-20 logins/día), el plan Spark vuelve a ser suficiente. **Si David quiere password-reset via email** o **sign-ups masivos**, Spark podría volver a quedarse corto → upgrade a Blaze (pay-as-you-go) en Firebase Console.
15. 🟢 **Emulador auto-sign-in como "test" (2026-07-13 → 2026-07-14)**: cuando se usa `?env=emul`, la app **YA NO muestra la auth modal ni pide email/password**. Hace `signInAnonymously(auth)` + `updateProfile({displayName: 'test'})` automaticamente desde el callback `onAuthStateChanged` cuando `user === null && emulatorConnected` (helper `emulatorSignInTest()`). El UID sigue siendo random (Firebase lo asigna en cada arranque limpio), pero el nombre visible en la UI (drawer perfil, log de consola) es "test". **Sin contrasena** (es signInAnonymously), **sin quota** (no usa ningún endpoint que consuma email), sin ningun flow de login interactivo. El safety net de 5s `authFallbackTimer` se cancela en emulador (`if (emulatorConnected) return`) para no romper el flujo "entra directo". En prod (sin `?env=emul`) el comportamiento es el de email/password normal. Si quieres probar el flujo email/password "real" en local, desactiva temporalmente la rama `emulatorConnected` en el bloque `if (emulatorConnected) { ... }` del callback `onAuthStateChanged`, o crea un usuario desde el UI del emulador (http://127.0.0.1:4000/auth) y entra con ese email/password. La constante `IS_EMULATOR` se declara arriba del todo (antes de los imports Firebase) y se evalua una sola vez al cargar el script.
17. 🟢 **Password reset flow (2026-07-14)**: nuevo state `form-reset` del modal auth que se activa desde el botón "¿Olvidaste tu contraseña?" (solo visible en `data-mode="signin"` via CSS). Al submit, `submitPasswordReset()` llama `sendPasswordResetEmail(auth, email)` y muestra el bloque `reset-sent` con el email + botón "Volver a iniciar sesión". Coste: 1 email por reset (despreciable; plan Spark free tier lo aguanta para uso familiar). **Anti-enumeración**: Firebase v9+ devuelve éxito silenciosamente para emails no registrados, y nuestro handler sigue mostrando `reset-sent` en ambos casos para no filtrar existencia de cuentas. Errores mapeados via `AUTH_ERROR_MAP` existente: `invalid-email`, `missing-email`, `too-many-requests`, `network-request-failed`, `quota-exceeded`, `operation-not-allowed`. Helpers nuevos: `enterResetMode()` cambia al state reset; `backFromResetSent()` vuelve a signin; `submitPasswordReset()` despacha `sendPasswordResetEmail`. KEYDOWN Escape enfoca el `auth-reset-back` button en `reset-sent` state para keyboard a11y.
16. 🟢 **HTTP-only guardrail para connectAuthEmulator (2026-07-13)**: el emulador Auth de Firebase **requiere HTTP** (no HTTPS). Si el user abre `?env=emul` en una URL HTTPS (e.g. el server prod `https://shopmate.com/?env=emul`), `connectAuthEmulator` falla con `auth/invalid-emulator-scheme` y el siguiente `signInAnonymously` se va a PROD (`identitytoolkit.googleapis.com`) — **risk**: data leak a prod, consumo de quota prod, posible `auth/admin-restricted-operation` si el provider no esta habilitado en el proyecto. La app distingue dos flags: `IS_EMULATOR` (intent, query string) y `emulatorConnected` (state, despues del HTTP check). El `?env=emul` block valida `window.location.protocol === 'http:'` antes de llamar `connectAuthEmulator`; si no es HTTP, emite un `warn` claro y NO conecta. El auto-sign-in (callback `onAuthStateChanged`) y el `authFallbackTimer` gatean por `emulatorConnected` (no `IS_EMULATOR`), asi que HTTPS+`?env=emul` cae limpiamente al auth modal prod. **Test correcto del emulador**: `python -m http.server 8080` + abrir `http://localhost:8080/?env=emul` (NO el server prod).
18. 🟢 **Long-press context menu + edit/delete CRUD (§1.D - 2026-07-14)**: pulsar y mantener (500ms estandar Android/iOS) sobre cualquier item de la lista abre un menu contextual popup (z-index 1000) con dos acciones: [Editar] y [Eliminar]. Threshold de movimiento de 8px cancela el long-press para distinguirlo de scroll/zoom touch. **Drag-to-reorder DIFERIDO a §2.D por complejidad** (ver item 18.1 abajo). Implementacion:
    - **Long-press**: pointer events cross-platform (`pointerdown`/`pointermove`/`pointerup`/`pointerleave`/`pointercancel`), button=0 gate para evitar click derecho del raton en desktop. Capture-phase click stopper (`{once: true, capture: true}` registrado dentro del setTimeout del timer de long-press) neutraliza el `click` secundario del release. `preventDefault` impide el toggle del checkbox (sin `change`); `stopPropagation` evita que el listener del notaIcon corra. Adjunto al wrapper `.list-item` (no a cada hijo) → un solo timer por fila y sin leak entre re-renders de `renderLista` (los wrappers viejos se destruyen con `innerHTML=''`).
    - **Edit popup**: form con 2 inputs separados (nombre obligatorio 1..80 chars, nota opcional 0..200 chars). `get(ref(db,'items/'+key))` fresh en cada apertura (no usa el snapshot stale del long-press) por si otro cliente edito el item mientras el menu estaba abierto. `update(ref db, {nombre, nota})` preserva `comprado` + metadata futura (addedBy/boughtBy cuando aterrice §1.B Perfiles). Si nota vacia → `nota: null` borra el field en RTDB. Validacion: si nombre vacio o >80 → toast error + focus al input. Submit deshabilitado durante el await + Escape cancela.
    - **Delete**: `remove(ref(db,'items/'+key))` + toast con `action:{label:'Deshacer', callback}` (duracion 5s). Snapshot deep-cloned (`JSON.parse(JSON.stringify(item))`) en `showItemActions()` independentiente de que se llame o no a edit primero (asi delete tras abrir el menu sin haber tocado edit funciona igual). Undo via `set(ref db, snapshot)` restaura el item en su **push key original** (preserva trazabilidad post-mortem). Si el undo falla (e.g. PERMISSION_DENIED por token expirado) → toast error pero la accion original (delete) sigue effective.
    - **showToast extendido**: nueva opcion `action:{label, callback}` reusa el mismo container (z-index 3000). El button usa `e.stopPropagation()` para no disparar el dismiss-on-click del wrapper (asi el undo se ejecuta y luego el toast desaparece). ARIA: se mantiene `role=alert`/`role=status` segun el `type` (error/intrusivo, info/success/courteous); el button action no necesita announcer role extra.

    **18.1. Drag-to-reorder DIFERIDO a §2.D - por que es complejo**:
    - **Schema migration**: RTDB JSON objects NO tienen orden implicito. Reordenar via `DOM reorder` no persiste: cada `onValue` re-renderiza con el orden de push keys. Solucion: añadir campo `sortIndex` (LexoHash o fraccional) a cada item + escribir el sortIndex nuevo a RTDB en cada drag. Esto requiere `multipath update` (`update(ref db, items))` con `null`s para los renumerados si la lista crece.
    - **Touch event integration**: HTML5 drag-and-drop esta roto en mobile (no dispara en touch). Hay que usar pointer events + mantener el ghost element durante el drag + hit-testing contra las otras filas para calcular la posicion de insercion + mantener la animacion visual del "ghost".
    - **Conflict resolution**: 2 usuarios arrastrando items a la vez → sus sortIndex locales se solapan → el ultimo write gana (puede pisar el otro). Soluciones serias requieren OT (Operational Transform) o CRDT, overkill para ShopMate. Aceptable: last-write-wins con un toast informativo cuando llega un update externo mientras el user esta arrastrando.
    - **Estimacion**: ~300 LOC + refactor de `renderLista` (no ya `forEach` plano sino sort por sortIndex) + un ordenamiento humano (lexorank fractional indexing). **Diferible a una sprint dedicada posterior a §1.E Familias**, no antes.

    **Impacto mínimo en reglas RTDB**: no hemos tocado `database.rules.json`; el schema {nombre, comprado, nota} sigue validado server-side. Los nuevos endpoints (`update`/`remove`/`set` con multisite) ya estaban permitidos via `auth != null` (el user ya está autenticado).

---

## 11. Snippet de referencia (Firebase init)

> ⚠️ Snapshots válidos **solo desde commit `2add016` en adelante**. Para código vivo leer `app.js` o `git show 2add016:app.js`. (El patrón hardcoded que había en `4f15c99` ya no se usa; ahora la config se externaliza.)

Cómo se inicializa Firebase y se escucha la lista (patrón actual):

```js
import { initializeApp }                 from "firebase/app";
import { getDatabase, ref, push, update,
         remove, onValue }               from "firebase/database";

// Config externalizada (loader + .local.js gitignored)
import { firebaseConfig } from "./firebase-config.js";

const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const list = ref(db, 'items');

onValue(list, renderLista);
```

> 🔍 **Por qué ya no hay `const firebaseConfig = {...}` inline**: lo nuevo es el loader `firebase-config.js` que prefiere `firebase-config.local.js` (gitignored) y cae al `firebase-config.example.js` (placeholders). Nunca se commitean claves reales. Ver `README.md → Configuración de Firebase y seguridad`.

---

## 12. Decisión sobre nombres

- `list.html` es el archivo histórico (commits `087a2fd`–`4f15c99`).
- `index.html` es lo que se ha visto por última vez (commit `d4ecc06`, vacío).
- **Recomendado**: restaurar `list.html` y renombrarlo a `index.html` para despliegue directo en Nginx/Apache.
