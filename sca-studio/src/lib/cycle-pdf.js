// The same scoped dashboard supplies both spreadsheet and PDF exports.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
function encodable(font,value) {
  return Array.from(String(value)).map(char=>{
    try{font.encodeText(char);return char;}catch{return '\\u{'+char.codePointAt(0).toString(16)+'}';}
  }).join('');
}
function wrap(font,text,size,width) {
  const lines=[];let line='';
  for(const word of text.split(/\s+/)) {
    const combined=line?line+' '+word:word;
    if(font.widthOfTextAtSize(combined,size)<=width) {line=combined;continue;}
    if(line) {lines.push(line);line='';}
    for(const char of word) {
      if(font.widthOfTextAtSize(line+char,size)>width) {lines.push(line);line='';}
      line+=char;
    }
  }
  if(line) lines.push(line);return lines;
}
async function createCyclePdf(data) {
  const cycle=data.measurement.active_cycle;
  if(!cycle) throw new Error('PDF requiere ciclo activo.');
  const doc=await PDFDocument.create(),regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle('SCA - '+data.measurement.project_name+' - '+cycle.id);doc.setAuthor('SCA Studio');
  doc.setCreationDate(new Date(data.updated_at));doc.setModificationDate(new Date(data.updated_at));
  let page,y;
  const newPage=()=>{page=doc.addPage([595.28,841.89]);y=788;
    page.drawText('SCA Studio | '+encodable(bold,data.measurement.project_name),{x:42,y:y+14,size:12,font:bold,color:rgb(0.04,0.3,0.27)});
    page.drawLine({start:{x:42,y:y+5},end:{x:553,y:y+5},thickness:0.7,color:rgb(0.7,0.75,0.75)});y-=14;};
  const paragraph=(value,size=10,strong=false)=>{
    const font=strong?bold:regular,text=encodable(font,value);
    for(const line of wrap(font,text,size,511)) {if(y<58) newPage();page.drawText(line,{x:42,y,size,font,color:rgb(0.12,0.15,0.18)});y-=size+5;}
  };
  const section=title=>{if(y<100) newPage();y-=10;paragraph(title,13,true);y-=5;};
  const valueText=value=>value==null?'Pendiente':typeof value==='number'?value.toLocaleString('es-PY',{maximumFractionDigits:6}):String(value);
  const height=(value,size,strong=false)=>wrap(strong?bold:regular,encodable(strong?bold:regular,value),size,511).length*(size+5);
  const table=(title,rows)=>{section(title);if(!rows?.length) {paragraph('Sin registros en este ciclo.');return;}
    rows.forEach((row,index)=>{const needed=20+Object.entries(row).reduce((sum,[key,value])=>sum+height(key+': '+valueText(value),9),0);if(needed<700&&y-needed<58)newPage();paragraph('Registro '+(index+1),10,true);for(const [key,value] of Object.entries(row)) paragraph(key+': '+valueText(value),9);y-=5;});};
  newPage();paragraph(cycle.name,16,true);paragraph('Ciclo: '+cycle.id);paragraph('Inicio: '+cycle.started_at);paragraph('Actualizado: '+data.updated_at);
  if(data.state==='empty') paragraph('Sin actividad registrada desde T0. Historico conservado fuera de este ciclo.',10,true);
  paragraph(data.note,9);section('Resumen');
  for(const card of data.cards) {const title=card.label+': '+card.text,detail=card.status+(card.coverage?' | '+card.coverage:'');if(y-height(title,11,true)-height(detail,9)-4<58)newPage();paragraph(title,11,true);paragraph(detail,9);y-=4;}
  table('Historial de capturas',data.history);table('Tiempos registrados',data.time);
  table('Valoraciones de capturas',data.costs);table('Otros costos del ciclo',data.exports.Otros_costos);table('Comparaciones por tarea',data.benchmarks);
  table('Cobertura',data.exports.Cobertura);table('Fuentes de captura',data.sources);
  paragraph('Las evidencias estructuradas completas se conservan en la exportacion Excel.',9);
  const pages=doc.getPages();pages.forEach((sheet,index)=>sheet.drawText('Ciclo '+cycle.id+' | Pagina '+(index+1)+'/'+pages.length,{x:42,y:30,size:8,font:regular,color:rgb(0.4,0.4,0.4)}));
  return doc.save();
}
module.exports={createCyclePdf};
