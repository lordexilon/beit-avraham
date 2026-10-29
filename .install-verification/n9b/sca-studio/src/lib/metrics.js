const UNKNOWN = 'N/D';

/** @param {unknown} value @returns {number|null} */
function numericMetric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = /^\s*\$?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(?:\s*(?:hrs?|hours?|tkns|tokens|%|x))?\s*$/i.exec(value);
  if (!match) return null;
  const number = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

/** @param {number|null|undefined} value @param {number|null} digits */
function formatMetric(value, digits = null, suffix = '', prefix = '') {
  if (value == null || !Number.isFinite(value)) return UNKNOWN;
  const options=digits===null?{maximumFractionDigits:20}:{minimumFractionDigits:digits,maximumFractionDigits:digits};
  return prefix + value.toLocaleString('es-PY',options) + suffix;
}

function formatMetricValue(value) {
  const number=numericMetric(value);
  if(number==null) return value;
  const text=String(value).trim();
  const suffix=text.match(/\s*(hrs?|hours?|tkns|tokens|%|x)$/i)?.[1];
  return formatMetric(number,null,suffix?`${suffix==='%'||suffix==='x'?'':' '}${suffix}`:'',text.startsWith('$')?'$':'');
}

function cells(line) {
  const row = line.trim();
  if (!row.startsWith('|') || !row.endsWith('|')) return [];
  return row.slice(1, -1).split('|').map(value => value.trim().replace(/\*\*/g, '').replace(/&#124;/g, '|').replace(/<br>/g, '\n'));
}

function sessionFields(section) {
  const result = {};
  for (const line of section.split('\n')) {
    const row = cells(line);
    if (row.length === 2 && row[0] !== 'Field' && !/^-+$/.test(row[0])) result[row[0]] = row[1] || UNKNOWN;
  }
  return result;
}

const SOURCES = {
  totalTimeSaved: 'Estimated Time Saved', totalRealTime: 'Real Time',
  globalTokensSaved: 'Tokens Saved', globalTokensUsed: 'Tokens With SCA',
  globalHitDensity: 'Hit Density', totalLinesAdded: 'Lines of Code (LoC)',
  totalLinesRemoved: 'Lines of Code (LoC)', totalEstimatedApiCost: 'Estimated API Cost'
};

/** @param {string} content */
function parseMetrics(content) {
  const historyMatch = /^## (?:📊 )?Weekly History\s*$/m.exec(content);
  const sessionSection = historyMatch ? content.slice(0, historyMatch.index) : content;
  const sessions = sessionSection.split('### Session:').slice(1).map(sessionFields);
  const sessionDates = sessionSection.split('### Session:').slice(1).map(section => section.split('\n')[0].trim());
  const currentSession = Object.entries(sessions.at(-1) || {}).map(([name, value]) => ({
    name, value, target: '', numValue: numericMetric(value)
  }));
  const observedTotals = {};
  const coverage = {};
  const aggregates = {};
  for (const [target, field] of Object.entries(SOURCES)) {
    let sum = 0;
    let known = 0;
    for (const session of sessions) {
      let value;
      if (target === 'totalLinesAdded' || target === 'totalLinesRemoved') {
        const loc = /^\+?(\d+)\s*\/\s*-?(\d+)$/.exec(session[field] || '');
        value = loc ? Number(loc[target === 'totalLinesAdded' ? 1 : 2]) : null;
      } else {
        value = numericMetric(session[field]);
      }
      if (value !== null) { sum += value; known++; }
    }
    coverage[target] = {known, total: sessions.length};
    observedTotals[target] = known ? (target === 'globalHitDensity' ? sum / known : sum) : null;
    // A total is unknown if any session lacks this measurement.
    aggregates[target] = known && known === sessions.length ? observedTotals[target] : null;
  }
  const models = {};
  for (const session of sessions) {
    const model = session['LLM Model'] || session['LLM Model Used'];
    if (model && !['N/D', '-', 'Unknown'].includes(model)) models[model] = (models[model] || 0) + 1;
  }
  const historyData = [];
  if (historyMatch) {
    let headers = [];
    for (const line of content.slice(historyMatch.index).split('\n').slice(1)) {
      if (line.startsWith('## ')) break;
      const row = cells(line);
      if (row.includes('Week') && row.includes('Sessions')) { headers = row; continue; }
      if (!headers.length || row.length !== headers.length || /^:?-+:?$/.test(row[0]) || row[0] === 'TOTALES') continue;
      const record = Object.fromEntries(headers.map((header, i) => [header, row[i] || UNKNOWN]));
      historyData.push({
        Week: record.Week || UNKNOWN, Sessions: record.Sessions || UNKNOWN,
        'CB Coverage': record['CB Coverage'] || UNKNOWN, 'Success 1st': record['Success 1st'] || UNKNOWN,
        'Tokens Saved': record['Token Savings'] || record['Tokens Saved'] || UNKNOWN,
        'Hit Density': record['Hit Density'] || UNKNOWN, 'LLM Model': record['LLM Model'] || UNKNOWN
      });
    }
  }
  // Session records remain usable when this project's legacy weekly table is absent.
  // Keep shared model labels together: no per-model token allocation is known.
  if (!historyData.length) {
    sessions.forEach((session, index) => historyData.push({
      Week: `${sessionDates[index]} · ${session['Main Task'] || UNKNOWN}`,
      Sessions: '1', 'CB Coverage': bridgeCoverage(session['Context Bridge Issued']), 'Success 1st': UNKNOWN,
      'Tokens Saved': session['Tokens Saved'] || UNKNOWN,
      'Hit Density': session['Hit Density'] || UNKNOWN,
      'LLM Model': session['LLM Model'] || session['LLM Model Used'] || UNKNOWN
    }));
  }
  return {
    currentSession, historyData,
    globalAggregates: {...aggregates, totalSessions: sessions.length,
      modelsSummary: Object.entries(models).map(([model, count]) => `${model}(${count})`).join(', '),
      coverage, observedTotals}
  };
}

function bridgeCoverage(value) {
  const text=String(value ?? '').trim().toLowerCase();
  if (['true','yes','sí','si','1'].includes(text)) return '100%';
  if (['false','no','0'].includes(text)) return '0%';
  return UNKNOWN;
}

function formatHistoryPercent(history, field) {
  let total=0,known=0,weighted=0;
  for(const row of history) {
    const sessions=numericMetric(row.Sessions);
    if(sessions==null||sessions<0) return UNKNOWN;
    total+=sessions;
    const text=String(row[field] ?? '').trim();
    const percentage=text.endsWith('%')?numericMetric(text):null;
    if(percentage!=null&&percentage>=0&&percentage<=100) {known+=sessions;weighted+=percentage*sessions;}
  }
  if(!known) return UNKNOWN;
  return `${formatMetric(weighted/known,1,'%')} · ${known<total?'parcial':'completo'} (${known}/${total} registros)`;
}

/** @param {Array<Record<string, string>>} history */
function buildBenchmarks(history) {
  const models = new Map();
  for (const row of history) {
    const model = row['LLM Model'] || UNKNOWN;
    if (!models.has(model)) models.set(model, {sessions: [], tokens: [], density: [], success: []});
    const group = models.get(model);
    const count = numericMetric(row.Sessions);
    group.sessions.push(count);
    group.tokens.push(numericMetric(row['Tokens Saved']));
    const densityParts = (row['Hit Density'] || '').split('=');
    group.density.push({value: numericMetric(densityParts.at(-1)), count});
    const success = row['Success 1st'] || '';
    const percent = /%$/.test(success.trim()) ? numericMetric(success) : null;
    group.success.push({value: percent, count});
  }
  const completeSum = values => values.length && values.every(value => value !== null) ? values.reduce((sum, value) => sum + value, 0) : null;
  const weightedMean = values => {
    if (!values.every(row => row.value !== null && row.count !== null)) return null;
    const count = values.reduce((sum, row) => sum + row.count, 0);
    return count > 0 ? values.reduce((sum, row) => sum + row.value * row.count, 0) / count : null;
  };
  return [...models].map(([model, group]) => ({
    model, totalSessions: completeSum(group.sessions), totalTokensSaved: completeSum(group.tokens),
    avgHitDensity: weightedMean(group.density), success1stRate: weightedMean(group.success)
  })).sort((a, b) => (b.totalTokensSaved ?? -Infinity) - (a.totalTokensSaved ?? -Infinity));
}

/** Estimated saving as share of estimated manual baseline (real + saving). */
function timeSavingPercent(real, saving) {
  return real != null && saving != null && real >= 0 && saving >= 0 && real + saving > 0
    ? Math.round(saving / (real + saving) * 100) : null;
}

/** Display recorded values with explicit coverage; complete totals remain unknown.
 * @param {number|null} digits
 */
function formatObservedMetric(aggregates, field, digits = null, suffix = '', prefix = '') {
  const coverage = aggregates?.coverage?.[field];
  const value = aggregates?.observedTotals?.[field] ?? aggregates?.[field];
  const formatted = formatMetric(value, digits, suffix, prefix);
  if (value == null || !coverage) return formatted;
  return `${formatted} · ${coverage.known < coverage.total ? 'parcial' : 'completo'} (${coverage.known}/${coverage.total} registros)`;
}

/** @param {unknown} value */
function nonnegative(value, integer = false) {
  const n = numericMetric(value);
  if (n === null || n < 0 || (integer && !Number.isSafeInteger(n))) throw new Error('Se requiere un número no negativo válido.');
  return n;
}

/** Token input includes cached tokens; output must include billable reasoning. */
function estimateCost(usage, rate) {
  if (!usage || !rate) return null;
  const input = nonnegative(usage.input_tokens, true);
  const cached = nonnegative(usage.cached_input_tokens, true);
  const output = nonnegative(usage.output_tokens, true);
  if (cached > input) throw new Error('La caché no puede superar la entrada.');
  return ((input - cached) * nonnegative(rate.input_usd_per_million)
    + cached * nonnegative(rate.cached_input_usd_per_million)
    + output * nonnegative(rate.output_usd_per_million)) / 1000000;
}

function geminiUsage(metadata) {
  if (!metadata || metadata.promptTokenCount == null || metadata.candidatesTokenCount == null) return null;
  return {input_tokens: nonnegative(metadata.promptTokenCount, true),
    cached_input_tokens: nonnegative(metadata.cachedContentTokenCount ?? 0, true),
    output_tokens: nonnegative(metadata.candidatesTokenCount, true) + nonnegative(metadata.thoughtsTokenCount ?? 0, true)};
}

/** @param {number|null} forecast @param {number|null} estimated */
function costVariance(forecast, estimated) {
  if (forecast == null || estimated == null) return {delta: null, label: 'Falta previsión o consumo de sesión'};
  const delta = forecast - estimated;
  return {delta, label: `${delta >= 0 ? 'Dentro de previsión' : 'Sobre previsión'} (estimación API)`};
}

module.exports = {estimateCost, geminiUsage, costVariance, formatObservedMetric, formatHistoryPercent, formatMetricValue, numericMetric, formatMetric, parseMetrics, buildBenchmarks, timeSavingPercent};
