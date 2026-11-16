# ⚙️ Página de Ajustes de usuario — pasos para crear los nodos («tablas») en RTDB

> **Estado: documento de diseño.** Todavía no existe pantalla de ajustes: esto es la guía para crear el modelo de datos, las reglas y el orden de implementación.
> Alcance: **apodo**, **gestión de familia**, **ajustes personales** (tamaño de letra, temas) y **eliminación de cuenta** (RGPD).
> Complementa `roadmap.md` §1.B (perfiles), §1.C (ajustes locales), §1.E (familias) y la sección «Seguridad y privacidad». Respeta `instrucciones_ai.md`, en especial la regla **#11** (migración atómica antes de exponer `/families/`).

---

## 0. Antes de empezar: en RTDB no existe `CREATE TABLE`

Realtime Database es **un único árbol JSON**: no hay tablas, ni columnas, ni migraciones de esquema. «Crear una tabla» aquí significa siempre lo mismo:

1. **Decidir ruta y campos** (`/users/{uid}`, `/families/{fid}`, …) con su tipo y su tamaño máximo.
2. **Escribir un hijo semilla**: en RTDB un nodo sin hijos *no existe* (se elimina solo). Hasta que alguien escribe, `snapshot.exists()` es `false`.
3. **Declarar reglas** (`.read`, `.write`, `.validate`) en `database.rules.json`.
4. **Declarar `.indexOn`** si vas a filtrar/ordenar por un campo (evita descargar el nodo entero).
5. **Desplegar las reglas** con `npx firebase-tools deploy --only database` (nunca por SFTP) y probarlas en el emulador.

El cliente solo lee y escribe; **toda la validación vive en las reglas del servidor**.

---

## 1. Modelo propuesto (árbol completo)

```
/users/{uid}                              ← «tabla» de perfil + ajustes personales
  apodo:        string (1..40)            ← lo que hoy es Auth.displayName
  email:        string?                   ← informativo (la verdad está en Firebase Auth)
  createdAt:    number (ms)
  prefs: {
    fontScale:  'sm' | 'md' | 'lg' | 'xl'
    theme:      'light' | 'dark' | 'auto'
    reduceMotion: boolean
  }
  familias/{fid}: { role, joinedAt }      ← índice inverso: a qué familias pertenezco

/families/{fid}                           ← «tabla» de familia (lista compartida)
  nombre:    string (1..40)
  owner:     uid
  createdAt: number (ms)
  members/{uid}: { apodo, role: 'owner'|'admin'|'member', joinedAt }
  invites/{token}: { createdAt, expiresAt, role }
  items/{itemId}:   { nombre, comprado, nota?, sortIndex? }   ← mismo schema que /items/
  compras/{compraId}: { fecha, items }                        ← mismo schema que /shared/compras/
```

### Decisiones de diseño (importantes)

- **El `apodo` se copia** en `families/{fid}/members/{uid}/apodo`. No es duplicación gratuita: las reglas de `/users/{uid}` solo permiten leer al dueño, así que otros miembros no pueden resolver tu apodo desde `/users/`. Sin la copia, la lista de miembros no tendría nombre que mostrar.
- **`prefs` va en el perfil**, no en `/families/`: el tamaño de letra y el tema son del usuario, no de la familia. Para que el arranque sea instantáneo se cachea también en `localStorage` (`shopmate:settings`); RTDB es la fuente de verdad al iniciar sesión.
- **`familias/{fid}` dentro de `/users/{uid}`** es el índice inverso para pintar «mis familias» sin descargar el árbol de familias entero.
- **`items` y `compras` no cambian de schema**: se reutiliza lo que ya existe en `/items/` y `/shared/compras/`, solo cambia la ruta padre. La migración (regla #11) se hace en el paso 8.

---

## 2. Paso a paso

### Paso 1 — Crear los nodos semilla

Sin datos, los nodos no existen y las reglas no se pueden probar. Desde **Firebase Console → Realtime Database → Data**, o desde la app en desarrollo:

```js
// Semilla mínima de un usuario (una sola vez por uid, al registrarse)
await set(ref(db, 'users/' + uid), {
  apodo: 'David',
  createdAt: Date.now(),
  prefs: { fontScale: 'md', theme: 'light', reduceMotion: false }
});
```

> ⚠️ No crear nodos «vacíos» (`{}`): RTDB los descarta. Cada nodo debe tener al menos un hijo real.

### Paso 2 — Crear el índice de pertenencia al crear una familia

```js
const fid      = push(ref(db, 'families')).key;
const multiUpdate = {};
multiUpdate['families/' + fid + '/nombre']    = 'Casa';
multiUpdate['families/' + fid + '/owner']     = uid;
multiUpdate['families/' + fid + '/createdAt'] = Date.now();
multiUpdate['families/' + fid + '/members/' + uid] = { apodo, role: 'owner', joinedAt: Date.now() };
multiUpdate['users/' + uid + '/familias/' + fid]   = { role: 'owner', joinedAt: Date.now() };
await update(ref(db), multiUpdate);   // multipath: todo o nada
```

### Paso 3 — Reglas: `database.rules.json`

Añadir dentro del objeto `rules`, junto a los nodos actuales `items` y `shared`:

```json
"users": {
  "$uid": {
    ".read":  "auth != null && auth.uid == $uid",
    ".write": "auth != null && auth.uid == $uid",

    "apodo":     { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" },
    "email":     { ".validate": "!newData.exists() || newData.isString()" },
    "createdAt": { ".validate": "newData.isNumber() && newData.val() > 0" },

    "prefs": {
      "fontScale":    { ".validate": "newData.isString() && (newData.val() == 'sm' || newData.val() == 'md' || newData.val() == 'lg' || newData.val() == 'xl')" },
      "theme":        { ".validate": "newData.isString() && (newData.val() == 'light' || newData.val() == 'dark' || newData.val() == 'auto')" },
      "reduceMotion": { ".validate": "newData.isBoolean()" },
      "$other":       { ".validate": false }
    },

    "familias": {
      "$fid": {
        "role":     { ".validate": "newData.isString() && (newData.val() == 'owner' || newData.val() == 'admin' || newData.val() == 'member')" },
        "joinedAt": { ".validate": "newData.isNumber()" }
      }
    }
  }
},

"families": {
  "$fid": {
    ".read":  "auth != null && root.child('families').child($fid).child('members').child(auth.uid).exists()",
    ".write": "auth != null && (!data.exists() || data.child('owner').val() == auth.uid || root.child('families').child($fid).child('members').child(auth.uid).child('role').val() == 'admin')",

    "nombre":    { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" },
    "owner":     { ".validate": "newData.isString() && newData.val().length > 0" },
    "createdAt": { ".validate": "newData.isNumber() && newData.val() > 0" },

    "members": {
      "$uid": {
        "apodo":    { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" },
        "role":     { ".validate": "newData.isString() && (newData.val() == 'owner' || newData.val() == 'admin' || newData.val() == 'member')" },
        "joinedAt": { ".validate": "newData.isNumber()" }
      }
    },

    "invites": {
      "$token": { ".validate": "newData.hasChildren(['createdAt', 'expiresAt', 'role'])" }
    },

    "items": {
      "$itemId": { ".validate": "newData.hasChildren(['nombre', 'comprado'])" }
    },

    "compras": {
      "$compraId": { ".validate": "newData.hasChildren(['fecha', 'items'])" }
    }
  }
}
```

**Trampas de las reglas RTDB que cuestan tiempo:**

- Las reglas **no filtran**: si concedes `.read` en `/families`, se hereda a todo lo de dentro. Por eso `.read` está en `$fid` y `/families` no tiene regla (deny por defecto).
- No existe `newData.numChildren()` en el motor real (falló en el deploy del 2026-07-13). Los caps de cantidad se hacen client-side, como `MAX_ITEMS`.
- `$uid` solo necesita existir si lo referencias en la regla; aquí es el propio `auth.uid`.
- Al cambiar el rol de alguien a `member`, ese user sigue pudiendo escribir en `members/$uid` porque `.write` está en niveles superiores: para impedirlo, mueve cada miembro a un nodo con su propia regla o valida con `$uid` en el `.write`.

### Paso 4 — Índices (solo si consultas por campo)

```json
"families": {
  "$fid": {
    "items":    { ".indexOn": ["comprado"] },
    "compras":  { ".indexOn": ["fecha"] }
  }
}
```

Sin `.indexOn`, filtrar por `fecha` obliga a descargar todas las compras y avisa en consola (`Using an unspecified index`).

### Paso 5 — Desplegar las reglas

```bash
npx firebase-tools deploy --only database
```

Requiere el login OAuth de David (`firebase login`). **Nunca** se despliegan reglas por SFTP, y el archivo `firebase.json` ya apunta a `database.rules.json`.

### Paso 6 — Probar en el emulador antes de tocar producción

```bash
# Terminal 1
firebase emulators:start --only database,auth

# Terminal 2 (sirve la app en HTTP, requisito del emulador Auth)
python -m http.server 8080
```

Abrir `http://localhost:8080/?env=emul` (siempre HTTP, nunca HTTPS: `connectAuthEmulator` rechaza HTTPS con `auth/invalid-emulator-scheme`).

Comprobaciones mínimas:

- [ ] `users/{uid}` solo se puede leer/escribir con ese `uid`.
- [ ] Un miembro puede leer `families/{fid}`; alguien que no es miembro recibe `PERMISSION_DENIED`.
- [ ] `apodo` de 0 caracteres y de 41 caracteres dan error de validación.
- [ ] `theme: 'neon'` da error de validación.
- [ ] Guardar solo `apodo` no borra `prefs` (usa `update`, no `set`).

### Paso 7 — Capa cliente en `app.js`

Los ajustes no necesitan archivos nuevos (regla #03: módulos solo con acuerdo previo). Patrón a seguir, pegado junto al bloque de auth:

```js
// Guardar un ajuste (merge: no pisa el resto de prefs)
async function savePref(uid, patch) {
  try {
    await update(ref(db, 'users/' + uid + '/prefs'), patch);
    log('[prefs] save OK', patch);
  } catch (err) {
    logerr('[prefs] save ERROR', err && err.code);
    showToast('No pudimos guardar el ajuste.', { type: 'error' });
  }
}

// Cargar perfil al iniciar sesión (dentro de onAuthStateChanged, user != null)
async function loadProfile(uid) {
  try {
    const snap = await get(ref(db, 'users/' + uid));
    const perfil = snap.val() || {};
    applyPrefs(perfil.prefs || {});
    if (menuProfileEmailEl) menuProfileEmailEl.textContent = perfil.apodo || (auth.currentUser && auth.currentUser.email) || '—';
  } catch (err) {
    logerr('[profile] load ERROR', err && err.code);
  }
}

// Los ajustes visuales se aplican como atributos en <html> y los resuelve el CSS
function applyPrefs(prefs) {
  const root = document.documentElement;
  root.dataset.theme     = prefs.theme     || 'light';
  root.dataset.fontScale = prefs.fontScale || 'md';
  root.dataset.reduceMotion = prefs.reduceMotion ? 'true' : 'false';
  try { localStorage.setItem('shopmate:settings', JSON.stringify(prefs)); } catch { /* modo privado */ }
}
```

En `main.css`, los ajustes se consumen con variables (sin duplicar reglas):

```css
html[data-font-scale="sm"] { font-size: 14px; }
html[data-font-scale="lg"] { font-size: 18px; }
html[data-font-scale="xl"] { font-size: 20px; }
```

> La lista usa `Caveat` con tamaños en px (`#checklist { font-size: 20px }`): si el tamaño de letra debe afectarle, hay que pasar esos valores a `rem`. Es un cambio visual, así que va aparte de este documento.

### Paso 8 — Migrar los datos actuales (regla #11)

Antes de que la app lea de `/families/{fid}/items`, hay que mover los datos sin perder nada:

1. Leer **todo** `/items` y `/shared/compras` con `get()`.
2. Crear la familia `default` con el owner actual y un miembro por cada cuenta que use la app.
3. Escribir en `/families/{fid}/items` y `/families/{fid}/compras` en **una sola** operación multipath.
4. Verificar conteos (`snapshot.size` origen == destino) antes de borrar `/items`.
5. Borrar el nodo legacy y actualizar las reglas (quitar `items` y `shared` del root).
6. Avisar a los usuarios **antes** del corte: cualquier cliente con la versión antigua cacheada seguirá escribiendo en `/items`.

### Paso 9 — Eliminar la cuenta (RGPD)

Orden obligatorio, porque el último paso deja al usuario sin credenciales:

1. **Confirmación explícita** en la UI (escribir `ELIMINAR` o doble confirmación).
2. **Reautenticar** (Firebase exige login reciente; si no, `auth/requires-recent-login`):
   ```js
   import { EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
   await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password));
   ```
3. **Resolver la familia**: si es owner y hay más miembros, transferir `owner` y `members/{uid}/role` a otro, o borrar la familia entera si se queda solo.
4. **Borrar los datos del usuario**: `remove(ref(db, 'users/' + uid))` y quitar `families/{fid}/members/{uid}` + `users/{otroUid}/familias/{fid}` de cada miembro (multipath).
5. **Borrar la cuenta de Auth**: `await deleteUser(auth.currentUser)`.
6. **Limpiar el cliente**: `localStorage.removeItem('shopmate:settings')` y `signOut(auth)`.

Notas de cumplimiento:

- Ofrecer también **exportación** de datos (descarga JSON de `/users/{uid}` + familias donde participa) antes de borrar: es la otra mitad del derecho de portabilidad.
- El historial de compras de una familia **no se borra** al eliminar una cuenta: pertenece a la familia, no al usuario. Si se quiere anonimizar, quitar `boughtBy`/`addedBy` cuando existan.
- El borrado es **irreversible**: no implementarlo con undo toast.

---

## 3. Orden de implementación recomendado

| Orden | Bloque | Depende de |
|---|---|---|
| 1 | `/users/{uid}` + apodo (paso 1 y 3) | — |
| 2 | Ajustes `prefs` (tamaño de letra + tema) con cache local | 1 |
| 3 | `/families/{fid}` + miembros + índice inverso | 1 |
| 4 | Migración de `/items` a `/families/{fid}/items` | 3 |
| 5 | Invitaciones (`invites/{token}`) | 3 |
| 6 | Eliminar cuenta + exportación (RGPD) | 1–5 |

---

## 4. Checklist de aceptación

- [ ] Las reglas están desplegadas (`npx firebase-tools deploy --only database`) y el archivo commiteado coincide con producción.
- [ ] `/users/{uid}` no es legible por otro usuario (probado con dos cuentas en el emulador).
- [ ] `/families/{fid}` no es legible por alguien que no es miembro.
- [ ] Guardar `prefs` no borra `apodo` ni `createdAt` (uso de `update`).
- [ ] Cambiar tema/tamaño de letra persiste tras recargar y en otro dispositivo del mismo usuario.
- [ ] La pantalla de ajustes es accesible desde el drawer (sección «Ajustes», hoy placeholder).
- [ ] Eliminar cuenta funciona con reautenticación, deja RTDB limpio y permite volver a registrarse con el mismo email.
- [ ] Ningún dato personal viaja en logs (`log`/`warn` del proyecto) ni en `localStorage` más allá de `prefs`.
