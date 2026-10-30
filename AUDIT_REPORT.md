# Technical Audit Report: GustavoTrainer (fork of openGym)

**Audit Date:** 2026-10-27
**Auditor Role:** Technical Auditor
**Scope:** Read-only inspection of the repository `yhidalgo/gustavotrainer`

---

## A. Resumen de la Arquitectura

### Lenguaje y Framework
- **Frontend:** React 19 (type: module), Vite 8, React Router DOM 7
- **Styling:** CSS custom properties (design system in `frontend/src/index.css`), token-based theming
- **State Management:** Zustand (store in `frontend/src/store/useStore.js` and `useUI.js`)
- **Routing:** HashRouter with Routes pattern
- **Animations:** Custom animation system in `frontend/src/lib/anim-packs.js`
- **Build Tool:** Vite (dev/preview/build)

### Backend/API
- **Runtime:** Node.js with ESM type
- **Framework:** Custom server in `api/server.js`
- **Dependencies:** `@simplewebauthn/server`, `undici`, `web-push`
- **API Spec:** OpenAPI definition in `api/openapi.yaml`
- **Dockerized:** `docker-compose.yml` for local development

### Arquitectura de Datos
- **Local First:** IndexedDB/persistence via `useStore.js` (127KB+ test files)
- **Sync System:** `sync-merge.js` for conflict resolution between client/server
- **Passkeys/WebAuthn:** `@simplewebauthn/server` for authentication
- **Push Notifications:** VAPID keys, `@capacitor/local-notifications`
- **Media Handling:** Custom media sync and storage in `api/media.js`

### Navegación y Routes
- **Home** (`views/Home.jsx`) - hoy workout y peso
- **Workout** (`views/Workout.jsx`) - pantalla principal de entrenamiento
- **Plan** (`views/Plan.jsx`) - planificación de workouts
- **Library** (`views/Library.jsx`) - biblioteca de ejercicios
- **Admin** (`views/Admin.jsx`) - panel de administración
- **Coach** (`views/CoachChat.jsx`, `views/CoachSetup.jsx`) - AI Coach
- **Login/Auth** (`views/Login.jsx`) - autenticación
- **Settings** (`views/Settings.*` - múltiples sub-páginas)

### Móvil vs Web
- **Capacitor** para wrapper nativo (Android/iOS)
- `MOBILE` flag distingue móvil vs navegador desktop
- Service workers para caching offline de medios
- Deep linking y watch sync capabilities

---

## B. Archivos que Controlan la Apariencia y Funciones Principales

### Design System (Estilos Globales)
- `frontend/src/index.css` - Theme tokens, color palette, typography, spacing, motion
- Theme variants: dark (`[data-theme="dark"]`) and light (`[data-theme="light"]`)
- Accent colors: lime, sky, orange, violet, pink, red (via `[data-accent=""]` attributes)

### Componentes Principales (Screen-level)
- `frontend/src/views/App.jsx` - Root component with routing
- `frontend/src/views/Home.jsx` - Home screen with today's workout/weight
- `frontend/src/views/Workout.jsx` - Main workout tracking screen
- `frontend/src/views/Plan.jsx` - Workout planning
- `frontend/src/views/Admin.jsx` - Admin dashboard
- `frontend/src/views/CoachChat.jsx` - AI Coach interface

### Componentes UI Reutilizables
- `frontend/src/components/ui.jsx` - Core UI component with Accordion, Badge, etc.
- `frontend/src/components/Animations.jsx` - Animation system
- `frontend/src/components/Passkeys.jsx` - Authentication UI
- `frontend/src/components/Modals.jsx` - Modal dialogs
- `frontend/src/components/SyncBanner.jsx` - Connection status

### Librerías y Utilerías
- `frontend/src/lib/accent.js` - Accent color logic
- `frontend/src/lib/seasonal.js` - Seasonal theming
- `frontend/src/lib/format.js` - Number formatting
- `frontend/src/lib/nav.js` - Navigation utilities
- `frontend/src/lib/page-motion.js` - Page transition effects
- `frontend/src/store/useStore.js` - Main state store (~127KB)

### Pantallas de Configuración
- `frontend/src/views/settings-pages.js` - Settings page composition
---

## C. Posibles Problemas de Seguridad o Mantenimiento

### Seguridad
1. **Passkeys/WebAuthn implementation** - `@simplewebauthn/server` v13.3.3 handles authentication; ensure RP_ID and origin are properly configured via `.env`
2. **VAPID keys for push notifications** - Generated on first run, stored in `./data/vapid.json`; exposure could allow abuse
3. **CORS and Socket endpoints** - `api/admin-socket.js` needs review for unauthorized access
4. **Media upload handling** - `api/media.js` has quota limits; improper configuration could allow disk filling
5. **Dependencies with known vulnerabilities** - `undici@^7.30.1`, `web-push@^3.6.7` - should be checked periodically

### Mantenimiento
1. **Large test suite** - 200+ test files; high maintenance overhead
2. **Complex sync-merge logic** - `sync-merge.js` (163KB) with property tests; subtle bugs possible
3. **Deprecated Capacitor versions** - `@capacitor/core@^8.5.3` is current but near-end-of-life for v8
4. **React 19** - Latest major version; ecosystem compatibility should be verified
5. **Large codebase without clear entry points** - Multiple `sheets.jsx`, `lib/` directories make navigation complex

### Dependencias que Merecen Revisión
- `@anthropic-ai/claude-agent-sdk` (optional, in api/package.json optionalDependencies)
- `leaflet@^1.9.4` - mapping library, verify no L security issues
- `jsqr@^1.4.0` - QR code generation
- Multiple `sheets.config-*` files for workout configuration

---
---
## D. Tres Propuestas de Personalización (Ordenadas por Impacto y Dificultad)

### 1. Cambiar el Tema Visual (Alto Impacto, Baja Dificultad)
**Qué modificar:** `frontend/src/index.css` - tokens de color, tema por defecto
**Cómo hacerlo:**
- Cambiar `--bg`, `--bg-el`, `--surface` values para dark/light themes
- Agregar nuevos valores a `--acc`, `--blue`, `--green`, etc. para paletas personalizadas
- Modificar `[data-accent=""]` bloques para añadir nuevos acentos
- Establecer `DEFAULT_LANG` en `.env` para idioma por defecto
**Riesgo:** Bajo - solo CSS tokens, no afecta lógica

### 2. Añadir Nueva Pantalla o Vista (Medio Impacto, Medio Dificultad)
**Qué modificar:** Nuevo archivo en `frontend/src/views/` + routing en `frontend/src/App.jsx`
**Cómo hacerlo:**
1. Crear `views/NuevaVista.jsx` con componente React
2. Agregar ruta en `<HashRouter>` en `App.jsx`:
   ```jsx
   <Route path="/nueva-vista" element={<NuevaVista />} />
   ```
3. Importar y agregar en el menú/tabbar si es necesario
4. Conectar con state store si necesita persistencia
**Riesgo:** Medio - requiere entender la estructura de routes y possibly state management

### 3. Modificar Flujo de Onboarding/Inscripción (Alto Impacto, Alta Dificultad)
**Qué modificar:** `frontend/src/views/MobileOnboarding.jsx`, `views/Login.jsx`, `views/PermissionSteps.jsx`, `api/server.js`
**Cómo hacerlo:**
1. Modificar `MobileOnboarding.jsx` para cambiar pasos de onboarding
2. Ajustar `Login.jsx` para métodos de autenticación diferentes (password vs passkeys)
3. Modificar `PermissionSteps.jsx` para permisos distintos
4. Ajustar variables de entorno `.env` para `FIRST_USER_ADMIN`, `INVITE_ONLY`, etc.
5. Revisar `api/admin-socket.js` y flujos de admin dashboard
**Riesgo:** Alto - afecta flujo de usuario completo, autenticación y configuración de instancia
- `@anthropic-ai/claude-agent-sdk` (optional, in api/package.json optionalDependencies)
- `leaflet@^1.9.4` - mapping library, verify no L security issues
- `jsqr@^1.4.0` - QR code generation
## E. Archivos que Probablemente Habría que Modificar en una Fase Posterior

### Si se añade nueva funcionalidad de Coach/AI:
- `api/coach/` directory - lógica del coach de IA
- `api/nudge*.js` - notificaciones y nudge behavior
- `frontend/src/lib/use-coach-gate.js` - gate logic
- `frontend/src/views/CoachChat.jsx` - interfaz del coach

### Si se modifican integraciones externas:
- `api/openapi.yaml` - especificación de API pública
- `frontend/src/lib/api.js` - cliente API
- `frontend/src/lib/anim-packs.js` - packs de animación
- `frontend/src/store/useStore.js` - estado global (añadir nuevas slices)

### Si se cambia la base de datos o almacenamiento:
- `api/durable.js` - persistencia durable
- `scripts/` directory - scripts de migración y helper
- `api/media.js` - gestión de medios

### Si se añade soporte para nuevo idioma:
- `frontend/src/locales/` - archivos de traducción
- `frontend/src/lib/i18n.js` - lógica de internacionalización
- `frontend/src/lib/default-lang.js` - idioma por defecto

---
## F. Pruebas Recomendadas para Validar Cambios Futuros

### Tests Unitarios (Ya existen, mantener)
- `vitest run` - test suite principal (véase `package.json` scripts)
- Cobertura existente en `frontend/package.json`: `"test": "vitest run"`
- Tests críticos para modification points:
  - `sheets.*` tests - lógica de workouts
  - `useStore.*` tests - gestión de estado
  - `useUI.*` tests - estado de UI
  - `Admin.*` tests - funcionalidad admin
  - `CoachChat.*` tests - coach integration

### Tests de Integración Recomendados
1. **Tests de flujo completo de workout:** Desde creación hasta logging
2. **Tests de sincronización:** Entre cliente y servidor (mock API)
3. **Tests de tema/theme switching:** Dark/light toggle
4. **Tests de accesibilidad:** Contrast checks (`a11y-contrast-transparency.test.js` existe)
5. **Tests de mobile vs web:** Diferenciación `MOBILE` flag

### Tests de Seguridad (Nuevos)
1. **Passkeys flow tests** - Registrar y autenticar WebAuthn credentials
2. **VAPID key tests** - Generación y uso de push notification keys
3. **API auth tests** - Middleware de protección de endpoints
4. **Media quota tests** - Límite de subidas y limpieza GC

### Tests de Renderizado Visual
- `npm test` o `npm run test:watch` - visual regression con happy-dom/dom
- `pdf:check` - renderizado de PDFs para hojas de ejercicio
- `test:fatigue-probe` - sonda de degradación de tests

### Comandos de Validación
```bash
# Desde la raíz
cd frontend && npm test          # Ejecutar todos los tests
cd frontend && npm run build     # Verificar build exitoso
cd api && npm test               # Tests del backend API
```