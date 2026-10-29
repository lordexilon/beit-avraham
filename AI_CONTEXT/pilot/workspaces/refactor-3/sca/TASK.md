Separar validacion y renderizado de summarize sin alterar el contrato; eliminar duplicacion. Mantener exports.summarize y no agregar dependencias.

{
  "automated": "node --test acceptance.cjs",
  "manual": [
    "Revisar separacion de responsabilidades y duplicacion con la misma rubrica"
  ],
  "rubric": [
    "correctness",
    "readability",
    "responsibilities",
    "maintainability"
  ],
  "minimum_each": 1,
  "max_regressions": 0
}
