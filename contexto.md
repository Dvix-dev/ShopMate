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
- **Auth**: Activa desde Fase 1.A — Firebase Authentication con email magic link (passwordless, sin contraseñas). _Implementada y desplegada el 2026-07-13_ (commits `f7e327f` feat(auth) + `d5cec7d` chore(rules)). Las reglas RTDB endurecidas con `auth != null` están desplegadas a Firebase prod; el emulador local (`?env=emul`) usa las mismas reglas. Ver `roadmap.md` → 1.A.
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
- Cuando aterrice §1.D Familias, este path se migra atómicamente a `/families/{fid}/compras/` per regla IA #11.

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
