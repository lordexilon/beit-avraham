const NUMERIC_FIELDS = new Set([
  'tokens_without_sca', 'tokens_with_sca', 'tokens_saved', 'real_time_employed_hrs',
  'estimated_time_saved_hrs', 'execution_loops'
]);
const INTEGER_FIELDS = new Set(['tokens_without_sca', 'tokens_with_sca', 'tokens_saved', 'execution_loops']);
const METRIC_FIELDS = new Set([
  'project_name', 'cycle_id', 'main_task', 'ai_context_files_read', 'tokens_without_sca', 'tokens_with_sca',
  'tokens_saved', 'hit_density', 'context_bridge_issued', 'search_strategy', 'modified_files',
  'subagents_invoked', 'autonomy_mode', 'llm_model_used', 'estimated_time_saved_hrs',
  'real_time_employed_hrs', 'estimated_api_cost', 'loc', 'execution_loops', 'result'
]);
const LEDGER_FIELDS = new Set(['project_name', 'cycle_id', 'sprint_name', 'node_id', 'task_desc', 'status']);

/** @param {unknown} value @returns {number|null} */
function optionalNumber(value) {
  if (value == null || value === '' || (typeof value === 'string' && /^(n\/d|n\/a|null|unknown)$/i.test(value.trim()))) return null;
  if ((typeof value !== 'string' && typeof value !== 'number') || (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) {
    throw new Error('Valor numérico inválido.');
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('Valor numérico no finito.');
  return number;
}

function parseArguments(argv) {
  if (argv.length % 2) throw new Error('Cada argumento requiere un valor.');
  const fields = Object.create(null);
  for (let i = 0; i < argv.length; i += 2) {
    if (!/^--[a-z_]+$/.test(argv[i])) throw new Error('Argumento inválido.');
    const name = argv[i].slice(2);
    if (Object.hasOwn(fields, name)) throw new Error(`Argumento duplicado: ${name}`);
    fields[name] = argv[i + 1];
  }
  const type = fields.type;
  if (!['metric', 'ledger'].includes(type)) throw new Error('--type debe ser metric o ledger.');
  const syncOnly = fields.sync_only === 'true';
  if (fields.sync_only !== undefined && !['true', 'false'].includes(fields.sync_only)) throw new Error('--sync_only debe ser true o false.');
  const allowed = type === 'metric' ? METRIC_FIELDS : LEDGER_FIELDS;
  const data = {};
  for (const [field, value] of Object.entries(fields)) {
    if (field === 'type' || field === 'sync_only') continue;
    if (!allowed.has(field)) throw new Error(`Campo no permitido: ${field}`);
    if (NUMERIC_FIELDS.has(field)) {
      const number = optionalNumber(value);
      if (number !== null && INTEGER_FIELDS.has(field) && (!Number.isSafeInteger(number) || number < -2147483648 || number > 2147483647)) throw new Error(`${field} debe ser un entero PostgreSQL válido.`);
      if (number !== null && !['tokens_saved', 'estimated_time_saved_hrs'].includes(field) && number < 0) throw new Error(`${field} no puede ser negativo.`);
      data[field] = number;
    } else {
      data[field] = /^(null|n\/d)$/i.test(value.trim()) ? null : value;
    }
  }
  if (typeof data.project_name !== 'string' || !data.project_name.trim()) throw new Error('--project_name es obligatorio.');
  if (type === 'ledger' && !syncOnly) {
    for (const field of ['sprint_name', 'node_id', 'task_desc', 'status']) {
      if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`--${field} es obligatorio.`);
    }
  }
  return {type, data, syncOnly};
}

/** A declared manual duration is not evidence of savings, token use or changed LoC.
 * @param {{taskDesc: unknown, timeEmployed?: unknown}} input
 */
function buildManualMetric(input,projectName) {
  if (!input || typeof input.taskDesc !== 'string' || !input.taskDesc.trim()) throw new Error('Falta descripción.');
  if(typeof projectName!=='string'||!projectName.trim()) throw new Error('Falta proyecto del workspace.');
  const duration = optionalNumber(input.timeEmployed);
  if (duration !== null && duration < 0) throw new Error('El tiempo no puede ser negativo.');
  return {
    project_name: projectName,
    main_task: `Intervención Directa (Humana): ${input.taskDesc.trim()}`,
    llm_model_used: 'N/A (Humano)',
    real_time_employed_hrs: duration,
    tokens_without_sca: null, tokens_with_sca: null, tokens_saved: null,
    estimated_time_saved_hrs: null, loc: null, hit_density: null, execution_loops: null,
    result: 'Registro humano; duración declarada. Ahorro, tokens y LoC no medidos.'
  };
}

function cell(value, suffix = '') {
  if (value == null || value === '') return 'N/D';
  return String(value).replace(/\|/g, '&#124;').replace(/\r?\n/g, '<br>') + suffix;
}

function extractWeeklyHistory(markdown) {
  const match = /^## (?:📊 )?Weekly History\s*$/m.exec(markdown);
  return match ? markdown.slice(match.index) : '';
}

function renderMetrics(records, projectName, syncedAt, oldMarkdown = '') {
  let md = `# 📊 SCA Metrics (SCA Matrix Mirror)\n> **Source of Truth:** PostgreSQL (SCA Matrix - FSCA)\n> **Project:** ${cell(projectName)}\n> **Last Synced:** ${syncedAt}\n\n`;
  md += '> N/D = dato desconocido. Cero representa un valor registrado. Estimated Time Saved es una estimación declarada. El histórico legado no se valida al sincronizar.\n\n## Session Logs\n\n';
  const rows = [
    ['Main Task', 'main_task'], ['Tokens Without SCA', 'tokens_without_sca'],
    ['Tokens With SCA', 'tokens_with_sca'], ['Tokens Saved', 'tokens_saved'],
    ['Hit Density', 'hit_density'], ['Real Time', 'real_time_employed_hrs', ' hrs'],
    ['Estimated Time Saved', 'estimated_time_saved_hrs', ' hrs'],
    ['Estimated API Cost', 'estimated_api_cost'], ['Lines of Code (LoC)', 'loc'],
    ['LLM Model', 'llm_model_used'], ['Context Bridge Issued', 'context_bridge_issued'],
    ['Execution Loops', 'execution_loops'], ['Result', 'result']
  ];
  for (const record of records) {
    md += `### Session: ${cell(record.created_at)}\n\n| Field | Value |\n|-------|-------|\n`;
    for (const [title, field, suffix] of rows) md += `| **${title}** | ${cell(record[field], suffix)} |\n`;
    md += '\n';
  }
  const history = extractWeeklyHistory(oldMarkdown);
  if (history) md += '---\n\n' + history;
  return md;
}

function renderLedger(records, projectName, syncedAt) {
  let md = `# 🐝 Swarm Ledger (SCA Matrix Mirror)\n> **Source of Truth:** PostgreSQL (SCA Matrix - FSCA)\n> **Project:** ${cell(projectName)}\n> **Last Synced:** ${syncedAt}\n\n`;
  const sprints = new Map();
  for (const record of records) {
    if (!sprints.has(record.sprint_name)) sprints.set(record.sprint_name, []);
    sprints.get(record.sprint_name).push(record);
  }
  for (const [sprint, tasks] of sprints) {
    md += `## Sprint/Tarea: ${cell(sprint)}\n\n| Nodo | Tarea | Estado |\n|---|---|---|\n`;
    for (const task of tasks) md += `| ${cell(task.node_id)} | ${cell(task.task_desc)} | ${cell(task.status)} |\n`;
    md += '\n';
  }
  return md;
}

module.exports = {optionalNumber, parseArguments, buildManualMetric, renderMetrics, renderLedger, extractWeeklyHistory};
