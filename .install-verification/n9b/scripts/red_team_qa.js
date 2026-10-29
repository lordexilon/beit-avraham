const http = require('http');

// Configuración del entorno de prueba (Red Team)
const TARGET_URL = process.env.QA_TARGET_URL || 'http://localhost:3000';
const ENDPOINTS_TO_TEST = [
  '/',
  '/api/metrics',
  '/api/knowledge-query' // El endpoint que acabamos de crear
];

console.log(`🤖 Iniciando gstack /qa Bridge (Red Team SCA)`);
console.log(`🎯 Objetivo: ${TARGET_URL}`);

async function pingEndpoint(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${TARGET_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`[HTTP ${res.statusCode}] Error en ${path}: ${data.substring(0, 100)}...`));
        } else {
          resolve(`[HTTP ${res.statusCode}] ${path} OK`);
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Fallo de conexión a ${path}: ${err.message}. ¿Está el servidor corriendo?`));
    });

    // Simular un timeout estricto para pruebas de estrés
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error(`Timeout excedido en ${path} (Red Team detecta latencia inaceptable)`));
    });
  });
}

async function runQA() {
  let hasErrors = false;
  let errorReports = [];

  for (const endpoint of ENDPOINTS_TO_TEST) {
    try {
      const msg = await pingEndpoint(endpoint);
      console.log(`  ✅ ${msg}`);
    } catch (err) {
      console.error(`  ❌ REGRESIÓN DETECTADA: ${err.message}`);
      errorReports.push(err.message);
      hasErrors = true;
    }
  }

  // Simulación de "Inyección de fallos comprobables" (gstack concept)
  // Si se detectan errores, salimos con código 1 para que el Swarm Engine dispare el Rollback/Fix
  if (hasErrors) {
    console.error(`\n🚨 RED TEAM FAILURE: Se detectaron ${errorReports.length} regresiones.`);
    console.error(`--- REPORTE PARA EL LLM ---`);
    errorReports.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log(`\n🎉 RED TEAM PASS: Todas las pruebas superadas. QA Aprobado.`);
    process.exit(0);
  }
}

runQA();
