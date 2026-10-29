Implementar prepare(src,dest,binding) en bootstrap.cjs: copiar scripts y migrations obligatorios, guardar binding valido, omitir secretos y fallar si faltan piezas o si destino no esta vacio. Es ejercicio aislado de bootstrap, no certificacion del instalador real.

{
  "automated": "node --test acceptance.cjs",
  "manual": [
    "Para certificar instalacion real ejecutar adicionalmente instalador original, Matrix aislada, captura y verificacion API/UI; este fixture solo evalua bootstrap"
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
