document.addEventListener('DOMContentLoaded', async () => {
    const lista = document.getElementById('lista-ingredientes');
    const rollContenido = document.getElementById('roll-contenido');
    const btnVaciar = document.getElementById('vaciar-roll');
  
    // Cargar ingredientes desde Supabase
    try {
      const res = await fetch('/combinaciones');
      const datos = await res.json();
  
      datos.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.nombre} - $${item.precio}`;
        li.dataset.nombre = item.nombre;
        li.dataset.precio = item.precio;
  
        li.addEventListener('click', () => {
          const ingrediente = document.createElement('p');
          ingrediente.textContent = `${li.dataset.nombre} - $${li.dataset.precio}`;
          rollContenido.appendChild(ingrediente);
        });
  
        lista.appendChild(li);
      });
    } catch (err) {
      console.error('Error cargando ingredientes:', err);
      lista.innerHTML = '<li>Error al cargar</li>';
    }
  
    btnVaciar.addEventListener('click', () => {
      rollContenido.innerHTML = '<p>Elegí ingredientes para armar tu roll</p>';
    });
  });
  