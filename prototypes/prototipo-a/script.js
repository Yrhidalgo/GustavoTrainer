// Prototipo A: Interacciones funcionales de demostración
// Demonstrates progress bar animation and active state tracking

document.addEventDOMContentLoaded, () => {
  // Animación de barras de progreso cuando aparecen en viewport
  const progressBars = document.querySelectorAll('.progress-fill');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const targetWidth = bar.style.width;
        bar.style.width = '0';
        // Trigger reflow for animation
        bar.offsetWidth;
        bar.style.width = targetWidth;
      }
    });
  }, { threshold: 0.5 });

  progressBars.forEach(bar => {
    observer.observe(bar);
  });

  // Rastreo de métricas interactivas
  const metricValues = document.querySelectorAll('.metric-value');
  
  metricValues.forEach(metric => {
    metric.addEventListener('mouseenter', () => {
      metric.style.transform = 'scale(1.1)';
      metric.style.transition = 'transform 0.2s';
    });
    metric.addEventListener('mouseleave', () => {
      metric.style.transform = 'scale(1)';
    });
  });

  // Efecto hover en botones principales
  const primaryButtons = document.querySelectorAll('.btn-primary');
  
  primaryButtons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.boxShadow = '0 4px 12px rgba(0,102,170,0.3)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.boxShadow = 'none';
    });
  });

  // Simular progreso aleatorio al recargar
  const randomProgress = Math.floor(Math.random() * 50) + 30;
  const initBar = document.querySelector('.progress-fill');
  if (initBar) {
    initBar.style.width = `${randomProgress}%`;
  }
});