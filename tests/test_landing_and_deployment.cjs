const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { localWriter } = require('../scripts/model_cost_cli');
const { loadEnvironment } = require('../scripts/sca_runtime');

const root = path.resolve(__dirname, '..');
loadEnvironment(root);

async function testLandingAndDeployment() {
  console.log('🧪 Iniciando pruebas para N54: Enfoque Pedagógico en el Moré y Google Meet...');

  // 1. Verificar existencia y enfoque pedagógico de LandingPage.tsx
  console.log('   📂 Verificando LandingPage.tsx con foco en el Moré y Torá...');
  const landingPath = path.resolve(root, 'beit-avraham-web', 'src', 'components', 'LandingPage.tsx');
  assert(fs.existsSync(landingPath), 'LandingPage.tsx debe existir');
  const landingCode = fs.readFileSync(landingPath, 'utf8');
  assert(landingCode.includes('בֵּית אַבְרָהָם'), 'Debe contener la identidad en hebreo Beit Avraham');
  assert(landingCode.includes('Moré Daniel Rojkin') || landingCode.includes('Moré'), 'Debe centrarse en el Moré');
  assert(landingCode.includes('Clases del Moré Sincronizadas'), 'Debe detallar el pilar de clases del Moré');
  assert(landingCode.includes('Tu Javrutá de Estudio'), 'Debe incluir la Javrutá orientada al estudio');
  assert(landingCode.includes('Google Meet'), 'Debe integrar enlace y sección de Google Meet');
  assert(landingCode.includes('meetUrl'), 'Debe contemplar la propiedad meetUrl');
  assert(!landingCode.includes('xAI Grok'), 'No debe mostrar tecnicismos como xAI Grok en la Landing para los estudiantes');
  console.log('   ✅ LandingPage.tsx verificado con foco pedagógico y Google Meet.');

  // 2. Verificar integración en StudyWorkspace (botón y navegación de Meet)
  console.log('   🧭 Verificando integración de Google Meet en StudyWorkspace.tsx...');
  const workspacePath = path.resolve(root, 'beit-avraham-web', 'src', 'components', 'StudyWorkspace.tsx');
  const workspaceCode = fs.readFileSync(workspacePath, 'utf8');
  assert(workspaceCode.includes('id: "landing"'), 'Debe incluir sección landing');
  assert(workspaceCode.includes('LandingPage'), 'Debe renderizar el componente LandingPage');
  assert(workspaceCode.includes('Clase en Vivo (Meet)'), 'Debe incluir botón en el header topbar para Meet');
  assert(workspaceCode.includes('En Vivo (Google Meet) ↗'), 'Debe incluir acceso a Meet en el menú lateral');
  console.log('   ✅ Integración en StudyWorkspace verificada.');

  // 3. Verificar editor de Google Meet en ContentAdmin.tsx
  console.log('   ⚙️ Verificando pestaña de Configuración Landing y Meet en ContentAdmin.tsx...');
  const adminPath = path.resolve(root, 'beit-avraham-web', 'src', 'components', 'ContentAdmin.tsx');
  const adminCode = fs.readFileSync(adminPath, 'utf8');
  assert(adminCode.includes('beit_avraham_landing_settings'), 'Debe persistir configuración en localStorage');
  assert(adminCode.includes('meetUrl'), 'Debe permitir editar el enlace de Google Meet');
  assert(adminCode.includes('meetSchedule'), 'Debe permitir configurar los horarios de los encuentros en vivo');
  console.log('   ✅ Configuración de Google Meet en ContentAdmin verificada.');

  // 4. Verificar archivos de despliegue y seguridad
  console.log('   🔒 Verificando archivos de despliegue y seguridad...');
  const gitignorePath = path.resolve(root, '.gitignore');
  assert(fs.existsSync(gitignorePath), 'Debe existir .gitignore en la raíz');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  assert(gitignoreContent.includes('.env'), 'Debe ignorar archivos .env');

  const envExampleRoot = path.resolve(root, '.env.example');
  assert(fs.existsSync(envExampleRoot), 'Debe existir .env.example en la raíz');

  const envExampleWeb = path.resolve(root, 'beit-avraham-web', '.env.example');
  assert(fs.existsSync(envExampleWeb), 'Debe existir .env.example en beit-avraham-web');

  const vercelJsonPath = path.resolve(root, 'vercel.json');
  assert(fs.existsSync(vercelJsonPath), 'Debe existir vercel.json en la raíz');
  console.log('   ✅ Archivos de despliegue y seguridad verificados.');

  // 5. Verificar respuesta HTTP del Landing Page en local
  console.log('   🌐 Verificando renderizado HTTP de la Landing Page...');
  const res = await fetch('http://localhost:3001/');
  assert.strictEqual(res.status, 200, 'El servidor debe responder 200 en la raíz');
  const html = await res.text();
  assert(html.includes('Beit Avraham') || html.includes('בית אברהם'), 'Debe renderizar Beit Avraham en HTML inicial');
  console.log('   ✅ Renderizado HTTP verificado exitosamente.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE N54 COMPLETADAS CON ÉXITO!');
}

testLandingAndDeployment().catch(err => {
  console.error('❌ Error en testLandingAndDeployment:', err);
  process.exit(1);
});
