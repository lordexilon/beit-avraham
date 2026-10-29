#!/usr/bin/env python3
import subprocess
import sys
import re

def get_staged_files():
    try:
        result = subprocess.run(['git', 'diff', '--cached', '--name-only'], 
                                capture_output=True, text=True, check=True)
        return [line.strip() for line in result.stdout.split('\n') if line.strip()]
    except subprocess.CalledProcessError:
        return []

def main():
    staged_files = get_staged_files()
    if not staged_files:
        return 0

    # Si hay cambios staged, verificamos si hay código que no sea AI_CONTEXT
    code_changes = False
    context_changes = False

    for file in staged_files:
        if file.startswith('AI_CONTEXT/'):
            context_changes = True
        else:
            code_changes = True

    if code_changes and not context_changes:
        print("\n\033[91m[SCA Compliance Error] 🚨 Bloqueo de Git Pre-commit\033[0m")
        print("Estás intentando hacer commit de código fuente sin actualizar la memoria de la IA.")
        print("El framework SCA v3.0 obliga a actualizar el Contexto Activo y las métricas al finalizar una sesión.")
        print("\nArchivos requeridos (al menos uno debe tener cambios staged):")
        print("  - AI_CONTEXT/active_context.md")
        print("  - AI_CONTEXT/swarm_ledger.md")
        print("  - AI_CONTEXT/metricas_sca.md")
        print("\nSi esto es intencional o es un hotfix, usa 'git commit --no-verify'.")
        print("========================================================================\n")
        sys.exit(1)

    sys.exit(0)

if __name__ == "__main__":
    main()
