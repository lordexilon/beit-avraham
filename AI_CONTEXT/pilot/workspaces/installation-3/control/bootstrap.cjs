const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_DIRECTORIES = ['scripts', 'migrations'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateBinding(binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding) ||
      typeof binding.project_name !== 'string' || !binding.project_name.trim() ||
      typeof binding.cycle_id !== 'string' || !UUID.test(binding.cycle_id)) {
    throw new Error('Binding requires a nonempty project_name and UUID cycle_id');
  }
  return JSON.stringify(binding, null, 2) + '\n';
}

function isSecret(name) {
  return /^\.env(?:\.|$)/i.test(name) ||
    /^(?:secrets?|credentials?)(?:\.|$)/i.test(name) ||
    /\.(?:pem|key|p12|pfx)$/i.test(name);
}

function collectFiles(root, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (isSecret(entry.name)) continue;
    const child = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are unsupported: ${child}`);
    if (entry.isDirectory()) files.push(...collectFiles(root, child));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`Unsupported source entry: ${child}`);
  }
  return files;
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return !relative || (!path.isAbsolute(relative) && relative !== '..' &&
    !relative.startsWith('..' + path.sep));
}

function prepare(src, dest, binding) {
  const bindingText = validateBinding(binding);
  const source = path.resolve(src);
  const destination = path.resolve(dest);
  if (isWithin(source, destination) || isWithin(destination, source)) {
    throw new Error('Source and destination must not overlap');
  }
  if (fs.existsSync(destination)) {
    if (!fs.lstatSync(destination).isDirectory() || fs.readdirSync(destination).length) {
      throw new Error('Destination must be an empty directory');
    }
  }

  // Validate every required component before writing anything to the destination.
  const components = REQUIRED_DIRECTORIES.map(name => {
    const directory = path.join(source, name);
    if (!fs.lstatSync(directory).isDirectory()) {
      throw new Error(`Required directory is missing: ${name}`);
    }
    const files = collectFiles(directory);
    if (!files.length) throw new Error(`Required directory has no usable files: ${name}`);
    return { name, directory, files };
  });

  fs.mkdirSync(destination, { recursive: true });
  for (const { name, directory, files } of components) {
    for (const file of files) {
      const target = path.join(destination, name, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(directory, file), target, fs.constants.COPYFILE_EXCL);
    }
  }
  const context = path.join(destination, 'AI_CONTEXT');
  fs.mkdirSync(context, { recursive: true });
  fs.writeFileSync(path.join(context, 'project_binding.json'), bindingText, { flag: 'wx' });
}

exports.prepare = prepare;
