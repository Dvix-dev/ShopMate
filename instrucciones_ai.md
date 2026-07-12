# 🤖 Instrucciones para la IA — ShopMate

> Archivo **vivo**: aquí se añadirán, con el tiempo, las reglas explícitas que el usuario le indique a la IA (estilo de código, prompt patterns, decisiones permitidas, cosas a evitar, etc.).
>
> La IA debe **leer este archivo al inicio de cada sesión** y respetar todas las reglas activas marcadas como ✅. Las reglas en 🟡 son opcionales o pendientes de confirmación.

---

## 📌 Cómo usar este archivo

1. El usuario (David) añadirá reglas en futuras sesiones escribiendo frases como:
   - *"De aquí en adelante, antes de tocar un archivo, nómbramelo y espera mi OK."*
   - *"Nunca uses jQuery."*
   - *"Las funciones de Firebase deben vivir en `app.js`, no en archivos separados."*
2. La IA transformará cada instrucción en una entrada numerada dentro de la sección que corresponda.
3. Las reglas obsoletas se mueven a la sección "🗄 Reglas retiradas" para histórico.

> 🌍 **Idioma**: este archivo íntegramente en español. La IA debe contestar al usuario en español. Si David escribe en inglés, la IA puede pasarse al inglés y volver a español cuando él lo haga.

---

## 🟢 Reglas activas

> *(Sección reservada. Aún no hay reglas explícitas del usuario. Se irán añadiendo a medida que David los comunique.)*

| # | Categoría | Regla | Fecha de alta |
|---|---|---|---|
| 00 | **Git** | Antes de un commit, si `git diff` muestra un archivo pasando de N líneas a 0, abortar el commit y preguntar a David antes de confirmar. | 2026-07-12 |
| 01 | **Firebase / Backend** | La configuración Firebase **no vive en `app.js`**: `app.js` debe importar `firebaseConfig` desde `./firebase-config.js`. Las claves reales van **solo** a `firebase-config.local.js`, que está en `.gitignore`. Nunca commitees claves. Para endurecer RTDB modifica `database.rules.json`. | 2026-07-12 |

---

## 🟡 Reglas pendientes de confirmación

| # | Categoría | Propuesta | Estado |
|---|---|---|---|
| — | — | *(vacío)* | — |

> 🟡 Aquí también se apuntan decisiones "entre A y B" que David mencione pero no confirme todavía.

---

## 🚫 Cosas que la IA NO debe hacer sin permiso explícito

> Estas son **límites duros**. Ante la duda, la IA pregunta antes de actuar.

1. ❌ **No introducir frameworks** (React, Vue, Svelte, jQuery, etc.) sin que David lo pida.
2. ❌ **No añadir un build step** (Webpack, Vite, Rollup, npm) sin acuerdo.
3. ❌ **No añadir dependencias** (`package.json`, `node_modules`) salvo que David lo solicite.
4. ❌ **No tocar `.vscode/sftp.json`** ni credenciales de despliegue.
5. ❌ **No commitear claves reales** de Firebase. Solo se commitean `firebase-config.example.js` (placeholders) y `firebase-config.js` (loader). Las claves reales van en `firebase-config.local.js`, que está gitignored.
6. ❌ **No relajar las RTDB rules** propuestas en `database.rules.json` — al contrario, proponer endurecerlas si David lo pide.
7. ❌ **No renombrar archivos** del proyecto sin confirmar.
8. ❌ **No borrar commits del historial git** (no usar `reset --hard` ni `rebase` destructivo).
9. ❌ **No subir al servidor de producción** sin que David confirme.
10. ❌ **No exponer** rutas personales (`c:\Users\David\…`, claves SSH, IPs internas, tokens) en archivos versionados. Antes de hacer el repo público, **sustituir** cualquier dato sensible de `.vscode/sftp.json` u otros configs por placeholders.

---

## ✅ Buenas prácticas por defecto (pre-aprobadas)

Estas prácticas se consideran **autorizadas** sin necesidad de pedir permiso caso por caso:

1. ✅ Usar **ES Modules** (`import`/`export`).
2. ✅ Mantener CSS en **`main.css`** salvo que David diga lo contrario.
3. ✅ Mantener el **idioma español** en UI y mensajes.
4. ✅ Usar los **hex de color** ya definidos en `contexto.md`.
5. ✅ Comentar el código en español o español/inglés (evitar chino, japonés, etc.).
6. ✅ Respetar la **estructura del DOM** actual:
   - `#checklist` es el **contenedor `<form>`** donde la IA pinta los items.
   - `#item-input` es el input de texto.
   - `#add-btn` añade.
   - `#validar-btn` borra los marcados.
7. ✅ Antes de implementar cambios grandes, **proponer un plan con `write_todos`** y mostrarlo a David.
8. ✅ Antes de implementar, **dar un aviso claro** si un cambio puede romper la sincronización en tiempo real.
9. ✅ Al restaurar archivos con `git checkout`, **avisar primero** de que el guardado activará `uploadOnSave` (SFTP).

---

## 🛠 Plantillas de reglas

Cuando David diga algo como:
- *"Nunca hagas X"* → regla en `🚫 Cosas que la IA NO debe hacer`.
- *"Siempre haz Y"* → regla en `✅ Buenas prácticas`.
- *"Para este tipo de cosa prefiero approach Z"* → regla en `🟢 Reglas activas` con categoría.
- *"Estoy dudando entre A y B"* → regla en `🟡 Reglas pendientes de confirmación`.

### Categorías típicas

- Lenguaje / Framework
- Estilo de código
- Estilo visual / UI
- Firebase / Backend
- Git / Despliegue
- Comunicación con el usuario
- Pruebas
- Documentación

### Formato sugerido

```markdown
| ## | **<Categoría>** | <Regla en una frase clara> | <YYYY-MM-DD> |
```

---

## 🗄 Reglas retiradas

> Histórico. No se borran, se mueven aquí para memoria. Indicar fecha y motivo de retirada.

*(vacío todavía — la IA nunca ha retirado una regla)*
