const fs=require('node:fs');const path=require('node:path');
function readProjectBinding(context) {
 const directory=fs.realpathSync(context);
 const filename=path.join(directory,'project_binding.json');
 if(!fs.existsSync(filename)) throw new Error('Workspace sin project_binding.json: configura su proyecto antes de registrar datos.');
 const real=fs.realpathSync(filename),relative=path.relative(directory,real);
 if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative)) throw new Error('Vínculo de proyecto fuera del workspace.');
 const binding=JSON.parse(fs.readFileSync(real,'utf8').replace(/^\uFEFF/,''));
 if(typeof binding.project_name!=='string'||!binding.project_name.trim()||binding.project_name.length>200) throw new Error('project_name del workspace es obligatorio.');
 return binding.project_name.trim();
}
function assertProject(root,project) {
 const expected=readProjectBinding(path.join(root,'AI_CONTEXT'));
 if(project!==expected) throw new Error(`El registro pertenece a ${expected}; project_name no coincide con el workspace.`);
 return expected;
}
module.exports={readProjectBinding,assertProject};
