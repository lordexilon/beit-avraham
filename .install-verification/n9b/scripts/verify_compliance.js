const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkCompliance() {
    try {
        // Obtener archivos en stage (a punto de ser commiteados)
        const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
        
        if (!stagedFiles.trim()) {
            return; // Nada que verificar
        }

        const filesArray = stagedFiles.split('\n').filter(Boolean);
        
        // Criterio SCA: Si hubo cambios en el código, el ledger de auditoría, contexto o métricas deben haberse actualizado.
        const isAudited = filesArray.some(file => 
            file.includes('swarm_ledger.md') || 
            file.includes('metricas_sca.md') ||
            file.includes('active_context.md')
        );

        if (!isAudited) {
            console.error('\n' + '='.repeat(60));
            console.error(' 🛑 [SCA FRAMEWORK] ENFORCEMENT ACTIVO: CÓDIGO FANTASMA RECHAZADO 🛑');
            console.error('='.repeat(60));
            console.error('Estás intentando hacer un commit de código modificado sin actualizar');
            console.error('la Matriz SCA (swarm_ledger.md, metricas_sca.md o active_context.md).');
            console.error('\nPara mantener el framework 100% auditable y preciso, debes');
            console.error('registrar las métricas de esta sesión antes de commitear.');
            console.error('\nPor gobernanza estricta, este commit ha sido bloqueado.');
            console.error('='.repeat(60) + '\n');
            process.exit(1);
        }

        console.log('✅ [SCA FRAMEWORK] Compliance verificada (Auditoría detectada).');
        process.exit(0);

    } catch (error) {
        console.error('Error al verificar SCA Compliance:', error.message);
        // Fallback seguro: permitir commit si falla el script por entorno
        process.exit(0);
    }
}

checkCompliance();
