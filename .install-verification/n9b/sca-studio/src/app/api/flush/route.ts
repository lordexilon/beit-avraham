import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const contextDir = path.join(process.cwd(), '../AI_CONTEXT');
    
    if (!fs.existsSync(contextDir)) {
      return NextResponse.json({ error: 'Directorio AI_CONTEXT no encontrado' }, { status: 404 });
    }

    const flushRequestPath = path.join(contextDir, 'FLUSH_REQUEST.md');

    const promptTemplate = `# 🚨 PROTOCOLO DE EMERGENCIA: ZERO-BLOAT FLUSH 🚨

> **INSTRUCCIÓN PRIORITARIA PARA EL AGENTE:**
> El humano ha detectado que la ventana de contexto está al límite (Token Fuel crítico) y ha presionado el botón "Forzar Memory Flush" en el SCA Studio.

## 🛠️ Acciones Inmediatas Requeridas:
1. **Pausa la tarea actual.**
2. **Lee todo el historial reciente de nuestra conversación.**
3. **Extrae los puntos clave, decisiones arquitectónicas y estado actual del código.**
4. **Actualiza el archivo \`active_context.md\` resumiendo la situación de manera ultra-concisa.**
5. **Borra tus memorias a corto plazo (limpieza cognitiva).**
6. **Elimina este archivo (\`FLUSH_REQUEST.md\`) del disco duro para confirmar que la purga se ha completado.**

*Una vez borres este archivo, la interfaz gráfica del SCA Studio dejará de alertar al usuario y tu memoria estará fresca para continuar.*`;

    // Escribir el archivo de "bengala"
    fs.writeFileSync(flushRequestPath, promptTemplate, 'utf8');

    return NextResponse.json({ success: true, message: 'Señal de Flush enviada al directorio AI_CONTEXT' });
  } catch (error) {
    console.error("Error disparando el Memory Flush", error);
    return NextResponse.json({ error: 'Error interno del servidor al crear el flush' }, { status: 500 });
  }
}
