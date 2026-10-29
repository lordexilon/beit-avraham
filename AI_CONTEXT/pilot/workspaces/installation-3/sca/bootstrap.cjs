const fs = require('node:fs');
const path = require('node:path');

function isSecret(name) {
  return /^(?:\.env(?:\..*)?|secrets?(?:\..*)?|credentials?(?:\..*)?)$/i.test(name)
    || /\.(?:pem|key|p12|pfx)$/i.test(name);
}

// Preflight all source entries before creating the destination.
function inventory(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (isSecret(entry.name)) continue;
    const child = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unsupported symbolic link: ${child}`);
    if (entry.isDirectory()) files.push(...inventory(path.join(directory, entry.name), child));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`Unsupported source entry: ${child}`);
  }
  return files;
}

function prepare(src, dest, binding) {
  if (typeof src !== 'string' || !src || typeof dest !== 'string' || !dest) {
    throw new TypeError('Source and destination must be nonempty paths');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)
    || typeof binding.project_name !== 'string' || !binding.project_name.trim()
    || typeof binding.cycle_id !== 'string'
    || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(binding.cycle_id)) {
    throw new TypeError('Binding requires project_name and a UUID cycle_id');
  }
  // Whitelist persisted fields so caller credentials are never serialized.
  const serialized = JSON.stringify({ project_name: binding.project_name, cycle_id: binding.cycle_id }, null, 2) + '\n';
  const source = path.resolve(src);
  const destination = path.resolve(dest);
  const relation = path.relative(source, destination);
  if (!relation || (!relation.startsWith('..' + path.sep) && relation !== '..' && !path.isAbsolute(relation))) {
    throw new Error('Destination must be outside the source tree');
  }
  if (fs.existsSync(destination)) {
    const stat = fs.lstatSync(destination);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(destination).length) {
      throw new Error('Destination must be an empty directory');
    }
  }
  const copies = [];
  for (const required of ['scripts', 'migrations']) {
    const directory = path.join(source, required);
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Missing required directory: ${required}`);
    const files = inventory(directory);
    if (!files.length) throw new Error(`Required directory has no safe files: ${required}`);
    for (const file of files) copies.push(path.join(required, file));
  }
  fs.mkdirSync(destination, { recursive: true });
  for (const file of copies) {
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, file), target, fs.constants.COPYFILE_EXCL);
  }
  const context = path.join(destination, 'AI_CONTEXT');
  fs.mkdirSync(context);
  fs.writeFileSync(path.join(context, 'project_binding.json'), serialized, { flag: 'wx' });
}

exports.prepare = prepare;
