const ALGORITHM = 'sca-model-cost-v1';
const COMPONENTS = ['input', 'output', 'cache_read', 'cache_write_5m', 'cache_write_1h'];
function count(value) {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Contador inválido.');
  return value;
}
function amount(value) {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Importe inválido.');
  return value;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('Se requiere fecha de ejecución ISO con zona horaria.');
  }
  return Date.parse(value);
}
function adaptUsage(provider, raw = {}, options = {}) {
  const zero = {input: null, output: null, cache_read: null, cache_write_5m: null, cache_write_1h: null};
  if (provider === 'google') {
    const input = count(raw.promptTokenCount), cached = count(raw.cachedContentTokenCount ?? 0);
    if (input !== null && cached > input) throw new Error('Caché superior al prompt.');
    const output = count(raw.candidatesTokenCount), thinking = count(raw.thoughtsTokenCount ?? 0);
    return {input: input === null ? null : input - cached, output: output === null ? null : output + thinking,
      cache_read: cached, cache_write_5m: 0, cache_write_1h: 0};
  }
  if (provider === 'anthropic') {
    const writes = count(raw.cache_creation_input_tokens ?? 0);
    const breakdown = raw.cache_creation;
    let short = count(breakdown?.ephemeral_5m_input_tokens ?? (writes === 0 ? 0 : null));
    let long = count(breakdown?.ephemeral_1h_input_tokens ?? (writes === 0 ? 0 : null));
    if (!breakdown && options.cache_ttl === '5m') { short = writes; long = 0; }
    if (!breakdown && options.cache_ttl === '1h') { short = 0; long = writes; }
    if (short !== null && long !== null && short + long !== writes) throw new Error('Desglose de caché inconsistente.');
    return {input: count(raw.input_tokens), output: count(raw.output_tokens),
      cache_read: count(raw.cache_read_input_tokens ?? 0), cache_write_5m: short, cache_write_1h: long};
  }
  if (provider === 'openai') {
    const input = count(raw.input_tokens ?? raw.prompt_tokens);
    const details = raw.input_tokens_details ?? raw.prompt_tokens_details;
    const cached = count(details?.cached_tokens ?? null), writes = count(details?.cache_write_tokens ?? 0);
    if (input !== null && cached !== null && cached + writes > input) throw new Error('Caché superior a entrada.');
    // Output already includes reasoning; do not add reasoning_tokens again.
    return {input: input === null || cached === null ? null : input - cached - writes,
      output: count(raw.output_tokens ?? raw.completion_tokens), cache_read: cached,
      cache_write_5m: writes, cache_write_1h: 0};
  }
  if (provider === 'normalized') return Object.fromEntries(COMPONENTS.map(key => [key, count(raw[key])]));
  return zero;
}
function bounds(value, integer = false) {
  const text = typeof value === 'string' ? value : '';
  const match = /^(\[|\()(.*),(.*)(\]|\))$/.exec(text);
  if (!match) throw new Error('Intervalo de tarifa inválido.');
  const convert = v => !v ? null : integer ? Number(v) : Date.parse(v.replace(/^"|"$/g, ''));
  const low = convert(match[2]), high = convert(match[3]);
  if ((low !== null && !Number.isFinite(low)) || (high !== null && !Number.isFinite(high))) throw new Error('Intervalo inválido.');
  return {low, high, includeLow: match[1] === '[', includeHigh: match[4] === ']'};
}
function within(value, range) {
  return (range.low === null || value > range.low || (range.includeLow && value === range.low))
    && (range.high === null || value < range.high || (range.includeHigh && value === range.high));
}
function selectRate(rates, modelId, occurredAt, serviceMode, contextTokens) {
  const candidates = rates.filter(rate => rate.model_id === modelId && rate.service_mode === serviceMode
    && within(date(occurredAt), bounds(rate.effective_during)));
  if (contextTokens === null) {
    if (candidates.length === 1) {
      const range = bounds(candidates[0].context_tokens, true);
      if (range.low === 0 && range.high === null) return candidates[0];
    }
    return null;
  }
  const matches = candidates.filter(rate => within(contextTokens, bounds(rate.context_tokens, true)));
  if (matches.length > 1) throw new Error('Tarifas ambiguas; no seleccionar arbitrariamente.');
  return matches[0] || null;
}
function prices(rate) {
  // A generic write component is the short TTL. The long TTL is separately versioned in rules.
  return {input: amount(NumberOrNull(rate.input_usd_per_million)), output: amount(NumberOrNull(rate.output_usd_per_million)),
    cache_read: amount(NumberOrNull(rate.cache_read_usd_per_million)),
    cache_write_5m: amount(NumberOrNull(rate.cache_write_usd_per_million)),
    cache_write_1h: amount(NumberOrNull(rate.pricing_rules?.cache_write_1h_usd_per_million))};
}
function NumberOrNull(value) { return value == null ? null : Number(value); }
function resolveModel(input, models, aliases = []) {
  if (input.model_id) return models.find(model => model.id === input.model_id) || null;
  const exact = models.filter(model => model.canonical_model_id === input.model && model.provider === input.provider
    && model.modality === input.modality && model.identity_status === 'identified');
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error('Identidad ambigua.');
  const mappings = aliases.filter(alias => alias.project_name === input.project_name && alias.recorded_label === input.model
    && alias.provider === input.provider && alias.modality === input.modality);
  if (mappings.length === 1) return models.find(model => model.id === mappings[0].model_id) || null;
  return null;
}
function calculate(input, model, rates) {
  date(input.occurred_at);
  if (!['provider','measured','declared','assumed','unknown'].includes(input.usage_origin)) throw new Error('Origen del consumo obligatorio.');
  const result = {model_id: model?.id ?? null, status: 'unknown', estimated_usd: null, confirmed_usd: null,
    rate_version_id: null, rate_snapshot: null, algorithm_version: ALGORITHM, usage: {}, calculation: {}, reason: ''};
  // Usage is evidence independent of the availability of a model tariff.
  if (input.total_tokens != null && !input.usage && !input.usageMetadata) result.usage={total_tokens:count(input.total_tokens)};
  else if (input.usage || input.usageMetadata) result.usage=adaptUsage(input.usage_format || model?.provider,input.usageMetadata || input.usage,input);
  if (!model) return {...result, reason: 'Modelo, proveedor o modalidad sin identificar'};
  if (input.provider && input.provider !== model.provider) throw new Error('Proveedor no coincide con el modelo.');
  if (input.modality && input.modality !== model.modality) throw new Error('Modalidad no coincide con el registro.');
  if (model.modality === 'local') return {...result, status: 'local_zero', estimated_usd: 0, reason: 'Política usuario: ejecución local sin costo'};
  if (input.confirmed_usd != null) {
    const confirmed = amount(input.confirmed_usd);
    if (typeof input.invoice_evidence !== 'string' || !input.invoice_evidence.trim()) throw new Error('Cargo requiere evidencia.');
    return {...result, status: 'confirmed', confirmed_usd: confirmed, reason: 'Cargo confirmado por evidencia del proveedor'};
  }
  if (model.modality === 'subscription') {
    const allocation = input.subscription_allocation;
    if (!allocation) return {...result, reason: 'Suscripción sin regla de asignación declarada'};
    const start = date(allocation.period_start), end = date(allocation.period_end), when = date(input.occurred_at);
    const paid = amount(allocation.period_usd), total = amount(allocation.total_hours), used = amount(allocation.project_hours);
    if ([paid,total,used].some(v => v === null) || total <= 0 || used > total || !(start <= when && when < end)) {
      throw new Error('Asignación de suscripción inválida.');
    }
    return {...result, status: 'provisional', estimated_usd: paid * used / total,
      calculation: {kind: 'subscription_allocation', allocation}, reason: 'Costo asignado declarado; no sumar equivalente API como otro cargo'};
  }
  if (model.identity_status !== 'identified' || model.modality !== 'api') return {...result, reason: 'Identificación API pendiente'};
  if (input.total_tokens != null && !input.usage && !input.usageMetadata) {
    const total = count(input.total_tokens);
    const candidates = rates.filter(rate => rate.model_id === model.id && rate.service_mode === (input.service_mode || 'standard')
      && within(date(input.occurred_at), bounds(rate.effective_during)) && (bounds(rate.context_tokens, true).low ?? 0) <= total);
    const unitPrices = [];
    for (const rate of candidates) {
      const values = prices(rate);
      const supported = rate.pricing_rules?.supported_components;
      if (!Array.isArray(supported) || !supported.length || supported.some(key => !COMPONENTS.includes(key) || values[key] == null)) {
        return {...result, reason: 'No hay límites verificables para estimar consumo sin desglose'};
      }
      unitPrices.push(...supported.map(key => values[key]));
    }
    if (!unitPrices.length) return {...result, reason: 'Sin tarifa aplicable para el rango aproximado'};
    return {...result, status: 'provisional', usage: {total_tokens: total},
      calculation: {kind: 'token_only_range', range_usd: {low: total * Math.min(...unitPrices) / 1000000,
        high: total * Math.max(...unitPrices) / 1000000}, tariff_scenarios: candidates,
        extras_complete: false, assumption: 'Reparto entrada/salida/caché desconocido; rango solo de tokens, excluye extras'},
      reason: 'Rango provisional sin desglose; no es un costo exacto ni completo'};
  }
  const usage = adaptUsage(input.usage_format || model.provider, input.usageMetadata || input.usage || {}, input);
  result.usage = usage;
  const context = [usage.input, usage.cache_read, usage.cache_write_5m, usage.cache_write_1h].every(v => v !== null)
    ? usage.input + usage.cache_read + usage.cache_write_5m + usage.cache_write_1h : null;
  const rate = selectRate(rates, model.id, input.occurred_at, input.service_mode || 'standard', context);
  if (!rate) return {...result, reason: 'Falta tarifa vigente o desglose para determinar umbral de contexto'};
  result.rate_version_id = rate.id;
  result.rate_snapshot = JSON.parse(JSON.stringify(rate));
  const componentPrices = prices(rate);
  const breakdown = {};
  for (const key of COMPONENTS) {
    if (usage[key] === null || (usage[key] > 0 && componentPrices[key] === null)) {
      return {...result, reason: `Falta consumo o tarifa de ${key}`};
    }
    breakdown[key] = usage[key] === 0 ? 0 : usage[key] * componentPrices[key] / 1000000;
  }
  const cost = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
  amount(cost);
  const extras = input.extras_usd == null ? 0 : amount(input.extras_usd);
  const provisional = rate.basis !== 'official' || input.usage_origin === 'assumed' || input.extras_complete !== true;
  return {...result, status: provisional ? 'provisional' : 'estimated', estimated_usd: cost + extras,
    calculation: {breakdown, extras_usd: extras, extras_complete: input.extras_complete === true, kind: 'api_equivalent'},
    reason: provisional ? 'Estimación parcial o con supuestos; extras no cubiertos si no se declaran completos' : 'Consumo y tarifa aplicable; equivalente API, no factura'};
}

module.exports = {ALGORITHM, adaptUsage, selectRate, resolveModel, calculate};
