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
7. [Configuración de Firebase](#-configuración-de-firebase)
8. [Despliegue en producción](#-despliegue-en-producción)
9. [Uso de la aplicación](#-uso-de-la-aplicación)
10. [Modelo de datos](#-modelo-de-datos)
11. [Personalización visual](#-personalización-visual)
12. [Solución de problemas](#-solución-de-problemas)

---

## 🧾 Descripción

**ShopMate** es una webapp ligera (HTML + CSS + JS puro, sin frameworks ni build step) pensada para que varias personas puedan añadir productos a una misma lista de la compra y marcarlos como comprados en tiempo real desde cualquier dispositivo con navegador. La conversión a PWA completa (manifest + service worker + offline) está planificada en `roadmap.md` → Fase 2.

Toda la información se sincroniza a través de **Firebase Realtime Database**, de modo que cualquier cambio (añadir, marcar o eliminar) se refleja al instante en todos los clientes conectados.

---

## ⚠️ Estado actual del proyecto

> **Importante:** los archivos `app.js`, `index.html`, `main.css` y los recursos de `assets/` actualmente se encuentran **vacíos (0 bytes)** en el directorio de trabajo. Esto fue provocado por un commit de "limpieza" (`d4ecc06`) que sobrescribió los archivos con contenido vacío.
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
| Autenticación | No implementada (uso compartido sin login) |

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
├── README.md              # Esta guía
├── contexto.md            # Resumen ejecutivo (para la IA)
├── instrucciones_ai.md    # Reglas que debe seguir la IA
├── roadmap.md             # Hoja de ruta de mejoras futuras
├── index.html             # Página principal (renombrada desde list.html)
├── app.js                 # Lógica + integración Firebase
├── main.css               # Estilos
└── assets/
    ├── icon.ico           # Favicon  ⚠️ está vacío (0 bytes) en el repo
    └── logo.png           # Logo de cabecera  ⚠️ está vacío (0 bytes) en el repo
```

---

## 🔥 Configuración de Firebase

> ⚠️ **Crítico — seguridad:** la configuración Firebase está actualmente **embebida en `app.js`**. Si el repo pasa a ser público, **mueve las claves a un archivo ignorado** (`firebase-config.local.js` + `.gitignore`) antes del primer push. Más detalles en `roadmap.md` → Fase 0.

> ⚠️ **Privacidad del repositorio:** el archivo `.vscode/sftp.json` contiene tu nombre de usuario Windows (`c:\Users\David\Downloads\...`) y la ruta de una clave SSH privada. Aunque `.gitignore` actual excluye `**/.vscode/**`, antes de hacer el repo público **sanea** el archivo sustituyendo esos datos por placeholders. Detalle en `roadmap.md` → Fase 0.B.

El proyecto se conecta al proyecto Firebase **`shopmate-e9195`**. La configuración vive en `app.js`:

```js
const firebaseConfig = {
  apiKey: "<API_KEY>",
  authDomain: "shopmate-e9195.firebaseapp.com",
  databaseURL: "https://shopmate-e9195-default-rtdb.firebaseio.com",
  projectId: "shopmate-e9195",
  storageBucket: "shopmate-e9195.appspot.com",
  messagingSenderId: "<SENDER_ID>",
  appId: "<APP_ID>",
  measurementId: "<MEASUREMENT_ID>"
};
```

> ⚠️ **Nunca** subas las claves reales al repositorio público. Usa variables de entorno o un archivo `firebase-config.js` ignorado por `.gitignore`.

### Reglas de seguridad mínimas (RTDB)

```json
{
  "rules": {
    "items": {
      ".read":  true,
      ".write": true
    }
  }
}
```

> Estas reglas son **abiertas**: cualquier persona con la URL puede escribir. Se deben endurecer antes de exponer el proyecto (ver `roadmap.md`).

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
  "privateKeyPath": "c:\\Users\\David\\Downloads\\ssh-key-2024-06-11.key",
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
4. Cada producto aparece con un checkbox grande · pulsa para marcarlo como comprado.
5. Cuando termines la compra, pulsa **Validar compra ✔** para borrar los productos ya comprados.
6. Cualquier persona con la URL verá los cambios al instante.

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
| `nombre` | string | Nombre del producto |
| `comprado` | boolean | Estado: pendiente (`false`) o comprado (`true`) |

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
| Firebase: error de CORS | Servidor local abierto con `file://` | Usar `python -m http.server` |
| Datos no se sincronizan | Reglas RTDB mal configuradas | Revisar la pestaña *Rules* en Firebase Console |
| 403 al subir vía SFTP | Clave SSH caducada | Renovar clave y actualizar `privateKeyPath` |
| Estilos CSS no cargan | Ruta incorrecta a `main.css` | Verificar `<link>` en `index.html` |

---

## 📜 Licencia

Privado · Todos los derechos reservados a David Escutia de Haro.

---

> 🛟 Para contexto rápido o reglas que debe seguir la IA, consulta [`contexto.md`](./contexto.md) e [`instrucciones_ai.md`](./instrucciones_ai.md). Las mejoras planeadas están en [`roadmap.md`](./roadmap.md).
