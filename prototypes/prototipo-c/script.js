// Prototipo C: Interacciones gamificadas
// Demuestra progreso visual, rachas y lógica de logros

document.addEventDOMContentLoaded, () => {
  // Datos de ejemplo identificados como demo
  const demoData = {
    currentStreak: 3,
    level: 2,
    totalWorkouts: 12,
    achievementsUnlocked: 5,
    weeklyProgress: 60, // porcentaje
    achievements: [
      { id: 'first-workout', name: 'Primer entrenamiento', description: 'Completa tu primera sesión' },
      { id: 'streak-7', name: 'Racha de 7', description: '7 semanas consecutivas' },
      { id: '50-workouts', name: '50 sesiones', description: 'Completa 50 workouts' },
    ]
  };

  // Elementos del DOM
  const streakValue = document.getElementById('streak-value');
  const levelValue = document.getElementById('level-value');
  const stripeFill = document.getElementById('stripe-fill');
  const fireStreak = document.getElementById('fire-streak');
  const totalWorkoutsEl = document.getElementById('total-workouts');
  const achievementsUnlocked = document.getElementById('achievements-unlocked');
  const achievementsGrid = document.getElementById('achievements-grid');
  const startBtn = document.getElementById('start-workout-btn');

  // Actualizar UI con datos de demo
  if (streakValue) streakValue.textContent = demoData.currentStreak;
  if (levelValue) levelValue.textContent = demoData.level;
  if (stripeFill) stripeFill.style.width = `${demoData.weeklyProgress}%`;
  if (fireStreak) fireStreak.textContent = demoData.currentStreak;
  if (totalWorkoutsEl) totalWorkoutsEl.textContent = demoData.totalWorkouts;
  if (achievementsUnlocked) achievementsUnlocked.textContent = demoData.achievementsUnlocked;

  // Generar cards de logros
  if (achievementsGrid && demoData.achievements) {
    demoData.achievements.forEach(achievement => {
      const card = document.createElement('div');
      card.className = 'achievement-card';
      card.innerHTML = `
        <div class="achievement-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.21L7 14.14 2 9.27l6.91-1.02L12 2z"/>
          </svg>
        </div>
        <h3>${achievement.name}</h3>
        <p>${achievement.description}</p>
      `;
      achievementsGrid.appendChild(card);
    });
  }

  // Efecto al comenzar entrenamiento
  let workoutCount = 0;
  
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // Animación de progreso
      if (stripeFill) {
        const currentWidth = parseInt(stripeFill.style.width) || 0;
        const newWidth = Math.min(currentWidth + 10, 100);
        stripeFill.style.width = `${newWidth}%`;
      }
      
      // Actualizar racha
      workoutCount++;
      const newStreak = Math.min(demoData.currentStreak + 1, 50);
      if (streakValue) streakValue.textContent = newStreak;
      if (fireStreak) fireStreak.textContent = newStreak;
      
      // Desbloquear logros simulados
      if (workoutCount % 10 === 0 && achievementsUnlocked) {
        achievementsUnlocked.textContent = parseInt(achievementsUnlocked.textContent) + 1;
      }
      
      // Feedback visual
      startBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        startBtn.style.transform = 'scale(1)';
      }, 150);
    });
  }

  // Hover effects en cards de logros
  const achievementCards = document.querySelectorAll('.achievement-card');
  
  achievementCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.background = '#e2e8f0';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = 'var(--bg-light)';
    });
  });

  // Efecto de entrada escalonado
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  }, observerOptions);

  // Observar elementos para animación de entrada
  document.querySelectorAll('.achievement-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    observer.observe(el);
  });
});