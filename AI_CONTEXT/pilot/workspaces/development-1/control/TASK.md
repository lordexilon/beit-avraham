Implementar mount(container, lines) en study.cjs y una pagina de demostracion. Seleccion unica por click y teclado, aria-pressed, notas temporales por linea, sin HTML inseguro. No agregar dependencias.

{
  "automated": "node --test acceptance.cjs",
  "manual": [
    "Pagina funciona en navegador a 320px y desktop",
    "Botones accesibles por Tab y Enter; solo uno aria-pressed=true",
    "Texto con etiquetas se muestra literal; notas conservadas al cambiar seleccion"
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
