const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_DIRECTORIES = ['scripts', 'migrations'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSecret(name) {
  return /^(?:\.env(?:\..*)?|\.aws|\.ssh|secrets?|credentials?(?:\..*)?)$/i.test(name)
    || /\.(?:pem|key|p12|pfx)$/i.test(name);
}

// Inspect everything before creating the destination. Symlinks must not let a
// source tree pull files from elsewhere (or redirect writes outside the target).
function collectFiles(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (isSecret(entry.name)) continue;
    const source = path.join(directory, entry.name);
    const target = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not supported: ${source}`);
    if (entry.isDirectory()) files.push(...collectFiles(source, target));
    else if (entry.isFile()) files.push({ source, relative: target });
    else throw new Error(`Unsupported source entry: ${source}`);
  }
  return files;
}

function prepare(src, dest, binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)
      || typeof binding.project_name !== 'string' || !binding.project_name.trim()
      || typeof binding.cycle_id !== 'string' || !UUID.test(binding.cycle_id)) {
    throw new Error('Binding requires a project_name and a UUID cycle_id');
  }
  const bindingJson = JSON.stringify(binding, null, 2);
  const sourceRoot = path.resolve(src);
  const destinationRoot = path.resolve(dest);
  const relative = path.relative(sourceRoot, destinationRoot);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Destination must be outside the source directory');
  }
  if (fs.existsSync(destinationRoot)) {
    const stat = fs.lstatSync(destinationRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(destinationRoot).length) {
      throw new Error('Destination must be an empty directory');
    }
  }

  const files = [];
  for (const required of REQUIRED_DIRECTORIES) {
    const directory = path.join(sourceRoot, required);
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`Required directory is missing or invalid: ${required}`);
    }
    const contents = collectFiles(directory, required);
    if (!contents.length) throw new Error(`Required directory has no usable files: ${required}`);
    files.push(...contents);
  }

  fs.mkdirSync(destinationRoot, { recursive: true });
  for (const file of files) {
    const target = path.join(destinationRoot, file.relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file.source, target);
  }
  const context = path.join(destinationRoot, 'AI_CONTEXT');
  fs.mkdirSync(context, { recursive: true });
  fs.writeFileSync(path.join(context, 'project_binding.json'), `${bindingJson}\n`, 'utf8');
}

exports.prepare = prepare;
