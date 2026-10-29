# 📊 SCA Metrics (Smart Context Architecture) v2.6

> **Purpose:** Tracking the effectiveness of the AI-powered development pattern (Gatekeeper Protocol).
> 
> **Last updated:** 2026-09-10
> **Purpose:** Track real framework usage metrics for SCA v3.0

## Global Framework Telemetry

| Metric | Value | Target/Benchmark |
|--------|-------|------------------|
| Average Strict Approval Rate | 98% | > 95% |
| Avg. DAG Execution Time | 8s/node | < 15s |
| Token Overflow Incidents | 0 | 0 |
| DAG Complexity Limit | 3-5 Nodes | Max 5 Nodes per sprint |
| Hybrid Mode Sync Latency | ~3s | < 5s (Polling based) |
| DAG Checkpoint Density | 1.0 | 1 commit/node completado |
| Rollback Recovery Rate | 100% | > 90% (Recuperación sin abortar) |

---

## Session Logs (SCA Studio Architecture)

### Session: 2026-09-10 17:50-

## 🕒 Latencia de Desarrollo (Time Tracking)

| Ronda de Trabajo | Tarea Principal | Tiempo Estimado (min) | Tiempo Real (min) | Desviación |
|------------------|-----------------|-----------------------|-------------------|------------|
| R1 | Infraestructura v2.6 | 60 | 45 | -25% |

---

## 📝 Session Logs

### Session: 2026-05-01 17:50

| Field | Value |
|-------|-------|
| **Main Task** | Reconstrucción de AI_CONTEXT en raíz |
| **AI_CONTEXT Files Read** | 6 |
| **Tokens (Without SCA)** | 100,000 |
| **Tokens (With SCA)** | 5,000 |
| **Tokens Saved (by SCA)** | 95,000 |
| **Checkpoints Creados (Git)** | 3 |
| **Rollbacks Ejecutados** | 0 |
| **Tokens Salvados (por Checkpoints)** | 0 |
| **Densidad de Acierto** (Func. / Commits) | `1 / 1` = **1.0** |
| **Context Bridge Issued** | ✅ |
| **Gatekeeper `/sca_dev_flow` Used** | ✅ |
| **LLM Model Used** | Gemini 3.1 Pro |
| **Estimated Time Saved** | 2.0 hours |
| **Estimated API Cost** | $0.05 |
| **Lines of Code (LoC)** | +45 / -10 |
| **Execution Loops** | 1 |
| **Result** | ✅ Success |

---

## 📊 Weekly History

| Week | Sessions | CB Coverage | Success 1st | Token Savings | Hit Density | Checkpoints | Rollbacks | LLM Model |
|--------|----------|-------------|-----------|---------------|-------------|-------------|-----------|-----------|
| W18-2026 | 1 | 100% | 100% | 40,000 | 1.0 | 2 | 0 | Gemini 3.1 Pro |
| W37-2026 | 8 | 100% | 98% | 95,000 | 1.0 | 20 | 1 | Claude Sonnet 4.6 |
| W37-2026 | 9 | 100% | 100% | 42,000 | 1.0 | 18 | 0 | Claude Sonnet 4.6 |
| W37-2026 | 10 | 100% | 100% | 35,000 | 1.0 | 15 | 0 | Gemini 3.1 Pro |
| W37-2026 | 11 | 100% | 100% | 20,000 | 1.0 | 10 | 0 | Gemini 3.1 Pro |
| W37-2026 | 12 | 100% | 100% | 15,000 | 1.0 | 12 | 0 | GPT-OSS 128B |
| **TOTALES** | **51** | **100%** | **99.6%** | **247,000** | **1.0** | **77** | **1** | **N/A** |

---

## 📋 Update Instructions

At the **end of each session**, the agent must:

1. **Audit Logs**: Consult the system audit log via `metric_extractor`.
2. **Quantify Savings**: Calculate tokens NOT read thanks to `codebase_map.md` filtering.
3. **Update Logs**: Add an entry in "Session Logs" and update "Metrics Dashboard".

| 2026-09-11 | Integración ROI A/B Benchmark | 3 | **Success** | 4 | 200 | 1 / 1 | Sí | Iterative Generation | 0 | Strict |











