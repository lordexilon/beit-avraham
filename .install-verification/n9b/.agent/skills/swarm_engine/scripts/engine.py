"""Headless DAG orchestration. Worker outputs are proposals, never applied code."""
import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.request
from datetime import datetime, timezone

DAG_FILE = os.path.join("AI_CONTEXT", "dag_payload.json")
NODE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,100}\Z")
SUCCESS = {"proposal_generated", "qa_passed", "approved"}
LEDGER_STATUS = {
    "running": "⏳ En progreso",
    "awaiting_review": "⏳ En revisión",
    "proposal_generated": "📝 Propuesta generada",
    "qa_passed": "✅ QA aprobado (código actual)",
    "approved": "✅ Resultado revisado (sin aplicación automática)",
    "failed": "❌ Fallido",
    "blocked": "🚫 Bloqueado por dependencia",
}


def validate_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("El payload debe ser un objeto JSON.")
    if payload.get("mode", "strict") not in {"strict", "autonomous"}:
        raise ValueError("Modo inválido: usa strict o autonomous.")
    for field in ("project_name", "sprint_name"):
        if not isinstance(payload.get(field), str) or not payload[field].strip():
            raise ValueError(f"{field} es obligatorio para persistencia CQRS.")
    nodes = payload.get("nodes")
    if not isinstance(nodes, list) or not nodes:
        raise ValueError("El DAG debe contener al menos un nodo.")
    ids = set()
    for node in nodes:
        if not isinstance(node, dict):
            raise ValueError("Cada nodo debe ser un objeto.")
        node_id = node.get("id")
        if not isinstance(node_id, str) or not NODE_ID.fullmatch(node_id):
            raise ValueError("ID de nodo inválido.")
        if node_id in ids:
            raise ValueError(f"ID duplicado: {node_id}")
        ids.add(node_id)
        if node.get("type", "worker") not in {"worker", "qa"}:
            raise ValueError(f"Tipo de nodo inválido: {node_id}")
        if not isinstance(node.get("task"), str) or not node["task"].strip():
            raise ValueError(f"Falta task en {node_id}")
        for field in ("files", "dependencies"):
            values = node.get(field, [])
            if not isinstance(values, list) or any(not isinstance(v, str) for v in values):
                raise ValueError(f"{field} debe ser una lista de strings: {node_id}")
        if len(set(node.get("dependencies", []))) != len(node.get("dependencies", [])):
            raise ValueError(f"Dependencias duplicadas: {node_id}")
    remaining = {n["id"]: set(n.get("dependencies", [])) for n in nodes}
    for node_id, deps in remaining.items():
        if not deps <= ids:
            raise ValueError(f"Dependencia inexistente: {node_id}")
    done = set()
    while remaining:
        ready = {node_id for node_id, deps in remaining.items() if deps <= done}
        if not ready:
            raise ValueError("El DAG contiene un ciclo.")
        done.update(ready)
        remaining = {node_id: deps for node_id, deps in remaining.items() if node_id not in ready}


def contained_path(root, relative):
    root = Path(root).resolve()
    value = Path(relative)
    if value.is_absolute():
        raise ValueError("Usa rutas relativas al workspace.")
    resolved = (root / value).resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        raise ValueError("Ruta fuera del workspace.") from None
    return resolved


async def worker_execution(node):
    occurred_at = datetime.now(timezone.utc).isoformat()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY no está configurada.")
    root = node.get("_root", Path.cwd())
    context = []
    for relative in node.get("files", []):
        file_path = contained_path(root, relative)
        context.append(f"--- {relative} ---\n{file_path.read_text(encoding='utf-8')}")
    for dep_id, output in node.get("_dependency_outputs", {}).items():
        context.append(f"--- Propuesta de {dep_id} (NO aplicada) ---\n{output}")
    prompt = (
        f"Task: {node['task']}\n\nContext:\n" + "\n".join(context)
        + "\nOutput a unified diff proposal. Dependency proposals have NOT been applied."
    )
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    request = urllib.request.Request(
        url,
        data=json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
    )

    def fetch():
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))

    try:
        response = await asyncio.get_running_loop().run_in_executor(None, fetch)
        parts = response["candidates"][0]["content"]["parts"]
        result = "\n".join(part["text"] for part in parts if isinstance(part.get("text"), str))
        if not result.strip():
            raise ValueError("Respuesta vacía")
    except Exception:
        # API exceptions may include request URLs or sensitive details.
        raise RuntimeError(f"Falló la API o la respuesta del modelo para {node['id']}.") from None
    metadata = response.get("usageMetadata")
    if isinstance(metadata, dict):
        # Store only token counters, never prompts, headers or credentials.
        node["_provider_usage"] = {
            "provider": "google", "model": "gemini-2.5-flash", "modality": "api",
            "occurred_at": occurred_at, "usage_origin": "provider",
            "usageMetadata": {key: metadata[key] for key in (
                "promptTokenCount", "cachedContentTokenCount", "candidatesTokenCount",
                "thoughtsTokenCount", "totalTokenCount") if key in metadata},
        }
    return node["id"], result


async def run_process(args, root, timeout=60):
    process = await asyncio.create_subprocess_exec(
        *args, cwd=str(root), stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout)
    except (asyncio.TimeoutError, asyncio.CancelledError):
        process.kill()
        await process.communicate()
        raise
    return process.returncode, stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace")


async def red_team_qa_execution(node_id, root=None):
    root = Path(root or Path.cwd()).resolve()
    code, stdout, stderr = await run_process(
        ["node", str(root / "scripts" / "red_team_qa.js")], root
    )
    return code == 0, stdout + stderr


async def execute_node(node):
    if node.get("type", "worker") == "qa":
        success, report = await red_team_qa_execution(node["id"], node.get("_root"))
        if not success:
            raise RuntimeError(f"QA falló para {node['id']}.")
        return node["id"], report
    return await worker_execution(node)


async def log_node(payload, node, status, root):
    args = [
        "node", str(root / "scripts" / "log_sca.js"), "--type", "ledger",
        "--project_name", payload["project_name"], "--sprint_name", payload["sprint_name"],
        "--node_id", node["id"], "--task_desc", node["task"], "--status", status,
    ]
    code, stdout, stderr = await run_process(args, root)
    # The legacy logger can return 0 after a mirror failure (N5 fixes that contract).
    if code or "Error al sincronizar Markdowns" in stdout + stderr:
        raise RuntimeError("Falló la persistencia CQRS; no se ejecutarán nuevos nodos.")


def save_state(run_dir, state):
    temporary = run_dir / "state.tmp"
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, run_dir / "state.json")


def validate_state(state, nodes, run_dir):
    if not isinstance(state, dict) or not isinstance(state.get("nodes"), dict):
        raise ValueError("Checkpoint inválido; requiere revisión.")
    for node_id, record in state["nodes"].items():
        if node_id not in nodes or not isinstance(record, dict):
            raise ValueError("Nodo desconocido en checkpoint.")
        if record.get("status") not in LEDGER_STATUS or not isinstance(record.get("ledger_pending"), bool):
            raise ValueError("Estado de checkpoint inválido.")
        if record["status"] in SUCCESS | {"awaiting_review"}:
            kind = "qa" if nodes[node_id].get("type", "worker") == "qa" else "proposal"
            artifact = node_id + (".qa.txt" if kind == "qa" else ".proposal.diff")
            if record.get("kind") != kind or record.get("artifact") != artifact or not (run_dir / artifact).is_file():
                raise ValueError("Artefacto del checkpoint ausente o inválido.")


async def run_dag(payload, root, approve=None):
    validate_payload(payload)
    root = Path(root).resolve()
    # Changes to the graph/revision get a distinct checkpoint; never reuse stale outputs.
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    run_dir = root / "AI_CONTEXT" / "swarm_runs" / digest
    run_dir.mkdir(parents=True, exist_ok=True)
    lock = run_dir / "run.lock"
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise RuntimeError("Este DAG está bloqueado. Verifica que no haya otro motor activo.") from None
    os.close(descriptor)
    try:
        state_path = run_dir / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {"nodes": {}}
        nodes = {n["id"]: n for n in payload["nodes"]}
        validate_state(state, nodes, run_dir)
        records = state["nodes"]
        strict = payload.get("mode", "strict") == "strict"
        strict_processed = False
        ledger_lock = asyncio.Lock()

        async def flush(node_id):
            record = records[node_id]
            if record.get("ledger_pending"):
                # Avoid concurrent mirror regeneration within this run.
                async with ledger_lock:
                    await log_node(payload, nodes[node_id], LEDGER_STATUS[record["status"]], root)
                record["ledger_pending"] = False
                save_state(run_dir, state)

        async def record_status(node_id, status, **details):
            records[node_id] = {"status": status, "ledger_pending": True, **details}
            save_state(run_dir, state)
            await flush(node_id)

        for node_id, record in list(records.items()):
            if record["status"] == "running":
                await record_status(node_id, "failed", error="Ejecución interrumpida; requiere revisión.")
            else:
                await flush(node_id)

        if approve is not None:
            if not strict or records.get(approve, {}).get("status") != "awaiting_review":
                raise ValueError("Solo se puede aprobar un resultado pendiente en modo STRICT.")
            result = records[approve]
            await record_status(approve, "approved", artifact=result["artifact"], kind=result["kind"])
            print(f"Resultado {approve} revisado. Ejecuta nuevamente para continuar el DAG.")
            return 0

        async def process_node(node):
            node_id = node["id"]
            await record_status(node_id, "running")
            dependency_outputs = {}
            for dep in node.get("dependencies", []):
                record = records[dep]
                if record.get("kind") == "proposal":
                    dependency_outputs[dep] = (run_dir / record["artifact"]).read_text(encoding="utf-8")
            try:
                runtime_node = {**node, "_root": root, "_dependency_outputs": dependency_outputs}
                returned_id, output = await execute_node(runtime_node)
                if returned_id != node_id or not isinstance(output, str) or not output.strip():
                    raise ValueError("Resultado de nodo inválido.")
            except Exception:
                await record_status(node_id, "failed", error="Falló la ejecución; sin cambios aplicados.")
                return
            kind = "qa" if node.get("type", "worker") == "qa" else "proposal"
            artifact = node_id + (".qa.txt" if kind == "qa" else ".proposal.diff")
            (run_dir / artifact).write_text(output, encoding="utf-8")
            if runtime_node.get("_provider_usage"):
                usage = {**runtime_node["_provider_usage"], "project_name": payload["project_name"],
                         "main_task": f"{payload['sprint_name']} / {node_id}: {node['task']}",
                         "event_key": f"{run_dir.name}:{node_id}"}
                (run_dir / (node_id + ".usage.json")).write_text(
                    json.dumps(usage, ensure_ascii=False, indent=2), encoding="utf-8")
            status = "awaiting_review" if strict else ("qa_passed" if kind == "qa" else "proposal_generated")
            await record_status(node_id, status, artifact=artifact, kind=kind)
            print(f"{node_id}: {LEDGER_STATUS[status]} — {run_dir / artifact}")

        while True:
            pending = [n for n in payload["nodes"] if n["id"] not in records]
            blocked = [n for n in pending if any(records.get(dep, {}).get("status") in {"failed", "blocked"} for dep in n.get("dependencies", []))]
            if blocked:
                for node in blocked:
                    await record_status(node["id"], "blocked")
                continue
            if strict and any(r["status"] == "awaiting_review" for r in records.values()):
                print("STRICT: revisa el artefacto y usa --approve ID antes de continuar.")
                return 1 if any(r["status"] in {"failed", "blocked"} for r in records.values()) else 0
            if strict_processed:
                return 1 if any(r["status"] in {"failed", "blocked"} for r in records.values()) else 0
            ready = [n for n in pending if all(records.get(dep, {}).get("status") in SUCCESS for dep in n.get("dependencies", []))]
            if not ready:
                break
            if strict:
                await process_node(ready[0])
                strict_processed = True
            else:
                # Each node writes its terminal checkpoint/ledger immediately on completion.
                results = await asyncio.gather(*(process_node(n) for n in ready), return_exceptions=True)
                for result in results:
                    if isinstance(result, BaseException):
                        raise result
        return 1 if any(r["status"] in {"failed", "blocked"} for r in records.values()) else 0
    finally:
        lock.unlink()


async def main(dag_file=None, approve=None):
    dag_path = Path(dag_file or DAG_FILE).resolve()
    try:
        payload = json.loads(dag_path.read_text(encoding="utf-8-sig"))
        return await run_dag(payload, dag_path.parent.parent, approve=approve)
    except Exception as error:
        print(f"Error del motor: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SCA DAG proposal engine (CQRS)")
    parser.add_argument("--dag", default=DAG_FILE)
    parser.add_argument("--approve", help="Registrar revisión de un resultado STRICT; no aplica código")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.dag, args.approve)))
