#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ERROR: no estás dentro del repositorio GustavoTrainer."
  exit 1
}
cd "$ROOT"

echo "=================================================="
echo " GUSTAVOTRAINER - PREPARACIÓN DE TRADUCCIÓN ES"
echo "=================================================="
echo
echo "Modo: diagnóstico de solo lectura."
echo "No se traducen nombres de ejercicios."
echo "No se modifican archivos de la aplicación."
echo

CORE="frontend/src/lib/i18n-core.js"
I18N="frontend/src/lib/i18n.js"

if [[ ! -f "$CORE" || ! -f "$I18N" ]]; then
  echo "ERROR: no se encontraron los archivos centrales de i18n."
  echo "Revisa las rutas antes de continuar."
  exit 1
fi

echo "=== 1. SOPORTE DEL ESPAÑOL ==="
if grep -n -E '"es"|"es-[A-Za-z-]+"|'\''es'\''|'\''es-[A-Za-z-]+'\'' ' "$CORE"; then
  echo
  echo "Se encontraron referencias al español en el núcleo."
else
  echo "No se detectó una referencia explícita a es en el núcleo."
fi

echo
echo "=== 2. PAQUETES DE INTERFAZ ==="
find frontend/src/locales -maxdepth 1 -type f \
  \( -name '*.js' -o -name '*.json' \) -print 2>/dev/null |
  sort || true

echo
echo "=== 3. PAQUETES ESPAÑOLES EXISTENTES ==="
find frontend/src -type f \
  \( -path '*/locales/*' -o -path '*/instr/*' \) \
  \( -iname 'es.js' -o -iname 'es-*.js' \) \
  -print 2>/dev/null | sort || true

echo
echo "=== 4. CÓMO SE CARGAN LAS TRADUCCIONES ==="
grep -n -E 'import\.meta\.glob|localePacks|setLang|LANGS|dict|baseLang' \
  "$I18N" "$CORE" || true

echo
echo "=== 5. TEXTOS VISIBLES POTENCIALMENTE PENDIENTES ==="
echo "Referencias a componentes con textos visibles; revisión manual necesaria."
git grep -n -I -E \
  'placeholder=|aria-label=|title=|>[^<{[:space:]][^<>]*[A-Za-z][^<>]*<' \
  -- 'frontend/src/views/*.jsx' 'frontend/src/components/*.jsx' \
     'frontend/src/views/*.tsx' 'frontend/src/components/*.tsx' \
  2>/dev/null |
  grep -v -E 'exercise-names|catalogue/|node_modules|\.test\.' |
  head -n 100 || true

echo
echo "=== 6. ESTADO DE LOS CAMBIOS ==="
git status --short

echo
echo "=================================================="
echo "DIAGNÓSTICO TERMINADO"
echo "No se han modificado archivos de la aplicación."
echo "=================================================="
