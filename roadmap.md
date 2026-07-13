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

- [x] **Habilitar Email-link (passwordless)**: `Build > Authentication > Sign-in method > Email/Password` → activar el toggle **Email link (passwordless)**. Provider debe quedar Enabled. _Verificado 2026-07-13: E2E completo (envío de magic link a David OK)_.
- [x] **Authorized domains**: en la misma pestaña, sección **Authorized domains**. _E2E validado el 2026-07-13 en el dominio prod real de David (Firebase Console acepta el que esté en la lista). Los recomendados por defecto:_
  - `localhost` — para desarrollo local (con `python -m http.server 8080`).
  - `158.179.223.22` — IP del servidor prod Ubuntu (o el dominio real que uses; Firebase maneja IPs pero muestra warning — un dominio propio es preferible; letsencrypt en §Seguridad).
  - `shopmate-e9195.firebaseapp.com` — ya viene por defecto.
- [ ] **(Opcional) Personalizar plantilla de email**: `Templates > Email link` → editar subject y cuerpo. **FROM sigue siendo `noreply@shopmate-e9195.firebaseapp.com`** (no personalizable sin plan Blaze).
- [ ] **Quota**:Spark (gratis) tiene tope diario de emails. Si la familia dispara muchos `signInWithEmailLink`, puede saltar `auth/quota-exceeded`. Considerar Blaze si esto se vuelve problemático.

### 1.A — Autenticación (foundation)

- [x] **Activar Firebase Authentication** en Firebase Console → *Sign-in method* → **Email link (passwordless)**. _Bloqueado por §1.A.0._
- [x] **Ajustar RTDB rules** para exigir `auth != null` (`.read`/`write` solo a usuarios autenticados). El item legacy `rules` en `database.rules.json` se actualiza con `auth != null` en lugar de `true` abierto. _Commits: `f7e327f` feat(auth) + `d5cec7d` chore(rules)._
- [x] **UI: pantalla Identifícate**: input email + botón "Enviar enlace". El enviar dispara `sendSignInLinkToEmail`. _Modal fullscreen bloqueante en commit `f7e327f`._
- [x] **Completar sign-in**: al clicar el enlace del correo, validar y guardar sesión local (`localStorage` con expiración 24h). _Misma sesión también persistida vía IndexedDB por Firebase (no requiere acción manual del usuario)._
- [x] **Logout** desde cabecera (botón "Salir"). _Mismo commit `f7e327f`._

> ✅ **Fase 1.A cerrada el 2026-07-13**. Commits commiteados + push a `origin/main` (`f7e327f` feat, `d5cec7d` rules, `6c488d3`+`ff37025`+`193aaa6`+`3cbebb7`+`4211d5b` docs/dev). Reglas endurecidas desplegadas a Firebase prod con la cuenta Owner correcta. E2E end-to-end validado (David recibió magic link → click → app autenticada → lista renderizada). NO hay pasos pendientes relativos a §1.A; las secciones §1.B, §1.C y §1.D siguen abiertas.

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

### 1.D — Control de items (editar / borrar) [PRIORIDAD 2026-07-13]

> Ahora que "Validar compra" archiva los items en `/shared/compras/`
> (Fase 2.A), los users necesitan poder corregir errores SIN ensuciar
> el historial. Hoy la unica forma de quitar un item es validando la
> compra, lo cual crea una compra "fantasma" en el historial. Esta
> seccion anade CRUD basico sobre items ANTES de §1.E Familias.

- [ ] **Editar item**: click en el nombre (o doble-click desktop) → input editable inline. Guardar con Enter o blur. Cancelar con Escape (restaura el valor anterior).
- [ ] **Borrar item**: icono 🗑️ al lado de cada item. Visible en hover desktop / siempre visible en mobile (target tactil). Confirmacion con dialog nativo (`confirm()`) o undo toast (preferible: toast con "Deshacer" por 5s).
- [ ] **Restricciones de edicion**:
  - Nombre: 1..80 chars (mismo cap que `database.rules.json`).
  - Si el item esta `comprado: true`, se puede editar el nombre sin desmarcarlo.
  - Si se edita la nota, el popup de notas sigue funcionando.
- [ ] **RTDB rules**: ya validan `nombre` 1..80 chars en `/items/`. No hace falta cambiar rules.json (la validacion server-side ya cubre la edicion).
- [ ] **Undo despues de borrar**: toast "Item borrado [Deshacer]" por 5s. El undo reactiva el item via `set()` con la data original (nombre, nota, comprado, addedBy si existe).
- [ ] **Accesibilidad**: botones con `aria-label`, edit inline navegable con teclado (Tab/Shift+Tab/Enter/Escape), focus visible.
- [ ] **Mobile**: iconos suficientemente grandes (min 44px target tactil Apple HIG), swipe-to-delete opcional como mejora futura.

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
- [x] **Compatibilidad**: escrito a `/shared/compras/` (mientras no exista §1.D Familias). Cuando aterrice §1.D, script atómico migra a `/families/{fid}/compras/` per regla IA #11.
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
- [ ] Drag & drop para reordenar items.
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
