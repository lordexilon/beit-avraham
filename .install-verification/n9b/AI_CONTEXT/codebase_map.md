# 🗺️ Codebase Map (Template)

> **Purpose:** High-quality index to guide the AI agent to the correct files quickly.
> **Rule:** Keep this file concise. Only link to "Core" files and critical definitions.
> **Last updated:** YYYY-MM-DD

---

## 🏗️ Core & Configuration
| File | Purpose |
|---------|-----------|
| `src/App.tsx` | Entry point, Routes, and Main Layout |
| `AI_CONTEXT/instructions.md` | **MASTER DOCUMENT** - Mandatory rules for AI |
| `.env.example` | Template for environment variables |

---

## 🚨 Critical Functions / APIs
| Name | Path | Purpose |
|---------|-------------|-----------|
| `auth_provider` | `src/context/AuthContext.tsx` | Global authentication logic |
| `main_api_client` | `src/services/api.ts` | Base API configuration |

---

## 📦 Main React Components / Modules
| Component | Purpose |
|------------|-----------|
| `src/components/Shared/` | Reusable UI components |
| `src/pages/` | Main application pages |

---

## 🛠️ Utils & Types
| Directory | Purpose |
|------------|-----------|
| `src/utils/` | Formatting, date, and calculation utility functions |
| `src/types/` | TypeScript type definitions |

---

> **Note:** Use relative paths (e.g., `src/file.ts`) to ensure compatibility across different environments. This map should be updated whenever new critical features or refactorings occur.
