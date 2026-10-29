const fs = require('node:fs');
const path = require('node:path');

// Only the runtime directories are copied; other source files are out of scope.
const REQUIRED_DIRECTORIES = ['scripts', 'migrations'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSecret(name) {
  return /^\.env(?:\.|$)/i.test(name) ||
    /^(?:secrets?|credentials?)(?:\.|$)/i.test(name) ||
    /\.(?:pem|key|p12|pfx)$/i.test(name) ||
    /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)/i.test(name);
}

function collectFiles(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (isSecret(entry.name)) continue;
    const source = path.join(directory, entry.name);
    const target = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(source, target));
    else if (entry.isFile()) files.push({ source, relative: target });
    else throw new Error(`Unsupported runtime entry: ${source}`);
  }
  return files;
}

function prepare(src, dest, binding) {
  if (typeof src !== 'string' || typeof dest !== 'string' || !src || !dest) {
    throw new Error('Source and destination paths are required');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding) ||
      typeof binding.project_name !== 'string' || !binding.project_name.trim() ||
      typeof binding.cycle_id !== 'string' || !UUID.test(binding.cycle_id)) {
    throw new Error('Binding requires a project_name and UUID cycle_id');
  }
  // Serialize before writing anything, so malformed binding cannot leave a partial install.
  const bindingJson = JSON.stringify(binding, null, 2);
  const source = fs.realpathSync(src);
  const destination = path.resolve(dest);
  const relation = path.relative(source, destination);
  if (!relation || (!relation.startsWith(`..${path.sep}`) && relation !== '..' && !path.isAbsolute(relation))) {
    throw new Error('Destination must be outside the source');
  }
  if (fs.existsSync(destination)) {
    const stat = fs.lstatSync(destination);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(destination).length) {
      throw new Error('Destination must be an empty directory');
    }
  }

  // Preflight all required pieces before creating or populating the destination.
  const plans = REQUIRED_DIRECTORIES.map(name => {
    const directory = path.join(source, name);
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Missing runtime directory: ${name}`);
    const files = collectFiles(directory);
    if (!files.length) throw new Error(`Empty runtime directory: ${name}`);
    return { name, files };
  });

  fs.mkdirSync(destination, { recursive: true });
  for (const { name, files } of plans) {
    for (const file of files) {
      const target = path.join(destination, name, file.relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file.source, target, fs.constants.COPYFILE_EXCL);
    }
  }
  const context = path.join(destination, 'AI_CONTEXT');
  fs.mkdirSync(context);
  fs.writeFileSync(path.join(context, 'project_binding.json'), `${bindingJson}\n`, { flag: 'wx' });
}

exports.prepare = prepare;
