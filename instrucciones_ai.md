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
| 01 | **Firebase / Backend** | La configuración Firebase **no vive en `app.js`**: `app.js` debe importar `firebaseConfig` desde `./firebase-config.js`. Las claves reales van **solo** a `firebase-config.local.js`, que está en `.gitignore`. Nunca commitees claves. Para endurecer RTDB modifica `database.rules.json`. Despliegue de reglas se hace con `npx firebase-tools deploy --only database` (requiere login OAuth del usuario). | 2026-07-12 |
| 02 | **Native wrapper** | **Capacitor** está **permitido exclusivamente** como wrapper de la app Android/iOS. Instalar `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` y plugins solo si la tarea requiere comportamiento nativo real (push, splash, biometric, deep links, Play Store). Esto introduce build step **solo en el subdir `android/`** generado por `npx cap init`. El código web (`index.html`, `app.js`, `main.css`, `firebase-config*`) permanece en HTML+CSS+JS puro sin build step y **NO** debe usar Capacitor ni sus APIs. Antes de proponer Capacitor, confirmar con David. | 2026-07-12 |
| 03 | **Calidad** | **Modulariza al máximo**: cada módulo/función con responsabilidad única. **Aísla errores**: un fallo en una parte no debe propagarse silenciosamente a otra. Encapsular cada bloque crítico en su propia función con try/catch cuando sea sensato, y devolver información útil al log en vez de tragar la excepción. Si añades una feature, partir `app.js` en módulos (`render.js`, `popup.js`, `firebase-init.js`, …) — discusión con IA previa antes de crear nuevos files. | 2026-07-12 |
| 04 | **Calidad / Debug** | **Añade logs de debug sistemáticos en funciones críticas** con prefijo de módulo y nivel (`console.log` informativo, `console.warn` recuperación, `console.error` fallo). Prefijos sugeridos: `[firebase]`, `[render]`, `[add]`, `[validator]`, `[popup]`, `[processor]`. Los usuarios podrán silenciarlos con `localStorage.setItem('shopmate:debug', '0')` (definir wrapper `log/warn/logerr` al inicio del módulo). Nunca quitar un log ya añadido sin justificarlo; son la primera fuente de diagnóstico. | 2026-07-12 |
| 05 | **Git / Commit discipline** | **Hacer commit ANTES de tocar algo importante o que pueda cambiar el funcionamiento de la app**. Si vas a modificar lógica de negocio, migrar esquema RTDB, refactorizar un módulo entero, aplicar un fix crítico o empezar una nueva fase, primero confirma que el último commit está limpio (`git status --short` debe mostrar solo lo que tú vas a tocar) y, si lo está, haz un commit de checkpoint. La idea: tener siempre un punto de retorno discoverable antes de cada cambio de peso. Para cambios puramente cosméticos (whitespace, comentarios, typoes) este commit previo es **opcional**. | 2026-07-12 |
| 06 | **Documentación** | **Al final de cada petición del usuario, como último paso, revisar y actualizar `README.md`, `contexto.md` y `roadmap.md`** si han quedado desfasados respecto al estado real del código o los planes. Criterios para saber si hay que tocar: (a) cambió la arquitectura, el stack o el modelo de datos → refleja; (b) se añadieron/quitaron features planificadas → marca casillas en `roadmap.md`; (c) la IA añadió una regla nueva en este archivo → comprobar que esté bien categorizada y numerada; (d) cambió el flujo de uso → actualiza la sección de Uso en `README.md`. Documentar devoluciones al usuario si decides NO tocar nada (porque ya estaba al día). | 2026-07-12 |

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
2. ❌ **No añadir un build step al código web** (Webpack, Vite, Rollup, npm) sin acuerdo. *Sí está permitido el build step en `android/` cuando uses Capacitor.*
3. ❌ **No añadir dependencias web** (`package.json`, `node_modules` en la raíz para webpack/vite/etc.) salvo que David lo solicite. *Las dependencias de Capacitor viven **solo** dentro del subdir `android/`.*
4. ❌ **No tocar `.vscode/sftp.json`** ni credenciales de despliegue.
5. ❌ **No commitear claves reales** de Firebase. Solo se commitean `firebase-config.example.js` (placeholders) y `firebase-config.js` (loader). Las claves reales van en `firebase-config.local.js`, que está gitignored.
6. ❌ **No relajar las RTDB rules** propuestas en `database.rules.json` — al contrario, proponer endurecerlas si David lo pide.
7. ❌ **No renombrar archivos** del proyecto sin confirmar. *Especialmente `index.html`, `app.js`, `main.css` — son referenciados por el wrapper Capacitor y romperían el APK.*
8. ❌ **No borrar commits del historial git** (no usar `reset --hard` ni `rebase` destructivo).
9. ❌ **No subir al servidor de producción** sin que David confirme.
10. ❌ **No exponer** rutas personales (`c:\Users\David\…`, claves SSH, IPs internas, tokens) en archivos versionados. Antes de hacer el repo público, **sustituir** cualquier dato sensible de `.vscode/sftp.json` u otros configs por placeholders.
11. ❌ **No exponer el esquema de datos legacy `/items/` directo** a usuarios autenticados en Fase 1+: el listado debe moverse a `/families/{familyId}/items/`. Para migración: usar un script de copia atómica (leer todo, escribir nuevo, borrar viejo) antes de endurecer las rules. Cuando se haga, **avisar antes** porque afecta a todos los usuarios activos.
12. ❌ **No usar `@capacitor/*` APIs en `app.js`** ni en ningún archivo del directorio raíz. Si una tarea requiere APIs nativas, aislar esa parte en el subdir `android/` o en un plugin nativo dedicado que se comunique por mensajes (`@capacitor/core` Messages API).

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
   - En Fase 1+ se añadirán nuevos selectores para auth, profile y families; **mantener los anteriores** sin renombrarlos para no romper compat.
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
- Native wrapper (Capacitor)
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

### #11 (2026-07-12)

> **Regla retirada:** "No introducir Capacitor en el código web". **Motivo:** consolidada en regla activa #02, que cubre el mismo principio con más detalle y matiz (build step solo en `android/`, no en raíz web). Borrada para evitar duplicación y confusión.
