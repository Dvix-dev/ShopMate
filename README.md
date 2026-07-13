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

## ⚠️ Estado actual del proyecto

> **Importante:** los archivos `app.js`, `index.html`, `main.css` y los recursos de `assets/` actualmente se encuentran **vacíos (0 bytes)** en el directorio de trabajo por un commit de "limpieza" (`d4ecc06`) que sobrescribió los archivos con contenido vacío.
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
- 🧪 **Aislamiento dev/prod**: ver `dev-isolation.txt` para 3 caminos (emulador / proyecto Firebase paralelo / staging SFTP).

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

> **Nota:** si abres el `index.html` directamente con doble clic (`file://`) algunas funciones como los módulos ES y la conexión a Firebase pueden fallar. Usa siempre un servidor local.

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
├── dev-isolation.txt         # 3 caminos para aislar entorno dev del familiar de producción
├── firebase-config.example.js  # Plantilla con placeholders (commiteada, Segura)
├── firebase-config.js        # Loader que prefiere .local.js y cae al .example.js
├── firebase-config.local.js  # ⚠️ NO COMMITEAR · Contiene tus claves reales (gitignored)
├── database.rules.json       # Reglas RTDB endurecidas (pendiente de deploy con firebase-tools)
├── firebase.json             # Config de firebase-tools (apunta a database.rules.json)
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

> ✅ **Estado actual:** la migración ya está aplicada. `app.js` ya **no contiene claves reales** — importa `firebaseConfig` desde `./firebase-config.js`, que carga las claves desde `firebase-config.local.js` (gitignored). Queda como **único paso pendiente** desplegar las reglas endurecidas a Firebase (requiere login interactivo).

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

> ⚠️ **Estado actual:** las reglas endurecidas están en `database.rules.json` y el proyecto tiene el setup de `firebase-tools` listo (`firebase.json` + `.firebaserc`). Pero **NO se han desplegado todavía a Firebase** — eso requiere `firebase login` con tu cuenta de Google y es un paso interactivo que debes ejecutar tú.

Las reglas actuales del proyecto son abiertas (`.read: true, .write: true`). Esto significa que **cualquier persona con la URL puede escribir**. En `database.rules.json` se incluye una propuesta endurecida:

- ✅ Validación de esquema: cada item debe tener `nombre` (string no vacío, máx 80) y `comprado` (boolean).
- ✅ `nota` opcional, string de hasta 500 caracteres.
- ✅ Tope blando de 500 items en la colección para evitar abuso (cap de **defensa-en-profundidad** enforzado en `app.js` como `MAX_ITEMS`; el cap server-side original con `newData.numChildren() <= 500` no se pudo activar porque el emulador RTDB v4.11 lo rechaza; la validación de esquema sigue siendo server-side y robusta).
- ✅ Índice en `comprado` para queries eficientes.

> 🛟 **Por qué `.write: true` y el cap se quedó en el cliente**: cuando llegue **Firebase Authentication** en Fase 1.A migramos a `auth != null`. Hasta entonces, la única defensa real era la validación de esquema (un atacante con cliente custom se saltaría cualquier cap server-side igualmente). Un cap client-side cubre el uso honesto y se documenta explícitamente como defensa-en-profundidad UX.

### Opción A — Desplegar con `firebase-tools` (CLI, recomendado)

Una sola línea:

```bash
npx firebase-tools login && npx firebase-tools deploy --only database --project shopmate-e9195
```

Eso hace: autenticación OAuth vía navegador + validación + publicación de las reglas. Si quieres probar antes sin tocar producción:

```bash
npx firebase-tools emulators:start --only database --project shopmate-e9195
```

… y tus tests contra `localhost:9000`.

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

### Próximo nivel (recomendado)

Ver `roadmap.md` → Fase 1: migrar a **Firebase Authentication** con magic link por email y exigir `auth != null` en `.write`. Mientras no haya auth, las reglas aquí propuestas son una mejora razonable sobre el open-access actual.

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

---

## 📜 Licencia

Privado · Todos los derechos reservados a David Escutia de Haro.

---

> 🛟 Para contexto rápido o reglas que debe seguir la IA, consulta [`contexto.md`](./contexto.md) e [`instrucciones_ai.md`](./instrucciones_ai.md). Las mejoras planeadas están en [`roadmap.md`](./roadmap.md).
