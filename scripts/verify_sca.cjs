// Read-only checks. Never print credentials or write Matrix records.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {createClient} = require(path.join(root, 'sca-studio/node_modules/@supabase/supabase-js'));
const settings = {...process.env};
for (const name of ['sca-studio/.env.local', '.env.local', '.env']) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split('\n')) {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match && !settings[match[1].trim()]) settings[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
}
async function main() {
  const binding = JSON.parse(fs.readFileSync(path.join(root, 'AI_CONTEXT/project_binding.json'), 'utf8'));
  console.log('Binding:', JSON.stringify(binding));
  const url = settings.SCA_SUPABASE_URL || settings.NEXT_PUBLIC_SUPABASE_URL;
  const key = settings.SCA_SUPABASE_SERVICE_ROLE_KEY || settings.SCA_SUPABASE_ANON_KEY || settings.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Matrix sin configuración');
  console.log('Matrix host:', new URL(url).host);
  const client = createClient(url, key, {auth: {persistSession: false}, global: {fetch: (u, o) => fetch(u, {...o, signal: AbortSignal.timeout(8000)})}});
  for (const [table, columns] of [
    ['project_measurement_state', 'project_name,active_cycle_id'],
    ['measurement_cycles', 'id,project_name,status'],
    ['swarm_ledger', 'node_id,sprint_name,status,cycle_id'],
    ['metrics_log', 'id,cycle_id,main_task'],
  ]) {
    const {data, error} = await client.schema('fsca').from(table).select(columns).eq('project_name', binding.project_name).limit(20);
    console.log(table, JSON.stringify(error ? {error: error.message} : data));
  }
  for (const route of ['project', 'cycle-dashboard', 'dag']) {
    try {
      const response = await fetch(`http://localhost:3000/api/${route}?ws=..%2FAI_CONTEXT`, {signal: AbortSignal.timeout(30000)});
      console.log(route, response.status, (await response.text()).slice(0, 2400));
    } catch (error) {console.log(route, error.message);}
  }
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
