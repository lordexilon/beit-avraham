# Protocolo de Validación Humana y Métricas de Negocio (SCA v3.1)

Fecha: 2026-10-10. Proyecto: Beit Avraham. Ciclo: 11111111-2222-3333-4444-555555555555.

---

## 1. Justificación y Alcance

Las evaluaciones previas (incluido el piloto N12 de 15 pares / 30 ejecuciones) demostraron que:
1. SCA consumió más tokens que el control en 15/15 pares y tuvo mayor duración en 13/15.
2. Demos automatizadas que superaron pruebas unitarias fallaron en el navegador real.
3. No se midió el tiempo humano dedicado a redactar prompts, auditar diffs, probar en navegador y corregir fallos.

Por lo tanto, la hipótesis comercial de SCA **no es el ahorro bruto de tokens**, sino:
> **«SCA reduce el tiempo humano total, minimiza el retrabajo y provee gobernanza verificable en tareas complejas de desarrollo con IA.»**

---

## 2. Rúbrica de Aceptación Humana (Doble Ciego / Paridad Funcional)

Para comparar válidamente un resultado Control vs. SCA, un desarrollador o responsable de producto debe evaluar ambos artefactos bajo idénticos criterios:

| Dimensión | Criterio de Aprobación | Método de Comprobación | Estado |
|---|---|---|---|
| **1. Paridad de Requisitos** | Cumple el 100 % de los criterios funcionales especificados en la tarea. | Checklist funcional en navegador / runtime real. | Aprobado / Rechazado |
| **2. Calidad en Navegador/UI** | Sin desbordamientos de layout, errores de consola ni advertencias críticas de renderizado. | Inspección manual en viewport de escritorio y móvil. | Aprobado / Rechazado |
| **3. Mantenibilidad del Código** | TypeScript estricto, sin any injustificados, sin código muerto ni comentarios engañosos. | Linter + revisión de diffs por pares. | Aprobado / Rechazado |
| **4. Integración y Build** | El build compila limpiamente (`npm run build`) y las pruebas unitarias pasan. | Ejecución en consola limpia. | Aprobado / Rechazado |

> [!IMPORTANT]  
> Si uno de los resultados falla la revisión humana (por ejemplo, pasa pruebas pero falla en navegador), **no se computa como ahorro**. El resultado debe computarse como **Defectuoso** y registrar los minutos adicionales requeridos para repararlo.

---

## 3. Modelo de Registro de Tiempos y Retrabajo

### A. Tiempos Humanos (`task_time.cjs`)
Se separan taxativamente del tiempo de inferencia del LLM:
* **$T_{\text{prep}}$ (Minutos de preparación)**: Tiempo invertido por la persona en definir especificaciones, preparar prompts y estructurar el contexto.
* **$T_{\text{rev}}$ (Minutos de revisión)**: Tiempo invertido en auditar diffs, probar la aplicación y verificar la rúbrica.
* **$T_{\text{corr}}$ (Minutos de corrección / retrabajo)**: Tiempo invertido en guiar al agente para subsanar errores o corregir código manualmente tras un fallo.
* **$T_{\text{humano\_total}} = T_{\text{prep}} + T_{\text{rev}} + T_{\text{corr}}$**.

### B. Métrica de Retrabajo
* **Número de iteraciones de corrección**: Cantidad de prompts adicionales necesarios hasta lograr un entregable aprobado.
* **Tasa de éxito al primer intento (First-Pass Yield)**: % de tareas que superan la revisión humana sin requerir corrección.

---

## 4. Fórmula de Costo Total por Tarea Aceptada ($CT$)

$$CT = C_{\text{inferencia}} + (T_{\text{humano\_total}} \times \text{Tarifa Horaria Humana})$$

Donde:
* $C_{\text{inferencia}}$: Costo de API o proporción de suscripción auditada.
* Tarifa Horaria Humana de referencia estándar: USD 50/h (USD 0,833/minuto) o tarifa de equipo del cliente.

**Ejemplo comparativo hipotético:**
* **Control sin estructura**: Inferencia USD 0,05. $T_{\text{humano}}$ = 25 min (incluyendo corrección de bugs en navegador). Costo total: $0,05 + (25 \times 0,833) = \text{USD } 20,88$.
* **SCA con gobernanza**: Inferencia USD 0,15 (3x más tokens). $T_{\text{humano}}$ = 8 min (aprobado al primer intento). Costo total: $0,15 + (8 \times 0,833) = \text{USD } 6,81$.
* **Ahorro real de negocio**: **USD 14,07 (67 % de ahorro económico real)** a pesar de consumir más tokens.

---

## 5. Instrumentación en Beit Avraham

1. **Apertura y Cierre:** Usar `task_workflow.cjs start` y `task_workflow.cjs finish` vinculados a un archivo JSON con `task_key`.
2. **Registro de Pausas:** El revisor humano utiliza `node scripts/task_time.cjs pause` y `resume` para aislar interrupciones externas.
3. **Persistencia de Evaluación:** Persistir la rúbrica y las horas mediante `node scripts/task_evaluation.cjs --record` sólo cuando exista aceptación documentada.
