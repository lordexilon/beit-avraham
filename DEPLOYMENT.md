# Guía de Despliegue: Beit Avraham en GitHub y Vercel

Esta guía detalla los pasos exactos y seguros para publicar el repositorio en **GitHub** y desplegar la plataforma **Beit Avraham** en **Vercel** de manera continua y sin fricción.

---

## 1. Seguridad de Credenciales (Verificación Previa)

El proyecto cuenta con un archivo `.gitignore` tanto en la raíz como en `beit-avraham-web/` que **bloquea y previene la subida de secretos** (`.env`, `.env.local`, etc.).

Antes de confirmar cualquier commit, puedes verificar que ningún archivo sensible esté en seguimiento:
```bash
git status
```
> [!IMPORTANT]
> Nunca hagas commit de tus claves privadas (`XAI_API_KEY`, tokens o contraseñas). En GitHub solo se comparten los archivos plantilla `.env.example`.

---

## 2. Publicación en GitHub

Si aún no has vinculado tu repositorio remoto en GitHub:

1. **Crear repositorio en GitHub:**
   - Ve a [github.com/new](https://github.com/new)
   - Nombre sugerido: `beit-avraham`
   - Visibilidad: Público o Privado (según tu preferencia)
   - **No marques** "Initialize with README", ".gitignore" o "license" (el proyecto ya los contiene).

2. **Inicializar y Confirmar los Cambios Localmente:**
   ```bash
   git add .
   git commit -m "feat: landing institucional, javruta xai grok y preparacion vercel"
   ```

3. **Vincular y Subir a GitHub:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/beit-avraham.git
   git push -u origin main
   ```

---

## 3. Despliegue en Vercel

### Opción A (Recomendada: Vercel Dashboard)

1. Ingresa a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** > **"Project"**.
3. Selecciona e importa el repositorio `beit-avraham`.
4. En la pantalla de **Configure Project**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Haz clic en `Edit` y selecciona `beit-avraham-web` (o déjalo en la raíz, el archivo `vercel.json` y `package.json` ya gestionan ambos modos).
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. **Configurar Variables de Entorno (Environment Variables):**
   Despliega la sección **Environment Variables** y agrega las siguientes claves:

   | Variable | Valor / Descripción | Requerido |
   | :--- | :--- | :--- |
   | `XAI_API_KEY` | Tu API Key de xAI (`xai-...`) | **Sí** (para el chat Javrutá con Grok) |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL de tu instancia de Supabase | Opcional / Recomendado |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase | Opcional / Recomendado |
   | `SCA_SUPABASE_URL` | URL de conexión server-side Supabase | Opcional |
   | `SCA_SUPABASE_ANON_KEY` | Clave anónima server-side Supabase | Opcional |
   | `CONTENT_ADMIN_TOKEN` | Token para acceso al panel de administración | Opcional (por defecto: `admin123`) |

6. Haz clic en **"Deploy"**.
7. En unos 60-90 segundos, Vercel generará tu URL pública (ejemplo: `https://beit-avraham.vercel.app`).

---

## 4. Estructura y Navegación de la Aplicación

Una vez desplegada, la aplicación cuenta con las siguientes secciones accesibles desde el menú superior y lateral:

- **Inicio / Bienvenida (`/` o `#landing`)**: Landing institucional centrada en el aprendizaje de Torá con el Moré Julio Valdez, los 4 pilares pedagógicos, videollamadas en vivo de Google Meet y catálogo de clases.
- **Clases en Vivo por Google Meet**: Enlace directo en la barra superior, en el menú lateral y en la landing page para unirse a las salas virtuales de estudio con el Moré. Se puede personalizar la URL y los horarios desde el panel administrativo.
- **Folio de Estudio (`#estudio`)**: Reproductor de video de la clase activa sincronizado segundo a segundo con el texto transcripto y notas del maestro.
- **Tu Javrutá (`#estudio` - panel derecho)**: Diálogo socrático continuo potenciado por xAI Grok y corpus halájico tradicional.
- **Biblioteca de Shiurim (`#biblioteca`)**: Catálogo completo de clases filtrables por temática y nivel.
- **Escuchar (Podcast) (`#escuchar`)**: Feed RSS y reproductor de episodios de audio.
- **Alefato Interactivo (`#alefato`)**: Práctica de letras hebreas y vocabulario toránico.
- **Gestión de Contenidos (`#admin`)**: Panel administrativo para dar de alta clases, editar transcripciones y personalizar los textos del Landing Page.

---

## 5. Mantenimiento y Nuevos Despliegues

Cada vez que realices cambios locales y ejecutes:
```bash
git add .
git commit -m "mejora: actualizacion..."
git push origin main
```
Vercel compilará y actualizará el sitio automáticamente en tiempo real.
