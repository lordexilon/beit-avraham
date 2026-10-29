import os
import shutil
import sys

def colored_print(text, color_code):
    if sys.platform == "win32":
        print(text)
    else:
        print(f"\033[{color_code}m{text}\033[0m")

def print_success(text):
    colored_print(f"✅ {text}", "32") # Green

def print_info(text):
    colored_print(f"ℹ️  {text}", "34") # Blue

def print_warning(text):
    colored_print(f"⚠️  {text}", "33") # Yellow

def print_error(text):
    colored_print(f"❌ {text}", "31") # Red

def copy_folder(src, dst, ignore=None):
    if not os.path.exists(src):
        print_error(f"Source not found: {src}")
        return False
    
    if os.path.exists(dst):
        print_warning(f"Destination already exists: {dst}")
        response = input("    Overwrite? (y/n): ").strip().lower()
        if response != 'y':
            print_info("Skipping...")
            return False
    
    try:
        if not os.path.exists(dst):
            os.makedirs(dst)
        
        for item in os.listdir(src):
            if ignore and ignore(src, [item]):
                continue
                
            s = os.path.join(src, item)
            d = os.path.join(dst, item)
            
            if os.path.isdir(s):
                if ignore and ignore(src, [item]): continue
                if not os.path.exists(d):
                    shutil.copytree(s, d, ignore=ignore)
                else:
                     if not copy_folder(s, d, ignore=ignore):
                         return False
            else:
                shutil.copy2(s, d)
        print_success(f"Copied {src} to {dst}")
        return True
    except Exception as e:
        print_error(f"Failed to copy: {e}")
        return False

def main():
    print("\n===========================================")
    print("   SCA-Compliant Framework Installer")
    print("===========================================\n")

    print("This script will install the SCA Cognitive Infrastructure into the CURRENT directory.")
    print(f"Target: {os.getcwd()}\n")

    confirm = input("Continue? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Aborted.")
        return

    # Determine script location to find templates
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', default=os.path.dirname(os.path.abspath(__file__)), help='Framework source checkout')
    args = parser.parse_args()
    script_dir = os.path.abspath(args.source)
    if script_dir == os.path.abspath(os.getcwd()):
        print_error('Source and destination must differ')
        return 1
    failures = []
    def required_copy(src, dst, ignore=None):
        if not copy_folder(src, dst, ignore):
            failures.append(src)
    templates_dir = os.path.join(script_dir, "templates")
    agent_dir = os.path.join(script_dir, ".agent")
    opencode_dir = os.path.join(script_dir, ".opencode")
    studio_dir = os.path.join(script_dir, "sca-studio")

    if not os.path.exists(templates_dir):
        print_error(f"Could not find 'templates' directory at {templates_dir}")
        return 1

    # Select Language
    print("\nSelect Language / Selecciona Idioma:")
    print("1. English (en)")
    print("2. Español (es)")
    
    choice = input("Option (1/2): ").strip()
    
    lang = "en"
    if choice == "2" or choice.lower() == "es":
        lang = "es"
    
    print_info(f"Selected Language: {lang}")

    # Select Tech Stack Template
    print("\nSelect Tech Stack Template / Selecciona Plantilla Tecnológica:")
    print("1. Blank / Ninguno (Default)")
    print("2. Next.js + React (App Router)")
    print("3. Python Backend (FastAPI / Flask)")
    
    stack_choice = input("Option (1/2/3): ").strip()
    
    # 1. Copy AI_CONTEXT
    src_context = os.path.join(templates_dir, lang, "AI_CONTEXT")
    dst_context = os.path.join(os.getcwd(), "AI_CONTEXT")
    
    print("\n>>> Installing AI_CONTEXT...")
    required_copy(src_context, dst_context)
    
    # Inject Tech Stack instructions if selected
    if stack_choice in ["2", "3"]:
        stacks_dir = os.path.join(templates_dir, "stacks")
        stack_file = "nextjs-react.md" if stack_choice == "2" else "python-backend.md"
        src_stack = os.path.join(stacks_dir, stack_file)
        
        if os.path.exists(src_stack):
            dst_instructions = os.path.join(dst_context, "instructions.md")
            try:
                with open(src_stack, "r", encoding="utf-8") as f_src:
                    stack_rules = f_src.read()
                
                with open(dst_instructions, "a", encoding="utf-8") as f_dst:
                    f_dst.write(f"\n\n{stack_rules}\n")
                print_success(f"Injected {stack_file} template rules into instructions.md")
            except Exception as e:
                print_error(f"Failed to inject template: {e}")
                failures.append(src_stack)

    # 2. Copy .agent
    print("\n>>> Installing .agent System...")
    dst_agent = os.path.join(os.getcwd(), ".agent")
    required_copy(agent_dir, dst_agent)

    # 2.5 Copy .opencode (OpenCode native slash commands)
    print("\n>>> Installing OpenCode Commands (.opencode/commands)...")
    dst_opencode = os.path.join(os.getcwd(), ".opencode")
    if os.path.exists(opencode_dir):
        required_copy(opencode_dir, dst_opencode, ignore=shutil.ignore_patterns('node_modules', '.env', '.env.*'))
    else:
        print_warning(".opencode directory not found in the framework repo, skipping...")

    # 3. Copy sca-studio
    print("\n>>> Installing SCA Studio (Hybrid Dashboard)...")
    dst_studio = os.path.join(os.getcwd(), "sca-studio")
    if os.path.exists(studio_dir):
        required_copy(studio_dir, dst_studio, ignore=shutil.ignore_patterns('node_modules', '.next', '.env', '.env.*', '.git', 'workspaces.json', '*.tsbuildinfo'))
    else:
        failures.append(studio_dir)

    # Runtime scripts and their root dependency manifest are required too.
    required_copy(os.path.join(script_dir, 'scripts'), os.path.join(os.getcwd(), 'scripts'),
                  ignore=shutil.ignore_patterns('__pycache__', '.env', '.env.*'))
    required_copy(os.path.join(script_dir, 'supabase', 'migrations'),
                  os.path.join(os.getcwd(), 'supabase', 'migrations'))
    for manifest in ['package.json', 'package-lock.json']:
        source = os.path.join(script_dir, manifest)
        destination = os.path.join(os.getcwd(), manifest)
        if not os.path.isfile(source):
            failures.append(source)
            continue
        if os.path.exists(destination):
            failures.append('Existing dependency manifest requires explicit merge: ' + destination)
        else:
            shutil.copy2(source, destination)

    # 4. Install Git Pre-commit Hook (Technical Enforcement)
    print("\n>>> Setting up SCA Protocol Technical Enforcement (Git Hook)...")
    git_hooks_dir = os.path.join(os.getcwd(), ".git", "hooks")
    if os.path.exists(git_hooks_dir):
        pre_commit_path = os.path.join(git_hooks_dir, "pre-commit")
        hook_script = "#!/bin/sh\n"
        hook_script += "python .agent/hooks/sca-pre-commit.py\n"
        
        try:
            with open(pre_commit_path, "w") as f:
                f.write(hook_script)
            
            # Make it executable (Unix)
            if sys.platform != "win32":
                os.chmod(pre_commit_path, 0o755)
                
            print_success("Git pre-commit hook installed successfully.")
        except Exception as e:
            print_warning(f"Failed to install Git hook: {e}")
    else:
        print_warning("No .git repository found in the current directory. Pre-commit hook skipped.")

    # 5. Copy CI/CD Compliance Action
    print("\n>>> Installing SCA Compliance CI/CD (GitHub Actions)...")
    src_github = os.path.join(templates_dir, lang, ".github")
    dst_github = os.path.join(os.getcwd(), ".github")
    if os.path.exists(src_github):
        required_copy(src_github, dst_github)
    else:
        print_warning("No GitHub Actions template found.")

    print("\n" + "="*40)
    required = ['scripts/log_sca.js', 'scripts/cycle_capture.js', 'scripts/codex_telemetry.js',
                'scripts/model_cost_cli.js', 'sca-studio/package.json', 'package.json']
    failures.extend(item for item in required if not os.path.isfile(item))
    if failures:
        print_error('Installation incomplete: ' + '; '.join(failures))
        return 1
    print_success("Files copied and verified. Runtime setup and capture are still pending.")
    print("Next Steps:")
    print("1. Read AI_CONTEXT/active_context.md")
    print("2. Install dependencies in the project root AND sca-studio")
    print("3. Run the command: /init_project (or /init_project_es) in your IDE")
    print("4. In OpenCode: /swarm_router_es (or /swarm_router) is now available natively")
    print("5. Verify project binding, Matrix schema/connection and fresh capture T0 before measuring")
    print("===========================================\n")

if __name__ == "__main__":
    sys.exit(main() or 0)
