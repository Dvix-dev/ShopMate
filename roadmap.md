# 🗺 Hoja de ruta — ShopMate

> Plan de mejoras futuras del proyecto. Cada ítem está priorizado y agrupado por fase. Las casillas `[ ]` pueden irse marcando a `[x]` conforme se completen.

---

## 🚨 Fase 0 — Saneamiento inmediato

> Bloqueante antes de tocar nada más.

### 0.A — Recuperación (must-do-now)

- [ ] **Restaurar los archivos del proyecto desde `4f15c99`**.
  ```bash
  git checkout 4f15c99 -- app.js main.css list.html
  # opcional: renombrar list.html → index.html
  mv list.html index.html
  ```
- [ ] **Aportar los assets reales**: `assets/icon.ico` y `assets/logo.png` están vacíos incluso en `4f15c99`, así que el checkout no los recupera. Hay que generarlos o pedirlos al diseñador.
- [ ] **Verificar** que la app arranca en local (`python -m http.server`) y que Firebase sincroniza.

> ⚠️ **Riesgo de despliegue automático**: `.vscode/sftp.json` tiene `uploadOnSave: true`. Cada `git checkout` o guardado subirá automáticamente al servidor de producción `/var/www/html/shopmate` en `158.179.223.22`. Antes de restaurar, **decidir**:
> - [ ] Quiero recuperar **y** subir a producción ya → déjalo como está.
> - [ ] Quiero recuperar **solo en local** → desactivar temporalmente `uploadOnSave` o agregar `app.js`, `main.css`, `list.html` al array `ignore`.
>
> Una vez decidido, dejar documentado en `.vscode/sftp.json` o en este roadmap.

### 0.B — Seguridad (should-do-soon)

- [ ] **Crear `.gitignore`** que ignore al menos:
  - `firebase-config.local.js`
  - `*.pem`, `*.key`
  - `.vscode/` (o solo `sftp.json`)
- [ ] **Externalizar configuración Firebase** a un archivo ignorado (no subir claves al repo).
- [ ] **Proteger `main`** en git: activar branch protection / exigir PR.

---

## 🥇 Fase 1 — Calidad y robustez (MVP+)

Funcionalidades clave para que la app sea usable en serio.

- [ ] **Reglas de seguridad RTDB reales**:
  - Autenticación obligatoria antes de leer/escribir.
  - Validación de esquema (`nombre` string no vacío, `comprado` boolean).
- [ ] **Autenticación de usuarios**:
  - Magic link por email (Firebase Auth) — sin contraseñas.
  - O bien acceso por código compartido (sala privada).
- [ ] **Lista de salas / listas múltiples**:
  - Cada usuario puede tener 1..N listas (ej. “Casa”, “Trabajo”, “Vacaciones”).
  - Compartir cada lista con enlace cifrado.
- [ ] **Categorías de productos**:
  - `Frutería`, `Limpieza`, `Carnicería`, `Panadería`, `Otros`.
  - Colores o iconos por categoría.
- [ ] **Cantidad y unidad**:
  - `nombre` → `{ nombre, cantidad, unidad }` (ej. 2 kg de naranjas).
  - Selector de unidad (ud, kg, l, pack).
- [ ] **Orden y filtrado**:
  - Filtrar pendientes / comprados.
  - Orden alfabético / por categoría / por fecha.

---

## 🥈 Fase 2 — Experiencia de usuario (UX)

Que la app sea un placer de usar.

- [ ] **PWA completa**:
  - `manifest.json` con icono, nombre, `display: standalone`.
  - Service Worker con cache estático (`app.js`, `main.css`, fuentes).
  - Funcionar 100% offline + sincronización al volver online.
- [ ] **Atajos de teclado**:
  - `Enter` añadir (ya existe).
  - `Cmd/Ctrl + K` enfocar input.
  - `Espacio` marcar item enfocado.
  - `Cmd/Ctrl + Shift + Enter` validar comprados.
- [ ] **Edición inline**:
  - Doble click sobre el nombre del producto → input editable.
- [ ] **Drag & drop** para reordenar productos manualmente.
- [ ] **Animaciones suaves** en añadir/quitar (fade-out antes del remove).
- [ ] **Modo oscuro / claro** con toggle persistente.
- [ ] **Indicador de “otro usuario está conectado”** con su nombre o avatar.

---

## 🥉 Fase 3 — Productividad e integración

- [ ] **Historial de compras**:
  - Cada producto “comprado” se archiva en `historial/<fecha>/`.
  - Vista semanal / mensual de lo que más se compra.
- [ ] **Sugerencias automáticas**:
  - Autocomplete basado en el historial.
  - “Productos frecuentes”.
- [ ] **Plantillas de lista**:
  - Crear lista desde plantilla (“Compra semanal base”).
- [ ] **Importar desde texto**:
  - Pegar lista del WhatsApp y la app detecta productos.
- [ ] **Export / share**:
  - Compartir lista en PDF / texto plano.
  - QR de la sala para invitados sin la app.
- [ ] **Notificaciones push**:
  - “Pepi ha añadido Tomates”.
  - “Quedan 3 productos por comprar”.

---

## 🏆 Fase 4 — Inteligencia y gamificación

- [ ] **Dashboard de gasto estimado**:
  - Precio aproximado por producto (manual / dataset).
  - Total semanal / mensual.
- [ ] **Ranking de quien más productos compra** (gamificación).
- [ ] **Recomendador de menús** que genere la lista de la compra.
- [ ] **Integración con supermercados** (API / scraping): precios reales y carrito.

---

## 🧱 Mejoras técnicas transversales

Aplican a cualquier fase. No son producto, son ingeniería.

- [ ] Estructura de carpetas clara:
  ```
  src/
    js/
      firebase.js      # init + exports
      list.js          # render + eventos
      storage.js       # wrappers RTDB
    css/
      tokens.css       # variables de color/tipografía
      layout.css       # estructura
      components.css   # botones, inputs, checklist
    assets/
  ```
- [ ] Pasar de `<script type="module">` a módulos separados.
- [ ] Tests unitarios con Vitest + jsdom para la lógica de `renderLista`.
- [ ] Tests E2E con Playwright (añadir, marcar, validar).
- [ ] Linter (ESLint + Prettier) con commit-hook (Husky).
- [ ] CI/CD con GitHub Actions:
  - Lint + tests en cada PR.
  - Deploy a Firebase Hosting (alternativa a SFTP).
- [ ] Sustituir SFTP manual por **Firebase Hosting con GitHub Actions**:
  - Build automático al push a `main`.
  - HTTPS + CDN global gratis.
  - Eliminar dependencia del servidor Ubuntu.
- [ ] Internacionalización (`es` / `en` / `ca`) usando `data-i18n` y un JSON por idioma.

---

## 🔒 Seguridad y privacidad (backlog continuo)

- [ ] HTTPS obligatorio (LetsEncrypt si se mantiene el servidor Ubuntu).
- [ ] Cabeceras de seguridad: CSP, X-Frame-Options, Referrer-Policy.
- [ ] Auditoría anual de reglas RTDB.
- [ ] Política de retención: borrar historial > 1 año.
- [ ] RGPD: opción de exportar todos los datos del usuario / eliminar cuenta.

---

## 📅 Hitos sugeridos

| Hito | Alcance | Estado |
|---|---|---|
| **M0 — Rescate** | Restaurar archivos + `.gitignore` + claves seguras | ⏳ |
| **M1 — MVP seguro** | Auth + reglas RTDB + categorías | ⬜ |
| **M2 — PWA** | Manifest + SW + offline | ⬜ |
| **M3 — Salas múltiples** | Listas privadas compartidas | ⬜ |
| **M4 — Historial** | Persistir comprados + sugerencias | ⬜ |
| **M5 — DevOps** | CI/CD + tests + Hosting | ⬜ |
| **M6 — IA / Producto** | Recomendador + gasto estimado | ⬜ |

---

## 💡 Ideas en la nevera (sin compromiso)

- Vista “modo lista del súper” con casillas grandes optimizadas para dedos.
- Sincronización con Apple Reminders / Google Tasks.
- Botón “añadir por voz” con Web Speech API.
- Integración con Alexa / Google Assistant.
- Versión nativa con Capacitor (iOS / Android).

---

## 📊 Criterios para decidir la siguiente mejora

Antes de empezar cada ítem, comprobar:

1. ¿Están los usuarios pidiendo esto? (feedback real)
2. ¿Reduce fricción en el flujo principal? (añadir → marcar → validar)
3. ¿Cabe en < 1 día de trabajo sin romper Firebase sync?
4. ¿Mantiene la promesa “HTML+CSS+JS puro” o requiere justificación explícita?
5. ¿Mejora la seguridad/postura de privacidad?

Si la respuesta a 1–3 es **sí**, planificalo en el siguiente sprint.

---

> 🛟 Para contexto técnico rápido consulta `contexto.md`. Para reglas que la IA debe cumplir, consulta `instrucciones_ai.md`.
