# 🛒 ShopMate

> **Lista de compra conjunta en tiempo real** — Una aplicación web sencilla, elegante y colaborativa para gestionar la lista de la compra entre varias personas mediante Firebase Realtime Database.

---

## 📑 Tabla de contenidos

1. [Descripción](#-descripción)
2. [Estado actual del proyecto](#-estado-actual-del-proyecto)
3. [Características](#-características)
4. [Stack tecnológico](#-stack-tecnológico)
5. [Instalación y arranque local](#-instalación-y-arranque-local)
6. [Estructura del proyecto](#-estructura-del-proyecto)
7. [Configuración de Firebase y seguridad](#-configuración-de-firebase-y-seguridad)
8. [Reglas de Realtime Database](#-reglas-de-realtime-database)
9. [Despliegue en producción](#-despliegue-en-producción)
10. [Uso de la aplicación](#-uso-de-la-aplicación)
11. [Modelo de datos](#-modelo-de-datos)
12. [Personalización visual](#-personalización-visual)
13. [Solución de problemas](#-solución-de-problemas)

---

## 🧾 Descripción

**ShopMate** es una webapp ligera (HTML + CSS + JS puro, sin frameworks ni build step) pensada para que varias personas puedan añadir productos a una misma lista de la compra y marcarlos como comprados en tiempo real desde cualquier dispositivo con navegador. La conversión a PWA completa (manifest + service worker + offline) está planificada en `roadmap.md` → Fase 2.

Toda la información se sincroniza a través de **Firebase Realtime Database**, de modo que cualquier cambio (añadir, marcar o eliminar) se refleja al instante en todos los clientes conectados.

---

## 📜 Estado actual del proyecto

> ✅ **Estado actual (post-Fase 0.B, 2026-07-13):** los archivos funcionales están restaurados en el directorio de trabajo (commits de Fase 0). La versión que se ve en `MAIN` es operativa — solo la sección siguiente queda como **referencia histórica** para evitar repetir el desastre del commit `d4ecc06` que vació los archivos.
>
> La versión funcional del proyecto está disponible en los commits previos:
>
> | Commit | Mensaje | Contenido |
> |---|---|---|
> | `087a2fd` | first commit | Versión inicial con `localStorage` |
> | `a3b094e` | Changed styles | Refinamiento de estilos |
> | `4f15c99` | Implemented firebase real time database | **Versión Firebase funcional** (recomendada) |
> | `d4ecc06` | Updated | ⚠️ Versión vacía (estado actual) |

### 🔧 Restaurar la versión funcional (receta canónica)

> ⚠️ Cualquier `git checkout` o `git restore` **sube** los archivos modificados al servidor vía SFTP (configurado en `.vscode/sftp.json`). Si solo quieres recuperar localmente sin desplegar, **desactiva temporalmente `uploadOnSave`** en `.vscode/sftp.json` antes de restaurar y vuelve a activarlo después.

```bash
# Restaurar archivos desde la última versión funcional
git checkout 4f15c99 -- app.js main.css list.html

# (Opcional) renombrar list.html → index.html para despliegue directo
mv list.html index.html
```

> 📝 **Importante sobre los assets**: `assets/icon.ico` y `assets/logo.png` están a **0 bytes incluso en `4f15c99`**, así que tras el `git checkout` seguirán vacíos. Tendrás que aportar los binarios reales (puedes generarlos a partir de un .png con `magick`, o pedirlos al diseñador).

---

## ✨ Características

- ✨ **Añadir productos** rápidamente (botón o tecla `Enter`).
- ✅ **Marcar como comprado** con un checkbox animado y de gran tamaño.
- 🧹 **Validar compra**: elimina de la lista todos los productos ya marcados.
- 📡 **Sincronización en tiempo real** entre todos los dispositivos conectados.
- 🎨 **Diseño responsivo** con tipografías modernas (Poppins + Caveat).
- 🌐 **Despliegue por SFTP** automático al guardar (VS Code).
- 🔒 **Configuración externalizada**: las claves de Firebase NO viajan en el repo.
- 🔐 **Identifícate (Fase 1.A)**: autenticación passwordless por email-link. Modal fullscreen bloqueante hasta completar el login (sin contraseñas — solo un click en el email). Sesión persistida automáticamente; botón "Salir" en cabecera.
- 🐞 **Debug opcional**: `localStorage.setItem('shopmate:debug','0')` silencia los `console.log` de `app.js` (útil en producción).
- 📝 **Notas en items**: añade `Leche (sin lactosa)` → nombre "Leche", nota "sin lactosa" (popup al pulsar el icono 📝).
- 🧪 **Aislamiento dev/prod**: `dev-isolation.txt` documenta el uso del emulador local (RTDB + Auth + UI) sin tocar la nube prod. Único camino soportado actualmente (los métodos "proyecto paralelo" y "staging SFTP" fueron retirados en commit `ff37025`).
- 🍔 **Menú hamburguesa (Fase 2.A)**: drawer lateral con 4 secciones — Perfil (read-only), Ajustes (placeholder §1.C/§1.E), **Historial de compras** (acordeón con cada compra agrupada), y Cerrar sesión. Se abre con el botón ☰ de la cabecera; cierra con backdrop, Escape, botón ✕ dentro del drawer o click-fuera. Header del drawer **sticky** (permanece visible al scrollear) y ancho **82vw en mobile** (<480px). Foco gestionado para accesibilidad (a11y: foco al close button al abrir, devuelto al ☰ al cerrar, focus trap Tab/Shift+Tab).
- 📜 **Historial de compras (Fase 2.A, modo compat)**: cada "Validar compra" archiva los items marcados a `/shared/compras/{pushId}/{fecha, items}` y los borra de `/items/`. Las compras se ven agrupadas en acordeón (collapsed por defecto). Cap auto-trim a 20 compras (las más antiguas se borran). Cuando llegue §1.E Familias, los datos se migrarán a `/families/{fid}/compras/` con script atómico.

> 📝 **Nota:** el proyecto aún **no es PWA completa** (sin `manifest.json` ni service worker); ese trabajo está planificado en `roadmap.md` → Fase 2. La versión inicial (`087a2fd`) sí guardaba en `localStorage` como fallback, pero la build Firebase actual no conserva esa capa offline.

---

## 🛠 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Estructura | HTML5 semántico (`lang="es"`) |
| Estilos | CSS3 + Google Fonts (Poppins y Caveat) |
| Lógica | JavaScript ES Modules |
| Persistencia | Firebase Realtime Database |
| Hosting | Servidor propio vía SFTP (`158.179.223.22`) |
| Configuración | `firebase-config.local.js` gitignored + `.env.example` |
| Autenticación | Firebase Authentication email-link magic-link (passwordless, **activa** desde Fase 1.A) |

> No se usa ningún framework, bundler ni gestor de paquetes. Todo se ejecuta directamente en el navegador.

---

## 🚀 Instalación y arranque local

Como es un sitio estático puro, basta con tener Python (o cualquier servidor HTTP) instalado:

### Opción 1 — Python

```bash
# Desde la carpeta raíz del proyecto
python -m http.server 8080
# Abrir en el navegador:
# http://localhost:8080
```

### Opción 2 — Node.js

```bash
npx serve .
```

### Opción 3 — PHP

```bash
php -S localhost:8080
```

> **Nota:** si abres el `index.html` directamente con doble clic (`file://`) algunas funciones como los módulos ES y la conexión a Firebase pueden fallan. Usa siempre un servidor local.

---

## 📁 Estructura del proyecto

> **Convención de nombre:** la versión funcional del proyecto usaba `list.html`. Si quieres desplegar en SFTP bajo `/var/www/html/shopmate`, lo más cómodo es **renombrarlo a `index.html`** (es lo que hace Nginx/Apache como `index` por defecto). La guía asume `index.html` a partir del renombrado.

```
ShopMate/
├── README.md                 # Esta guía
├── contexto.md               # Resumen ejecutivo (para la IA)
├── instrucciones_ai.md       # Reglas que debe seguir la IA
├── roadmap.md                # Hoja de ruta de mejoras futuras
├── .gitignore                # Excluye claves reales (.env, firebase-config.local.js, etc.)
├── .env.example              # Plantilla-documento de variables (no usada por el browser)
├── dev-isolation.txt         # Guía única del emulador local (RTDB + Auth + UI) tras ff37025
├── firebase-config.example.js  # Plantilla con placeholders (commiteada, Segura)
├── firebase-config.js        # Loader que prefiere .local.js y cae al .example.js
├── firebase-config.local.js  # ⚠️ NO COMMITEAR · Contiene tus claves reales (gitignored)
├── database.rules.json       # Reglas RTDB endurecidas (pendiente de deploy con firebase-tools)
├── firebase.json             # Config de firebase-tools (auth+DB+UI emulators + database.rules.json)
├── .firebaserc               # Alias de proyecto: shopmate-e9195
├── index.html                # Página principal (renombrada desde list.html)
├── app.js                    # Lógica + integración Firebase (importa config del loader, sin claves)
├── main.css                  # Estilos
└── assets/
    ├── icon.ico              # Favicon  ⚠️ vacío en repo
    └── logo.png              # Logo de cabecera  ⚠️ vacío en repo
```

---

## 🔥 Configuración de Firebase y seguridad

> ✅ **Estado actual:** la migración ya está aplicada. `app.js` ya **no contiene claves reales** — importa `firebaseConfig` desde `./firebase-config.js`, que carga las claves desde `firebase-config.local.js` (gitignored). Las reglas RTDB endurecidas están desplegadas a Firebase prod desde 2026-07-13 (ver `roadmap.md` §0.B).

### Flujo de carga

```
app.js
  └─ import { firebaseConfig } from "./firebase-config.js"
       ├─ si existe firebase-config.local.js → lo usa (claves reales)
       └─ si no, fallback a firebase-config.example.js (placeholders)
```

### Patrón seguro (cómo se creó)

1. **`firebase-config.example.js`** — plantilla con placeholders (`<TU_API_KEY>`, etc.). Se commitea y sirve como fallback de desarrollo sin secretos.
2. **`firebase-config.js`** — loader con `top-level await` + `await import(...)` dinámico que prioriza `.local.js` y cae al `.example.js`. Se commitea.
3. **`firebase-config.local.js`** — gitignored. Contiene las claves reales de tu proyecto. Es el único archivo donde van credenciales.
4. **`app.js`** — `import { firebaseConfig } from "./firebase-config.js";` y `initializeApp(firebaseConfig)`. Nunca tiene claves hardcoded.

### Por qué NO `.env` directamente

Esta es una **webapp estática sin build step**, así que los archivos `.env` (que se leen en servidor) **no son accesibles desde el navegador**. El patrón `firebase-config.local.js` + `.env.example` documenta las variables en formato familiar y deja la puerta abierta a migrar a Cloud Functions (donde `.env` SÍ funciona) sin reescribir nada.

### Privacidad del repositorio

El archivo `.vscode/sftp.json` contiene tu nombre de usuario Windows y la ruta de una clave SSH privada. Aunque `.gitignore` ya lo excluye con `**/.vscode/**`, antes de hacer el repo público **sanea también el JSON** sustituyendo esos datos por placeholders. Detalle en `roadmap.md` → Fase 0.B.

### Si rotacionas las claves en el futuro

1. Firebase Console → *Project settings* → *Your apps* → Web app → **copia los nuevos valores** (apiKey, appId, …).
2. Edita `firebase-config.local.js` y sustituye los valores.
3. Recarga la página en local (`Ctrl+Shift+R`) y comprueba en la consola del navegador que Firebase inicializa sin error.

> 📌 Si Firebase Console sigue rechazando la inicialización, casi siempre es porque la API key tiene **App Check** activado o restricción de dominio/Referer. Revisa la consola Firebase.

---

## 🔐 Reglas de Realtime Database

> ✅ **Estado actual (2026-07-13):** las reglas endurecidas con `auth != null` viven en `database.rules.json` (commit `d5cec7d` chore(rules)) y están **desplegadas a Firebase prod**. Firebase prod evalúa con las reglas nuevas; el emulador local (`?env=emul`) evalúa las mismas reglas (commit `ff37025` chore(dev) habilitó el bloque emulators).

Las reglas en `database.rules.json` están endurecidas con `auth != null` (requieren usuario autenticado para leer y escribir). **Desplegadas a Firebase prod el 2026-07-13** (commit `d5cec7d` + deploy con cuenta Owner de David). El emulador local (`?env=emul`) evalúa las mismas reglas.

- ✅ Validación de esquema: cada item debe tener `nombre` (string no vacío, máx 80) y `comprado` (boolean).
- ✅ `nota` opcional, string de hasta 500 caracteres.
- ✅ Tope blando de 500 items en la colección para evitar abuso (cap de **defensa-en-profundidad** enforzado en `app.js` como `MAX_ITEMS`; el cap server-side original con `newData.numChildren() <= 500` no se pudo activar porque el emulador RTDB v4.11 lo rechaza; la validación de esquema sigue siendo server-side y robusta).
- ✅ Índice en `comprado` para queries eficientes.

> ℹ️ Si necesitas volver a desplegar las reglas en el futuro (p.ej. tras una nueva iteración), los pasos exactos siguen al final de esta sección ("Opción A — Desplegar con firebase-tools"); son los mismos comandos que se ejecutaron el 2026-07-13.

> 🛟 **Auth (Fase 1.A) ya implementado** (commits `f7e327f` feat(auth) + `d5cec7d` chore(rules)). El cap de 500 items sigue client-side (`MAX_ITEMS` en `app.js`) porque el emulador RTDB v4.11 rechazaba `newData.numChildren()`. Con auth, un atacante tendría que registrar cuentas masivamente (cuota Auth del plan gratuito) para mutar datos; el cap client-side complementa como defensa-en-profundidad UX.

### Opción A — Desplegar con `firebase-tools` (CLI, recomendado)

Una sola línea:

```bash
npx firebase-tools login && npx firebase-tools deploy --only database --project shopmate-e9195
```

Eso hace: autenticación OAuth vía navegador + validación + publicación de las reglas.

> ℹ️ **Tras deploy:** los clientes activos con sesión persistida pueden requerir un **refresh duro del navegador** (`Ctrl+Shift+R`) la primera vez que carguen contra las reglas nuevas. El ID token es válido hasta su expiración natural, pero el listener RTDB queda contra el contexto de auth previo (a veces con efecto cache PERMISSION_DENIED). Un reload limpia el cache y vuelve a negociar.

Si quieres probar antes sin tocar producción:

```bash
npx firebase-tools emulators:start --only auth,database --project shopmate-e9195 --import=./emulator-data --export-on-exit
```

… y tus tests contra `localhost:9000` (RTDB) + `localhost:9099` (Auth). Ver `dev-isolation.txt` para el flujo local completo paso a paso.

### Opción B — Pegar manualmente en Firebase Console

1. Abre <https://console.firebase.google.com/project/shopmate-e9195/database/rules>.
2. **Borra** todo el contenido del editor.
3. **Pega** el JSON de `database.rules.json` (de tu copia local).
4. Pulsa **Publicar**.
5. Opcionalmente prueba en la pestaña *Rules Playground* antes de publicar.

### ⚠️ Antes de publicar: valida los datos existentes

Las reglas estrictas pueden **rechazar updates** sobre items preexistentes cuyo esquema no coincida. Antes de Publicar:

1. Ve a Firebase Console → Realtime Database → pestaña **Data**.
2. Comprueba que cada item tiene `nombre` (string no vacío, ≤80) y `comprado` (boolean).
3. Items actuales con `comprado` como string o número tendrán que corregirse a `true/false` antes de que nuevas escrituras funcionen.

### Próximo nivel

**Fase 1.A cerrada** el 2026-07-13 (commits `f7e327f`, `d5cec7d`, `6c488d3`, `ff37025`, `193aaa6`, `3cbebb7`, `4211d5b`). Reglas desplegadas, E2E validado.

Siguiente hito lógico: §1.D **Control de items** (editar/borrar) → §1.E **Familias** — migración profunda de `/items/` a `/families/{familyId}/items/` con script de copia atómica (regla IA #11). Decisión clave de modelo de datos antes de codear (ownership, invitations, multi-membership). Ver `roadmap.md` §1.D y arrancar conversación con la IA.

---

## ☁️ Despliegue en producción

El despliegue está automatizado mediante la extensión **SFTP** de VS Code usando `.vscode/sftp.json`:

```json
{
  "name": "Dvix Server",
  "host": "158.179.223.22",
  "protocol": "sftp",
  "port": 22,
  "username": "ubuntu",
  "privateKeyPath": "c:\\\\Users\\\\David\\\\Downloads\\\\ssh-key-2024-06-11.key",
  "remotePath": "/var/www/html/shopmate",
  "uploadOnSave": true,
  "ignore": [
    "**/.vscode/**",
    "**/.git/**",
    "**/node_modules/**"
  ]
}
```

- Cada vez que guardas un archivo, se sube automáticamente al servidor.
- Ruta remota: `/var/www/html/shopmate` (Nginx/Apache servido como estático).

---

## 🧑‍💻 Uso de la aplicación

1. **Abrir** la URL del sitio (local o producción).
2. En la cabecera se muestra el logo y el título "ShopMate".
3. En el apartado **Lista de Compra Conjunta**:
   - Escribe el nombre del producto en el campo de texto.
   - Pulsa **Añadir** o la tecla `Enter` para añadirlo.
   - Soporta notas opcionales: `Leche (sin lactosa)` → nombre "Leche", nota "sin lactosa".
4. Cada producto aparece con un checkbox grande · pulsa para marcarlo como comprado.
5. Cuando termines la compra, pulsa **Validar compra ✔** para borrar los productos ya comprados.
6. Cualquier persona **autenticada** verá los cambios al instante. Si abres la app sin sesión, el modal "Identifícate" bloquea el UI hasta enviar y pulsar el enlace del correo.

---

## 🗂 Modelo de datos

Colección Firebase RTDB: **`items`**

```json
{
  "items": {
    "-NxYZ123abc": {
      "nombre": "Leche",
      "comprado": false
    },
    "-NxYZ456def": {
      "nombre": "Pan",
      "comprado": true
    }
  }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `_key_` (id) | string | ID autogenerado por `push()` |
| `nombre` | string | Nombre del producto, máx 80 chars |
| `comprado` | boolean | Estado: pendiente (`false`) o comprado (`true`) |
| `nota` (opcional) | string | Nota libre hasta 500 chars |

### Colección `/shared/compras` (Fase 2.A, modo compat hasta §1.E)

```json
{
  "shared": {
    "compras": {
      "-Nx1": {
        "fecha": 1752400000000,
        "items": {
          "-Nx1a": { "nombre": "Leche", "nota": "sin lactosa" },
          "-Nx1b": { "nombre": "Pan" }
        }
      }
    }
  }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `fecha` | number (ms) | `serverTimestamp()` del momento de Validar compra |
| `items` | map | Items que estaban marcados, con sus keys originales preservados |
| `items/{key}/nombre` | string | Copia del nombre al archivar (1..80 chars) |
| `items/{key}/nota` | string? | Copia de la nota si existía (≤500 chars) |

**Cap**: 20 compras máximo, auto-trim client-side (`trimCompras()` en `app.js`). Las más antiguas se eliminan al llegar al límite.

---

## 🎨 Personalización visual

| Elemento | Valor |
|---|---|
| Color principal cabeceras | `#35BDB2` (turquesa) |
| Color títulos h2 | `#205746` (verde oscuro) |
| Color botones | `#28A745` (verde) |
| Color hover botones | `#218838` (verde oscuro) |
| Fondo body | `#efefef` (gris claro) |
| Fondo contenedor | `#ffffff` (blanco) |
| Tipografía body | **Poppins** |
| Tipografía lista | **Caveat** |

---

## 🆘 Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla en blanco | `index.html` vacío (estado actual) | Restaurar con `git checkout 4f15c99 -- <archivo>` |
| `Firebase: No Firebase App '[DEFAULT]' has been created` | `firebase-config.local.js` falta o tiene placeholders | Crear `firebase-config.local.js` desde `firebase-config.example.js` con claves reales |
| Firebase: error de CORS | Servidor local abierto con `file://` | Usar `python -m http.server` |
| Datos no se sincronizan | Reglas RTDB recién endurecidas pueden rechazar items mal formados | Revisar *Rules* en Firebase Console y los logs del navegador |
| 403 al subir vía SFTP | Clave SSH caducada | Renovar clave y actualizar `privateKeyPath` |
| Estilos CSS no cargan | Ruta incorrecta a `main.css` | Verificar `<link>` en `index.html` |
| Drawer del menú no se cierra en mobile | Drawer a 88vw cubría el botón ☰ y backdrop demasiado estrecho para tap | HECHO 2026-07-13: botón ✕ cerrar (44px) dentro del drawer, header sticky, drawer a 82vw en <480px |

---

## 📜 Licencia

Privado · Todos los derechos reservados a David Escutia de Haro.

---

> 🛟 Para contexto rápido o reglas que debe seguir la IA, consulta [`contexto.md`](./contexto.md) e [`instrucciones_ai.md`](./instrucciones_ai.md). Las mejoras planeadas están en [`roadmap.md`](./roadmap.md).
