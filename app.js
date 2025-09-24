import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getDatabase, ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDXXXaKXZPzulwKx6Oz55HN8v8LFfwCeSU",
  authDomain: "shopmate-e9195.firebaseapp.com",
  databaseURL: "https://shopmate-e9195-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "shopmate-e9195",
  storageBucket: "shopmate-e9195.firebasestorage.app",
  messagingSenderId: "816685281629",
  appId: "1:816685281629:web:9ceafbc72825a76162f8b4",
  measurementId: "G-QQDYG3RE2Y"
};

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
  });

  validarBtn.style.display = hayMarcados ? 'block' : 'none';
}

// Escuchar cambios en tiempo real
onValue(ref(db, 'items'), renderLista);

// Añadir ítem
function addItem() {
  const nombre = inputEl.value.trim();
  if (nombre) {
    push(ref(db, 'items'), { nombre, comprado: false });
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

// Eventos
addBtn.addEventListener('click', addItem);
inputEl.addEventListener('keypress', e => { if (e.key === 'Enter') addItem(); });
validarBtn.addEventListener('click', validarComprados);