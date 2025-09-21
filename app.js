// Cargar lista desde localStorage o inicializar vacía
let lista = JSON.parse(localStorage.getItem('lista')) || [];

// Referencias al DOM
const listEl = document.getElementById('shopping-list');
const inputEl = document.getElementById('item-input');
const addBtn = document.getElementById('add-btn');

// Función para guardar en localStorage
function guardarLista() {
  localStorage.setItem('lista', JSON.stringify(lista));
}

// Función para renderizar la lista
function renderLista() {
  listEl.innerHTML = '';
  lista.forEach((item, index) => {
    const li = document.createElement('li');

    const span = document.createElement('span');
    span.textContent = item.nombre;

    const btn = document.createElement('button');
    btn.textContent = '✔';
    btn.addEventListener('click', () => {
      lista.splice(index, 1); // Eliminar ítem
      guardarLista();
      renderLista();
    });

    li.appendChild(span);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

// Función para añadir ítem
function addItem() {
  const nombre = inputEl.value.trim();
  if (nombre) {
    lista.push({ nombre, comprado: false });
    guardarLista();
    renderLista();
    inputEl.value = '';
  }
}

// Eventos
addBtn.addEventListener('click', addItem);
inputEl.addEventListener('keypress', e => {
  if (e.key === 'Enter') addItem();
});

// Render inicial
renderLista();