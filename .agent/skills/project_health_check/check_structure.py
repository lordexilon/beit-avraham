import os

def check_structure():
    required_files = [
        "AI_CONTEXT/active_context.md",
        "AI_CONTEXT/project_profile.md",
        "AI_CONTEXT/instructions.md",
        "AI_CONTEXT/todo.md",
        "AI_CONTEXT/metricas_sca.md",
        "AI_CONTEXT/codebase_map.md"
    ]
    
    missing = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing.append(file_path)
    
    if missing:
        print("❌ Project Structure Incomplete. Missing files:")
        for m in missing:
            print(f" - {m}")
        print("Run /init_project to fix (or create them manually if this is a v2.0 upgrade).")
    else:
        print("✅ Project Structure is SCA-Compliant v2.0.")

if __name__ == "__main__":
    check_structure()
