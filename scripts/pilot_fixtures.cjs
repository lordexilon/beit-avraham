const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=path.join(root,'AI_CONTEXT/pilot');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function bundle(category,n){
 const files={'package.json':JSON.stringify({private:true,scripts:{test:'node --test acceptance.cjs'}},null,2)+'\n'};
 let task,manual=[];
 if(category==='development'){
  task='Implementar mount(container, lines) en study.cjs y una pagina de demostracion. Seleccion unica por click y teclado, aria-pressed, notas temporales por linea, sin HTML inseguro. No agregar dependencias.';
  files['study.cjs']='exports.mount=function(container,lines){throw new Error("Pendiente");};\n';
  files['acceptance.cjs']=`const t=require('node:test'),a=require('node:assert/strict');const {mount}=require('./study.cjs');
class Element{constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.events={};this.textContent='';}appendChild(x){this.children.push(x);return x;}setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(k,f){this.events[k]=f;}dispatch(k,e={}){this.events[k]?.(e);}replaceChildren(){this.children=[];}get ownerDocument(){return {createElement:tag=>new Element(tag)};}}
t('seleccion y notas',()=>{const el=new Element('main');const api=mount(el,[{id:'a',text:'<script>texto</script>'},{id:'b',text:'Linea ${n}'}]);a.equal(typeof api.select,'function');a.equal(typeof api.note,'function');api.select('b');api.note('b','Mi nota');a.equal(api.getState().selectedId,'b');a.equal(api.getState().notes.b,'Mi nota');a.throws(()=>api.select('missing'));});
`;
  manual=['Pagina funciona en navegador a 320px y desktop','Botones accesibles por Tab y Enter; solo uno aria-pressed=true','Texto con etiquetas se muestra literal; notas conservadas al cambiar seleccion'];
 }else if(category==='bugfix'){
  task='Corregir activeAt(lines,seconds): inicio inclusivo, fin exclusivo; huecos y tiempos negativos devuelven null; no mutar ni ordenar el arreglo del llamador.';
  files['study.cjs']='exports.activeAt=(lines,seconds)=>lines.find(x=>seconds>=x.start&&seconds<=x.end)?.id??null;\n';
  files['acceptance.cjs']=`const t=require('node:test'),a=require('node:assert/strict'),{activeAt}=require('./study.cjs');t('fronteras y huecos',()=>{const lines=Object.freeze([Object.freeze({id:'a',start:0,end:${n+5}}),Object.freeze({id:'b',start:${n+5},end:${n+10}})]);a.equal(activeAt(lines,${n+5}),'b');a.equal(activeAt(lines,${n+10}),null);a.equal(activeAt(lines,-1),null);a.equal(activeAt([{id:'z',start:10,end:20}],5),null);a.equal(activeAt([],0),null);a.equal(activeAt(lines,0),'a');});\n`;
 }else if(category==='refactor'){
  task='Separar validacion y renderizado de summarize sin alterar el contrato; eliminar duplicacion. Mantener exports.summarize y no agregar dependencias.';
  files['study.cjs']=`exports.summarize=function(lines){if(!Array.isArray(lines))throw new Error('Invalid');let count=0,total=0;for(const x of lines){if(!x||typeof x.text!=='string')throw new Error('Invalid');count++;total+=x.text.length;}let texts=[];for(const x of lines){if(!x||typeof x.text!=='string')throw new Error('Invalid');texts.push(x.text.trim());}return {count,total,text:texts.join(' | ')};};\n`;
  files['acceptance.cjs']=`const t=require('node:test'),a=require('node:assert/strict'),{summarize}=require('./study.cjs');t('contrato conservado',()=>{a.deepEqual(summarize([{text:' a '},{text:'b${n}'}]),{count:2,total:5,text:'a | b${n}'});a.deepEqual(summarize([]),{count:0,total:0,text:''});for(const x of [null,{},[{}],[{text:3}]])a.throws(()=>summarize(x));});\n`;
  manual=['Revisar separacion de responsabilidades y duplicacion con la misma rubrica'];
 }else if(category==='context'){
  task='Agregar visibleSources(catalog,courseId) respetando politica de cursos pagos y fuentes propias/autorizadas documentada en docs/policy.md; no cambiar esa regla.';
  files['docs/policy.md']='Cursos pagos: permitir owned=true o permission=licensed. Nunca incluir una fuente externa gratuita sin permiso explicito. Filtrar por courseId y preservar orden.\n';
  files['catalog.cjs']=`module.exports=[{id:'own',courseId:'c${n}',owned:true},{id:'free',courseId:'c${n}',permission:'public'},{id:'licensed',courseId:'c${n}',permission:'licensed'},{id:'other',courseId:'other',owned:true}];\n`;
  files['study.cjs']='exports.visibleSources=()=>[];\n';
  files['acceptance.cjs']=`const t=require('node:test'),a=require('node:assert/strict'),{visibleSources}=require('./study.cjs'),catalog=require('./catalog.cjs');t('politica y alcance',()=>{a.deepEqual(visibleSources(catalog,'c${n}').map(x=>x.id),['own','licensed']);a.deepEqual(visibleSources(catalog,'missing'),[]);a.equal(catalog.length,4);});\n`;
 }else{
  task='Implementar prepare(src,dest,binding) en bootstrap.cjs: copiar scripts y migrations obligatorios, guardar binding valido, omitir secretos y fallar si faltan piezas o si destino no esta vacio. Es ejercicio aislado de bootstrap, no certificacion del instalador real.';
  files['bootstrap.cjs']='exports.prepare=()=>{throw new Error("Pendiente");};\n';
  files['acceptance.cjs']=`const t=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{prepare}=require('./bootstrap.cjs');t('bootstrap completo sin secretos',()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'pilot-'));try{const src=path.join(d,'src'),dest=path.join(d,'dest');fs.mkdirSync(path.join(src,'scripts'),{recursive:true});fs.mkdirSync(path.join(src,'migrations'));fs.writeFileSync(path.join(src,'scripts','capture.cjs'),'fixture ${n}');fs.writeFileSync(path.join(src,'migrations','001.sql'),'--fixture');fs.writeFileSync(path.join(src,'.env'),'secret fixture');const b={project_name:'TEST-${n}',cycle_id:'11111111-2222-3333-4444-555555555555'};prepare(src,dest,b);a.ok(fs.existsSync(path.join(dest,'scripts','capture.cjs')));a.ok(fs.existsSync(path.join(dest,'migrations','001.sql')));a.ok(!fs.existsSync(path.join(dest,'.env')));a.deepEqual(JSON.parse(fs.readFileSync(path.join(dest,'AI_CONTEXT','project_binding.json'))),b);a.throws(()=>prepare(src,dest,b));fs.renameSync(path.join(src,'migrations'),path.join(src,'missing'));a.throws(()=>prepare(src,path.join(d,'bad'),b));}finally{fs.rmSync(d,{recursive:true,force:true});}});\n`;
  manual=['Para certificar instalacion real ejecutar adicionalmente instalador original, Matrix aislada, captura y verificacion API/UI; este fixture solo evalua bootstrap'];
 }
 return {files,task,manual};
}
function main(){
 if(fs.existsSync(path.join(base,'manifest.json')))throw new Error('Manifest existente; no sobrescribir referencias congeladas');
 const binding=JSON.parse(fs.readFileSync(path.join(root,'AI_CONTEXT/project_binding.json')));
 const pairs=[];for(const category of ['development','bugfix','refactor','context','installation'])for(let n=1;n<=3;n++){
  const id=category+'-'+n,{files,task,manual}=bundle(category,n);
  const snapshot_hash=hash(JSON.stringify(Object.entries(files).sort(([a],[b])=>a.localeCompare(b))));
  const acceptance={automated:'node --test acceptance.cjs',manual,rubric:['correctness','readability','responsibilities','maintainability'],minimum_each:1,max_regressions:0};
  for(const arm of ['control','sca']){const dir=path.join(base,'workspaces',id,arm);fs.mkdirSync(dir,{recursive:true});for(const [name,content]of Object.entries(files)){const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}fs.writeFileSync(path.join(dir,'TASK.md'),task+'\n\n'+JSON.stringify(acceptance,null,2)+'\n');}
  pairs.push({id,category,snapshot_hash,file_hashes:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(v)])),task,acceptance,order:n%2?['control','sca']:['sca','control'],time_limit_minutes:30});
 }
 const manifest={version:1,...binding,created_at:new Date().toISOString(),status:'prepared_not_executed',pairs};
 fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({pairs:pairs.length,executions:pairs.length*2,status:manifest.status}));
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports={bundle,hash};
