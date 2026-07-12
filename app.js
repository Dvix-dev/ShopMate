import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getDatabase, ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// Firebase config (externalizada) — loader transparente, ver ./firebase-config.js
import { firebaseConfig } from "./firebase-config.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// Referencias al DOM
const checklistEl = document.getElementById('checklist');
const inputEl = document.getElementById('item-input');
const addBtn = document.getElementById('add-btn');
const validarBtn = document.getElementById('validar-btn');

// Renderizar lista
function renderLista(snapshot) {
  checklistEl.innerHTML = '';
  let hayMarcados = false;

  snapshot.forEach(childSnapshot => {
    const key = childSnapshot.key;
    const item = childSnapshot.val();

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = key;
    checkbox.checked = item.comprado || false;
    checkbox.addEventListener('change', () => {
      update(ref(db, 'items/' + key), { comprado: checkbox.checked });
    });

    const label = document.createElement('label');
    label.setAttribute('for', key);
    label.textContent = item.nombre;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    checklistEl.appendChild(wrapper);

    if (item.comprado) hayMarcados = true;
    if (item.nota) {
      const notaIcon = document.createElement('span');
      notaIcon.innerText = '📝';
      notaIcon.style.cursor = 'pointer';
      notaIcon.title = 'Ver nota';
      notaIcon.style.marginLeft = '10px';
      notaIcon.addEventListener('click', () => mostrarNotaPopup(item.nombre, item.nota));
      wrapper.appendChild(notaIcon);
    }

  });

  validarBtn.style.display = hayMarcados ? 'block' : 'none';
}

// Escuchar cambios en tiempo real
onValue(ref(db, 'items'), renderLista);

// Añadir ítem
function addItem() {
  const { nombre, nota } = procesarInput(inputEl.value.trim());
  if (nombre) {
    push(ref(db, 'items'), { nombre, comprado: false, nota });
    inputEl.value = '';
    inputEl.focus();
  }
}

// Validar y eliminar marcados
function validarComprados() {
  onValue(ref(db, 'items'), snapshot => {
    snapshot.forEach(childSnapshot => {
      if (childSnapshot.val().comprado) {
        remove(ref(db, 'items/' + childSnapshot.key));
      }
    });
  }, { onlyOnce: true });
}

// Popup notas
function mostrarNotaPopup(nombre, nota) {
  document.getElementById('popup-titulo').textContent = nombre;
  document.getElementById('popup-nota').textContent = nota;
  document.getElementById('nota-popup').classList.remove('hidden');
}

function cerrarPopup() {
  document.getElementById('nota-popup').classList.add('hidden');
}

// Eventos
addBtn.addEventListener('click', addItem);
inputEl.addEventListener('keypress', e => { if (e.key === 'Enter') addItem(); });
validarBtn.addEventListener('click', validarComprados);

// document.getElementById('item-input').addEventListener('focus', () => {
//   document.querySelector('.container').style.marginBottom = '50vh';
// });
// document.getElementById('item-input').addEventListener('blur', () => {
//   document.querySelector('.container').style.marginBottom = '';
// });

// FUNCIONES AUXILIARES
  // Procesar el input
function procesarInput(input) {
  const match = input.match(/^(.+?)(?:\s*\((.+)\))?$/);
  
  return {
    nombre: match?.[1]?.trim() ?? null,
    nota: match?.[2]?.trim() ?? null
  };
}