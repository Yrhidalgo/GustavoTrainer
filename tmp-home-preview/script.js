document.addEventListener('DOMContentLoaded', () => {
  const btnCurrent = document.getElementById('btn-current');
  const btnA = document.getElementById('btn-a');
  const btnB = document.getElementById('btn-b');
  
  const viewCurrent = document.getElementById('view-current');
  const viewA = document.getElementById('view-a');
  const viewB = document.getElementById('view-b');
  
  const lCurrent = document.getElementById('l-current');
  const lA = document.getElementById('l-a');
  const lB = document.getElementById('l-b');
  
  // Establecer listener de clics
  btnCurrent.addEventListener('click', () => {
    // Ocultar todas las vistas
    viewCurrent.style.display = 'none';
    viewA.style.display = 'none';
    viewB.style.display = 'none';
    
    // Mostrar Actual
    viewCurrent.style.display = 'block';
    btnCurrent.style.background = 'var(--acc)';
    btnCurrent.style.color = 'var(--on-acc)';
    btnA.style.background = 'var(--surface)';
    btnA.style.color = 'var(--label)';
    btnB.style.background = 'var(--surface)';
    btnB.style.color = 'var(--label)';
    
    // Actualizar labels
    lCurrent.textContent = 'ACTUAL';
    lA.textContent = 'PROPUESTA A';
    lB.textContent = 'PROPUESTA B';
  });
  
  btnA.addEventListener('click', () => {
    viewCurrent.style.display = 'none';
    viewA.style.display = 'block';
    viewB.style.display = 'none';
    
    btnCurrent.style.background = 'var(--surface)';
    btnCurrent.style.color = 'var(--label)';
    btnA.style.background = 'var(--acc)';
    btnA.style.color = 'var(--on-acc)';
    btnB.style.background = 'var(--surface)';
    btnB.style.color = 'var(--label)';
    
    lCurrent.textContent = 'ACTUAL';
    lA.textContent = 'ACTUAL';
    lB.textContent = 'PROPUESTA B';
  });
  
  btnB.addEventListener('click', () => {
    viewCurrent.style.display = 'none';
    viewA.style.display = 'none';
    viewB.style.display = 'block';
    
    btnCurrent.style.background = 'var(--surface)';
    btnCurrent.style.color = 'var(--label)';
    btnA.style.background = 'var(--surface)';
    btnA.style.color = 'var(--label)';
    btnB.style.background = 'var(--acc)';
    btnB.style.color = 'var(--on-acc)';
    
    lCurrent.textContent = 'ACTUAL';
    lA.textContent = 'PROPUESTA A';
    lB.textContent = 'ACTUAL';
  });
  
  // Inicializar: mostrar Actual por defecto
  btnCurrent.click();
});