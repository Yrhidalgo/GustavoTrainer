// Prototipo B: Interacciones funcionales minimalistas
// Demonstra actualización de estadísticas y navegación básica

document.addEventDOMContentLoaded, () => {
  // Datos de ejemplo (identificados como demo)
  const demoData = {
    streak: 3,
    workouts: 12,
    weight: 75.5
  };

  // Actualizar estadísticas al cargar
  const streakEl = document.getElementById('stat-streak');
  const workoutsEl = document.getElementById('stat-workouts');
  const weightEl = document.getElementById('stat-weight');
  
  if (streakEl) streakEl.textContent = demoData.streak;
  if (workoutsEl) workoutsEl.textContent = demoData.workouts;
  if (weightEl) weightEl.textContent = `${demoData.weight} kg`;

  // Efecto hover en links de acceso rápido
  const quickLinks = document.querySelectorAll('.quick-link');
  
  quickLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.style.background = 'var(--primary-light)';
    });
    link.addEventListener('mouseleave', () => {
      link.style.background = 'var(--bg-alt)';
    });
  });

  // Simular crecimiento de racha al hacer clic
  let streakCount = demoData.streak;
  
  const streakDisplay = document.getElementById('stat-streak');
  if (streakDisplay) {
    streakDisplay.addEventListener('click', () => {
      streakCount++;
      streakDisplay.textContent = streakCount;
    });
  }
});