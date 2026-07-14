# 🗺 Hoja de ruta — ShopMate

> Plan de mejoras futuras del proyecto. Cada ítem está priorizado y agrupado por fase. Las casillas `[ ]` pueden irse marcando a `[x]` conforme se completen. Esta hoja de ruta se actualizó el 2026-07-12 integrando las 5 features adicionales que David ha confirmado para esta fase:
>
> 1. **Perfiles de usuario** (identidad + foto + displayName)
> 2. **Familias** (listas compartidas entre varias personas)
> 3. **Ajustes locales** (per-device: tamaño de letra, tema, …)
> 4. **Historial** de compras
> 5. **App Android nativa** real (no solo WebView envuelto). David es perfil DAW (web-only) → stack será **Capacitor** sobre la misma webapp.
>
> Ver `contexto.md` para el resumen técnico y `instrucciones_ai.md` para las reglas que la IA debe respetar.

---

## ✅ Fase 0 — Saneamiento inmediato (HECHO)

> Cerrado en commits `64bfc09`, `e3c02f6`, `01b07af`, `dce3778`, `d5cec7d` (rules). Las reglas endurecidas fueron desplegadas a Firebase prod el 2026-07-13 (verificado por David con su cuenta Owner).

### 0.A — Recuperación ✅

- [x] Restaurar la base funcional desde `4f15c99`.
- [x] Refactorizar `app.js` para usar loader de config.
- [x] Verificar arranque local sin claves reales en el repo.

### 0.B — Seguridad ✅

- [x] `.gitignore` cubriendo `firebase-config.local.js`, `.env*`, claves SSH y rutas SFTP.
- [x] Externalización de `firebaseConfig` → `firebase-config.{example,js,local.js}`.
- [x] Reglas RTDB endurecidas en `database.rules.json` (desplegadas a prod el 2026-07-13).

---

## 🥇 Fase 1 — Identidad y compartición (MVP+)

> Funcionalidades núcleo que requieren **Auth como fundación**. Hasta que Auth esté activo, la app sigue funcionando como "lista pública compartida" (modo actual).

### 1.A.0 — Prerrequisitos en Firebase Console (David, manual, una sola vez)

> Estos pasos se ejecutan UNA vez desde Firebase Console con tu cuenta Google antes de poder usar el flujo de Email-link. Sin ellos, el código commiteado queda funcional pero el flujo end-to-end (envío real de emails a tu correo) NO arranca.

- [x] **Habilitar Email/Password provider**: `Build > Authentication > Sign-in method > Email/Password` → toggle **Email/Password** en Enabled. _Cambiado 2026-07-14: migrado desde Email-link (passwordless) porque los 5 emails/día de Spark eran insuficientes. Ya verificado: David habilitado y funcionando._ ⚠️ Es CRÍTICO: si el provider NO está habilitado, la app lanza `auth/operation-not-allowed` en cualquier sign-in/sign-up.
- [x] **Authorized domains**: en la misma pestaña, sección **Authorized domains**. _E2E validado el 2026-07-13 en el dominio prod real de David (Firebase Console acepta el que esté en la lista). Los recomendados por defecto:_
  - `localhost` — para desarrollo local (con `python -m http.server 8080`).
  - `158.179.223.22` — IP del servidor prod Ubuntu (o el dominio real que uses; Firebase maneja IPs pero muestra warning — un dominio propio es preferible; letsencrypt en §Seguridad).
  - `shopmate-e9195.firebaseapp.com` — ya viene por defecto.
- [ ] **(Opcional, recomendado) Desactivar Email-link (passwordless)**: ya no se usa desde código. Mantenerlo enabled consume usuarios-passwordless residuales y puede confundir a David (que pensaba haberlo deshabilitado). Si tienes cuentas legacy con magic-link, primero migralas o déjalas enabled hasta que confirmes que ninguna sesion activa lo necesita. _Acceso: misma pantalla, toggle Email link (passwordless) → Disabled._
- [ ] **Quota ya no es problema para sign-ins**: con email/password, los SIGN-INS NO consumen quota de email. Solo sign-ups y password-resets lo harían. Si David quiere añadir password-reset o espera un boom de nuevos users, considerar Blaze nuevamente.

### 1.A — Autenticación (foundation)

- [x] **Activar Firebase Authentication** en Firebase Console → *Sign-in method* → **Email/Password**. _Bloqueado por §1.A.0._. _Refactorizado el 2026-07-14: migrado desde Email-link (passwordless) a email/password para escapar la cuota Spark (5 emails/día) que era insuficiente. Passwords hasheados server-side (scrypt + salt + pepper); nada se hashea en cliente._
- [x] **Ajustar RTDB rules** para exigir `auth != null` (`.read`/`write` solo a usuarios autenticados). El item legacy `rules` en `database.rules.json` se actualiza con `auth != null` en lugar de `true` abierto. _Commits: `f7e327f` feat(auth) + `d5cec7d` chore(rules)._ (las reglas NO necesitaron tocarse tras la migración email-link→email/password: siguen basándose en `auth != null`).
- [x] **UI: pantalla Identifícate** con email + password + botón submit. Toggle Sign in ↔ Sign up (mismo modal). Botón 👁 show/hide en el password. _Modal fullscreen bloqueante desde commit `f7e327f`; refactorizado a email/password el 2026-07-14 (commit `feat(auth): email/password` pendiente)._
- [x] **Validación client-side**: formato email (regex), longitud mínima 8 chars (en JS + `minlength` HTML5), coincidencia entre password y confirm en sign-up. Submit deshabilitado durante la promesa Firebase (defense anti-doble-click).
- [x] **Mensajes de error user-friendly en español** vía `AUTH_ERROR_MAP`: `invalid-credential` (anti-enumeración colapsa email-no-existe + password-incorrecta), `email-already-in-use` (mensaje neutro anti-enumeración sign-up), `weak-password`, `too-many-requests`, `operation-not-allowed`, etc. NO se loggea la contraseña.
- [x] **Logout** desde el menú ☰ lateral (botón "Cerrar sesión"). _Mismo commit `f7e327f` original; refactorizado al drawer._
- [x] **Password reset flow**: ¿Olvidaste tu contraseña? → nuevo state `form-reset` del modal auth. Solo pide email; oculta password field. Submit dispara `sendPasswordResetEmail(auth, email)`; en Firebase v9+ la API Devuelve éxito silenciosamente aunque el email no exista (anti-enumeración server-side). Tras éxito, muestra bloque `reset-sent` con el email y botón "Volver a iniciar sesión". Mapeo de errores: `auth/invalid-email`, `auth/missing-email`, `auth/too-many-requests`, `auth/network-request-failed`, `auth/quota-exceeded`, `auth/operation-not-allowed`. **Coste**: 1 email por reset; para tu uso familiar esto es despreciable vs Spark. _Implementado 2026-07-14 (commit `feat(auth): password reset via sendPasswordResetEmail` pendiente)._

**Password reset flow**:
- [x] Nueva pestana/toggle en el modal "¿Olvidaste tu contraseña?". Lanza `sendPasswordResetEmail` (1 email por reset; despreciable vs cuota Spark). Mapeo de errores contextuales con mensajes neutrales.
- [x] Anti-enumeración: el bloque `reset-sent` se muestra tanto si el email existe como si no (Firebase v9+ ya responde success al email ficticio). No se revela la existencia de la cuenta.

> ✅ **Fase 1.A cerrada el 2026-07-13 (passwordless inicial); refactorizada a email/password y ampliada con password reset el 2026-07-14**. Commits originales + push a `origin/main` (`f7e327f` feat, `d5cec7d` rules, `6c488d3`+`ff37025`+`193aaa6`+`3cbebb7`+`4211d5b` docs/dev). Refactor + reset pendientes de commit. Reglas endurecidas desplegadas a Firebase prod con la cuenta Owner correcta. E2E end-tooped validado para passwordless (David recibió magic link → click → app autenticada → lista renderizada). Migración a email/password + reset pendiente de E2E smoke en prod.

### 1.B — Perfiles de usuario

- [ ] **Esquema `/users/{uid}`** (uid = Firebase Auth uid):
  ```
  /users/{uid} {
    displayName: string,       // 1..40 chars
    photoURL:    string?,      // opcional, https URL
    createdAt:   timestamp,
    preferences: {             // sincronizado entre dispositivos del mismo user
      fontSize: 'sm'|'md'|'lg'|'xl',
      theme:    'light'|'dark'|'auto'
    }
  }
  ```
- [ ] **Form "Mi perfil"**: editar `displayName` + `photoURL` + preferencias propias.
- [ ] **Avatar en cabecera** de la app para认出 visualmente al usuario activo.

### 1.C — Ajustes locales (per-device)

- [ ] **Storage**:
  - Configuración por dispositivo en `localStorage` (`shopmate:settings`).
  - Configuración sincronizada opcionalmente a `/users/{uid}/preferences` (para mantener entre dispositivos del mismo usuario).
- [ ] **Ajustes soportados inicialmente**:
  - Tamaño de letra (`sm` → 14px base, `lg` → 18px, etc.).
  - Tema (`light`/`dark`/`auto`).
  - Atajos de teclado opcionales.
- [ ] **Sheet de Ajustes** accesible desde la cabecera (modal o drawer).

### 1.D — Control de items (editar / borrar) [MAYORIA IMPLEMENTADA 2026-07-14]

> Ahora que "Validar compra" archiva los items en `/shared/compras/`
> (Fase 2.A), los users necesitan poder corregir errores SIN ensuciar
> el historial. Esta seccion anade CRUD basico sobre items ANTES de
> §1.E Familias. **Implementada el 2026-07-14** con long-press →
> menu contextual (popup modal) + edit popup + delete con undo toast.
> El drag-to-reorder (sensacion "playlists de Spotify") queda DEFERIDO
> a §2.D por complejidad — ver el item explicativo alli abajo.

- [x] **Long-press menu contextual**: pulsar y mantener 500ms (estandar Android/iOS) sobre cualquier item abre un popup modal con dos acciones: [Editar] y [Eliminar]. Threshold de movimiento de 8px cancela el long-press para distinguirlo de scroll/zoom touch. Capture-phase click stopper (`{once: true, capture: true}` registrado dentro del timer) neutraliza el `click` secundario del release (click sobre notaIcon o cambio accidental del checkbox). _Implementado 2026-07-14._
- [x] **Editar item** (popup modal): long-press → [Editar] abre un popup con 2 inputs separados (nombre obligatorio 1..80 chars, nota opcional 0..200 chars). `get(ref(db,'items/'+key))` fresh en cada apertura (no usa el snapshot stale del long-press) por si otro cliente edito el item mientras el menu estaba abierto. `update(ref db, {nombre, nota})` preserva `comprado` + metadata futura. Si nota vacia → `nota: null` borra el field en RTDB. Guardar con Enter o click en [Guardar]; cancelar con Escape. _Diferencia vs spec original: el spec 2026-07-13 decia "click o doble-click → input editable INLINE"; la version 2026-07-14 usa popup modal (mas visible, mejor UX en mobile, mas espacio para inputs de nombre+nota). Inline edit queda como mejora futura opcional — ver §1.D inline-edit._ _Implementado 2026-07-14._
- [x] **Borrar item**: long-press → [Eliminar] ejecuta `remove(ref(db,'items/'+key))`. Sin confirm dialog. Toast flotante "Item borrado [Deshacer]" 5s (patron undo Material Design). Snapshot deep-cloned (`JSON.parse(JSON.stringify)`) en `showItemActions()` — delete sin edit previo funciona igual. _Diferencia vs spec original: el spec 2026-07-13 proponia "icono 🗑️ siempre visible"; descartado en favor de long-press (mas limpio visualmente, mejor discoverability mobile, mismo undo pattern). El 🗑️ inline queda como alternativa opcional en §1.D inline-edit._ _Implementado 2026-07-14._
- [x] **Restricciones de edicion**:
  - Nombre: 1..80 chars enforced client-side (mismo cap que `database.rules.json`).
  - Nota: 0..200 chars (mas permisivo que el nombre).
  - Si el item esta `comprado: true`, se puede editar el nombre sin desmarcarlo (no tocamos `comprado` en el `update`).
- [x] **RTDB rules**: ya validan `nombre` 1..80 chars en `/items/` desde el deploy 2026-07-13. No hubo que tocar `database.rules.json` (la validacion server-side ya cubria la edicion).
- [x] **Undo despues de borrar**: toast con action button "Deshacer" durante 5s. El undo via `set(ref db, snapshot)` restaura el item en su **push key original** (preserva trazabilidad post-mortem). Si el undo falla (e.g. PERMISSION_DENIED por token expirado) → toast error pero el delete original sigue effective.
- [x] **Accesibilidad**: popups con `role=dialog`, ARIA labels en todos los botones (`aria-label="Editar este item"`, etc.), focus inicial en close button (item-actions) o name input (item-edit), Escape cierra ambos, click-outside cierra, focus se devuelve al item tras cerrar (via papa-back-button pattern). Botones de accion 48px+ target tactil. _Implementado 2026-07-14._
- [x] **Mobile**: long-press (500ms) es mobile-first por definicion. Botones de accion 48px+ para tap comodo (44px Apple HIG cumplido). Popups centrados con max-width 92vw en <480px (no se cortan en portrait). Toast action button sin margin-left issues en <480px.
- [ ] **Edicion inline (alternativa opcional)**: el long-press popup es la opcion primaria post-§1.D 2026-07-14. Una edicion inline (doble-click sobre label → input en sitio, sin popup) es una mejora futura para usuarios desktop que modifican muchos items a la vez. Estimado: ~80 LOC + manejo de blur/Enter/Escape. No bloqueante.

### 1.E — Familias (listas compartidas entre varias personas)

- [ ] **Esquema `/families/{familyId}`**:
  ```
  /families/{familyId} {
    name:       string,
    owner:      uid,
    createdAt:  timestamp,
    settings:   { /* prefs compartidas de la familia */ },
    members: {
      {uid}: {
        displayName: string,
        role:        'owner'|'admin'|'member',
        joinedAt:    timestamp
      }
    },
    invites: {                 // tokens activos para unirse
      {token}: { createdAt, expiresAt, role }
    }
  }
  ```
- [ ] **Lista por familia**: `/families/{familyId}/items/{itemId}` (mismo esquema de item actual).
- [ ] **Migración de la lista actual** `/items/` → una familia `default` (sin perder datos) para mantener compatibilidad con la lista que ya existe.
- [ ] **UI**:
  - Crear familia (nombre + color identificativo).
  - Invitar miembros (enlace con token + QR via Capacitor cuando llegue).
  - Selector de familia activa en cabecera si el usuario pertenece a varias.
- [ ] **RTDB rules**: las reglas de items pasan a `/families/{familyId}/items/*` con `auth != null && family.members[auth.uid] != null`.

---

## 🥈 Fase 2 — Historial, PWA y app Android nativa

> Tras Fase 1 la app tiene identidad. Esta fase añade persistencia histórica, experiencia instalable y wrapper nativo.

### 2.A — Historial de compras

- [x] **Mover items marcados al pulsar Validar compra** (modo compat `/shared/compras/`): cada compra = `{ fecha, items: { [id]: { nombre, nota? } } }` con `serverTimestamp()` para evitar client clock-skew. _Implementado 2026-07-13. No incluye `addedBy/boughtBy` (uid/displayName) — diferido a §1.B Perfiles._
- [x] **Historial visible en el menú hamburguesa** con compras agrupadas (acordeón con `<details>/<summary>`, collapsed por defecto).
- [x] **Límite de 20 compras auto-trim** client-side: si el listener detecta `size > 20`, dispara `trimCompras()` que borra las más antiguas. Idempotente; race asumible en app familiar.
- [x] **Compatibilidad**: escrito a `/shared/compras/` (mientras no exista §1.E Familias). Cuando aterrice §1.E, script atómico migra a `/families/{fid}/compras/` per regla IA #11.
- [ ] **"Productos frecuentes"** (count por nombre normalizado) — pendiente.
- [ ] **Filtro de tiempo** (7d/30d/90d) — pendiente.
- [ ] **Authorship (addedBy/boughtBy)** — pendiente §1.B.

### 2.B — PWA completa

- [ ] **`manifest.json`**:
  - `name`: ShopMate
  - `short_name`: ShopMate
  - `theme_color`: `#35BDB2`
  - `background_color`: `#efefef`
  - `icons`: `icon-192.png`, `icon-512.png` (requiere assets reales).
- [ ] **`sw.js`** (Service Worker):
  - Cache estático (`index.html`, `app.js`, `main.css`, `manifest.json`).
  - Network-first para `/families/...` (datos RTDB).
  - Fallback offline mostrando lista cacheada de la última sesión.
- [ ] **HTML head**: `<link rel="manifest">` + `register sw.js`.

### 2.C — App Android nativa (**Capacitor**)

> 📌 **Decisión arquitectónica — Capacitor** (no PWA-TWA-only ni Kotlin native) porque David tiene perfil DAW (web-only) y Capacitor es la opción que:
> - Mantiene el código web intacto (HTML/CSS/JS puro).
> - Expone APIs nativas reales (push, splash, share, biometric).
> - Permite publicar en Google Play Store como APK firmado.
> - Solo añade build step en `android/` (subdir separado); el código web sigue sin build step.
>
> Si David quiere otra vía (TWA pura o Kotlin nativo), abrir conversación.

- [ ] `npm init -y` + `npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android`.
- [ ] `npx cap init ShopMate com.david.shopmate --web-dir=.`.
- [ ] `npx cap add android` → genera `android/` con proyecto Gradle.
- [ ] **`capacitor.config.json`**:
  - `appId: com.david.shopmate`
  - `appName: ShopMate`
  - `webDir: '.'`
  - Plugins: Push, Splash, StatusBar, App, Browser.
- [ ] **Splash screen**: imagen con assets reales (cuando David los tenga).
- [ ] **Icono nativo**: 192/256/512/1024 PNG generados desde el logo real.
- [ ] **Push notifications** vía `@capacitor/push-notifications` (integra con Fase 3).
- [ ] **Deep links**: al pulsar un invite link desde email, abre la app directo a la familia.
- [ ] **Publicar en Play Store** (proceso manual, asistencia de IA opcional).

### 2.A.b — Menú hamburguesa (drawer estilizado)

- [x] **Botón ☰ en cabecera** que abre drawer lateral con 4 secciones: Perfil / Ajustes / Historial / Cerrar sesión.
- [x] **Backdrop + Escape + click-fuera** cierran el drawer; z-index 1500 (auth-modal 2000 sigue por encima, correcto).
- [x] **Sección Perfil** (read-only): muestra el email autenticado.
- [x] **Sección Ajustes** (placeholder): "Próximamente: tamaño de letra, tema y ajustes de familia" hasta que aterrice §1.C + §1.D.
- [x] **Sección Cerrar sesión** movida desde el botón "Salir" del header al drawer.
- [x] **Cierre de sesión cierra también el drawer** (en `handleLogout`).
- [x] **Mobile polish (2026-07-13)**: botón ✕ cerrar dentro del drawer (44px target táctil en mobile), header sticky (no se va al scrollear el historial), drawer reducido a 82vw en <480px.
- [x] **N1 a11y focus management (2026-07-13)**: al abrir el drawer, foco al botón cerrar; al cerrar, foco devuelto al ☰. Focus trap Tab/Shift+Tab dentro del drawer.
- [x] **N2 cap items/compra (2026-07-13)**: cap de **100 items por compra**, enforzado **client-side** en `validarComprados()` (`MAX_ITEMS_PER_COMPRA = 100`). **NO server-side**: el motor de reglas RTDB **no soporta** `newData.numChildren()` — el deploy prod del 2026-07-13 fallo con `Error: No such method/property 'numChildren'`. Mismo motivo por el que `/items/` tampoco tiene cap server-side.

### 2.D — Mejoras de UX

- [ ] Atajos de teclado: `Cmd/Ctrl+K` (focus input), `Espacio` (marcar), `Cmd/Ctrl+Shift+Enter` (validar).
- [ ] Edición inline (doble click sobre el nombre → input editable).
- [ ] **Drag-to-reorder items** [DEFERIDO 2026-07-14 por complejidad]. **Por que es complejo**:
  1. **Schema migration obligatoria**: RTDB JSON objects NO tienen orden implicito. Reordenar via DOM no persiste — cada `onValue` re-renderiza con el orden de push keys. Solución: añadir campo `sortIndex` (LexoHash fraccional o decimal inteligente) a cada item + reescribir el sortIndex en cada drag. Esto requiere `multipath update` a RTDB, no single-set.
  2. **Touch event integration full-custom**: HTML5 drag-and-drop API esta roto en mobile (no dispara en touch). Hay que usar `pointer events` + mantener el ghost element durante el drag + hit-testing contra las otras filas para calcular la posicion de insercion + mantener la animacion visual del "ghost" (placeholder row que se mueve para indicar donde caera el item).
  3. **Conflict resolution entre 2 usuarios**: si dos users arrastran items a la vez, sus sortIndex locales se solapan y el ultimo write gana (puede pisar al otro). Last-write-wins con un toast informativo "Otro usuario reordeno mientras tanto" es aceptable para ShopMate familiar. Soluciones serias (CRDT/OT) son overkill.
  4. **Estimación**: ~300 LOC + refactor de `renderLista` (sort por sortIndex, no ya por push key time-order) + posible ajuste de scroll durante el drag (long listas + drag en mobile = jank si no hay momentum scrolling correcto).
  5. **Dependencias**: logicamente pertenece a despues de §1.E Familias (cada familia tendra su propio orden). No bloqueante para uso actual; la lista funciona perfectamente con orden de push key (que ya es time-ordered = cronologico de inserción).
  
  Implementación futura cuando se justifique: sprint dedicada, posiblemente con un PR grande. Mientras tanto, los items aparecen en orden de adición.
- [ ] Modo oscuro (integrado con el toggle de Ajustes 1.C).
- [ ] Indicador "X usuarios conectados ahora" en cabecera (presencia).

---

## 🥉 Fase 3 — Productividad e integración

> Depende de Fase 1 + 2 (familias + native).

- [ ] **Notificaciones push nativas** vía Capacitor + FCM: "Pepi ha añadido Tomates", "Quedan 3 productos".
- [ ] **Importar desde texto**: pegar lista del WhatsApp y `app.js` detecta items.
- [ ] **Export / share**: PDF / texto plano / QR (la sala/familia).
- [ ] **Plantillas de lista**: crear desde plantilla ("Compra semanal base") + custom.
- [ ] **Sugerencias automáticas**: autocomplete basado en historial.
- [ ] **Precios estimados**: campo opcional `precioEstimado: number` por item → dashboard de gasto mensual.

---

## 🏆 Fase 4 — Inteligencia y gamificación

> Depende de Fase 3 (datos suficientes).

- [ ] **Dashboard de gasto** semanal / mensual / por familia.
- [ ] **Ranking** "quién más marca productos" (gamificación).
- [ ] **Recomendador de menús** que genere la lista de la compra desde el menú de la semana.
- [ ] **Integración con supermercados** (precios reales vía API cuando esté disponible).

---

## 🧱 Mejoras técnicas transversales

- [x] Estructura web clara y simple (un solo `index.html` + `app.js` + `main.css` + loaders/).
- [ ] **Estructura multi-target** (cuando llegue Capacitor):
  ```
  ShopMate/                       ← raíz (web)
  ├── index.html, app.js, main.css, firebase-config.*
  ├── android/                    ← proyecto Capacitor Android (generado, no commitear node_modules/)
  ├── ios/                        ← (futuro, opcional)
  └── tests/                      ← jest+jsdom, Playwright
  ```
- [ ] Tests unitarios de `renderLista` con jest + jsdom.
- [ ] Tests E2E con Playwright (añadir, marcar, validar, login).
- [ ] Linter básico con eslint + prettier para `app.js`.
- [x] `firebase-tools` deploy de reglas (hecho el 2026-07-13 con la cuenta Owner de David).
- [ ] CI/CD con GitHub Actions: build web → `npx cap sync android` → APK firmado.
- [ ] Sustituir SFTP manual por Firebase Hosting (web) + Play Store (Android).
- [ ] Internacionalización i18n (`es` / `en` / `ca`) usando `data-i18n` + JSON por idioma.

---

## 🔒 Seguridad y privacidad (backlog continuo)

- [ ] HTTPS obligatorio (LetsEncrypt si se mantiene el servidor Ubuntu para web).
- [ ] Cabeceras de seguridad: CSP, X-Frame-Options, Referrer-Policy.
- [ ] Auditoría anual de reglas RTDB.
- [ ] Política de retención: borrar historial > 1 año (configurable).
- [ ] RGPD: exportar todos los datos del usuario / eliminar cuenta.
- [ ] App Check en Firebase para prevenir abuso de la apiKey desde clientes no autorizados.

---

## 📅 Hitos sugeridos (actualizados)

| Hito | Alcance | Estado |
|---|---|---|
| **M0 — Rescate + seguridad** | Restaurar + `.gitignore` + claves seguras + reglas | ✅ HECHO (deploy RTDB confirmado el 2026-07-13) |
| **M1 — Identidad** | Auth + perfiles + ajustes locales + control items + familias | 🟡 **EN MARCHA** (1.A cerrada 2026-07-13; §1.B, §1.C, §1.D control items y §1.E familias pendientes) |
| **M2 — Historial + PWA** | Snapshot en validar + manifest + SW + offline | ⬜ |
| **M3 — App Android** | Capacitor wrapper + splash + icono + Play Store | ⬜ |
| **M4 — Productividad** | Push, import, export, sugerencias, precios | ⬜ |
| **M5 — DevOps** | CI/CD + tests + multi-target + Firebase Hosting | ⬜ |
| **M6 — IA / Producto** | Recomendador, gasto, gamificación, integración | ⬜ |

---

## 💡 Ideas en la nevera (sin compromiso)

- Vista "modo lista del súper" con casillas grandes optimizadas para dedos.
- Sincronización con Apple Reminders / Google Tasks.
- Botón "añadir por voz" con Web Speech API.
- Integración con Alexa / Google Assistant.
- Versión iOS además de Android (reutiliza Capacitor).
- Tema visual "familiar" con avatares grandes + colores por miembro.

---

## 📊 Criterios para decidir la siguiente mejora

Antes de empezar cada ítem, comprobar:

1. ¿Lo piden los usuarios (incluido David)?
2. ¿Reduce fricción en el flujo principal? (añadir → marcar → validar → sincroniza → nativo)
3. ¿Cabe en < 1 día de trabajo sin romper Firebase sync ni migrar familia activa?
4. ¿Mantiene la promesa "HTML+CSS+JS puro" para el código web o requiere justificación explícita?
5. ¿Mejora la seguridad/postura de privacidad?

Si la respuesta a 1–3 es **sí**, planifícalo en el siguiente sprint.

---

> 🛟 Para contexto técnico rápido consulta `contexto.md`. Para reglas que la IA debe cumplir, consulta `instrucciones_ai.md`.
