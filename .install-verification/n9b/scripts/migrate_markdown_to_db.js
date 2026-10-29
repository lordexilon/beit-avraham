const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SCA_SUPABASE_URL;
const supabaseKey = process.env.SCA_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const mdPath = process.argv[2];
  const {readProjectBinding,assertProject}=require('../sca-studio/src/lib/project-binding');
  const projectName = process.argv[3] || readProjectBinding(path.resolve(__dirname,'../AI_CONTEXT'));
  assertProject(path.resolve(__dirname,'..'),projectName);

  if (!mdPath || !fs.existsSync(mdPath)) {
    console.error("Uso: node migrate_markdown_to_db.js <ruta_al_swarm_ledger.md> <nombre_proyecto>");
    process.exit(1);
  }

  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');
  
  let currentSprint = 'Sprint Legacy';
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## Sprint/Tarea:')) {
      currentSprint = line.replace('## Sprint/Tarea:', '').trim();
    } else if (line.startsWith('|') && !line.includes('---') && !line.includes('Nodo | Tarea')) {
      const parts = line.split('|').map(s => s.trim()).filter(s => s.length > 0);
      if (parts.length >= 3) {
        const nodeId = parts[0];
        const taskDesc = parts[1];
        const status = parts[2];
        
        let finishedAt = null;
        if (status.toLowerCase().includes('hecho') || status.includes('✅')) {
          finishedAt = new Date().toISOString();
        }

        records.push({
          project_name: projectName,
          sprint_name: currentSprint,
          node_id: nodeId,
          task_desc: taskDesc,
          status: status,
          finished_at: finishedAt
        });
      }
    }
  }

  if (records.length === 0) {
    console.log("No se encontraron nodos para migrar.");
    return;
  }

  console.log(`Encontrados ${records.length} nodos. Insertando en la BD (esquema fsca)...`);
  
  for (const record of records) {
    const { error } = await supabase.schema('fsca').from('swarm_ledger')
      .upsert(record, { onConflict: 'project_name,sprint_name,node_id' });
    
    if (error) {
      console.error(`Error insertando nodo ${record.node_id}:`, error.message);
    } else {
      console.log(`✅ Migrado: [${currentSprint}] ${record.node_id}`);
    }
  }
  
  console.log("\n¡Migración completa! Revisa tu dashboard.");
}

main();
