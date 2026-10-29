const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SCA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SCA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan credenciales de Supabase en .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const {readProjectBinding,assertProject}=require('../sca-studio/src/lib/project-binding');
const projectName = process.argv[2] || readProjectBinding(path.resolve(__dirname,'../AI_CONTEXT'));
assertProject(path.resolve(__dirname,'..'),projectName);

// Separar contenido en chunks por encabezados markdown
function chunkMarkdown(content) {
  const chunks = [];
  const lines = content.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if (line.startsWith('#') && currentChunk.length > 200) {
      chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

async function getEmbedding(text) {
  if (!geminiApiKey) {
    console.warn("⚠️ No GEMINI_API_KEY. Usando vector aleatorio (mock) de dimensión 768.");
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values; // vector de 768 dimensiones
  } catch (err) {
    console.warn("⚠️ No se pudo cargar @google/generative-ai o falló la API. Usando vector mock 768.");
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }
}

async function main() {
  const contextDir = path.resolve(__dirname, '../AI_CONTEXT');
  console.log(`🧠 Iniciando Embedding RAG para el proyecto: ${projectName}`);

  const files = fs.readdirSync(contextDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    console.log(`\n📄 Procesando: ${file}`);
    const filePath = path.join(contextDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Eliminar chunks antiguos de este archivo
    await supabase.schema('fsca').from('knowledge_base')
      .delete()
      .eq('project_name', projectName)
      .eq('source_file', file);
      
    const chunks = chunkMarkdown(content);
    console.log(`   Generados ${chunks.length} chunks. Obteniendo embeddings...`);
    
    for (const chunk of chunks) {
      if (chunk.length < 10) continue; // Skip chunks vacíos
      
      const embedding = await getEmbedding(chunk);
      
      const { error } = await supabase.schema('fsca').from('knowledge_base').insert({
        project_name: projectName,
        source_file: file,
        content: chunk,
        embedding: embedding
      });
      
      if (error) {
        console.error(`   ❌ Error al insertar chunk:`, error.message);
      } else {
        process.stdout.write('.');
      }
    }
    console.log(`\n   ✅ ${file} indexado correctamente.`);
  }
  
  console.log(`\n🎉 Indexación RAG completada.`);
}

main().catch(console.error);
