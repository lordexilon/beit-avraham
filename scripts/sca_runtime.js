const fs=require('node:fs');
const path=require('node:path');
function loadEnvironment(root){
  for(const name of ['sca-studio/.env.local','.env.local','.env']){
    const file=path.join(root,name);if(!fs.existsSync(file))continue;
    for(const line of fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').split('\n')){
      const match=line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if(match&&!process.env[match[1]])process.env[match[1]]=match[2].trim().replace(/^(['"])(.*)\1$/,'$2');
    }
  }
  process.env.SCA_SUPABASE_URL ||= process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SCA_SUPABASE_ANON_KEY ||= process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
const {createClient}=require('../sca-studio/node_modules/@supabase/supabase-js');
module.exports={loadEnvironment,createClient};
