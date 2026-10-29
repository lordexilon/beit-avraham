import os
import json
import subprocess
from datetime import datetime

class SCAMetricExtractor:
    def __init__(self, context_path="AI_CONTEXT", logs_path="logs"):
        self.context_path = context_path
        self.logs_path = logs_path
        self.metrics_file = os.path.join(context_path, "metricas_sca.md")
        self.codebase_map = os.path.join(context_path, "codebase_map.md")
        self.audit_log = os.path.join(logs_path, "audit_log.json")

    def get_token_savings(self, files_read_count):
        """
        Calcula el ahorro de tokens basado en archivos no leídos del codebase_map.
        Simulación simple: asume un promedio de 2k tokens por archivo.
        """
        try:
            with open(self.codebase_map, 'r', encoding='utf-8') as f:
                content = f.read()
                # Cuenta las líneas que parecen ser archivos (ej. - [archivo.ext])
                total_files = content.count("- [") 
            
            savings = max(0, (total_files - files_read_count) * 2000)
            return savings
        except Exception:
            return 0

    def get_git_metrics(self):
        """
        Obtiene métricas de commits atómicos desde el último log de métricas.
        """
        try:
            # Ejemplo: Commits en las últimas 24 horas
            cmd = ["git", "rev-list", "--count", "HEAD", "--since='24 hours ago'"]
            commits = int(subprocess.check_output(cmd).decode().strip())
            return commits
        except Exception:
            return 1 # Fallback

    def extract_audit_success(self):
        """
        Lee el audit_log para validar funcionalidades.
        Falla si el archivo no existe para no simular métricas falsas.
        """
        if not os.path.exists(self.audit_log):
            raise FileNotFoundError(f"El archivo de auditoría {self.audit_log} no existe. No se puede calcular el hit_density real.")
        
        try:
            with open(self.audit_log, 'r') as f:
                logs = json.load(f)
                # Contar eventos de 'success' o 'milestone_reached'
                success_count = sum(1 for log in logs if log.get('status') == 'success')
                return success_count
        except json.JSONDecodeError:
            raise ValueError(f"El archivo de auditoría {self.audit_log} no es un JSON válido.")

    def generate_report(self, session_files_read=5):
        commits = self.get_git_metrics()
        successes = self.extract_audit_success()
        savings = self.get_token_savings(session_files_read)
        
        hit_density = successes / commits if commits > 0 else 0
        
        report = {
            "token_delta": savings,
            "hit_density": round(hit_density, 2),
            "commits": commits,
            "validated_features": successes,
            "timestamp": datetime.now().isoformat()
        }
        
        return report

if __name__ == "__main__":
    extractor = SCAMetricExtractor()
    print(json.dumps(extractor.generate_report(), indent=2))
