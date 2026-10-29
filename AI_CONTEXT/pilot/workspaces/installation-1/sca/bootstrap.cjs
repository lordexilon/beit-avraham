'use strict';
const fs = require('node:fs');
const path = require('node:path');

function isSecret(name) {
  return /^(?:\.env(?:\..*)?|\.aws|\.ssh|credentials(?:\..*)?|secrets?(?:\..*)?)$/i.test(name)
    || /\.(?:pem|key|p12|pfx)$/i.test(name);
}

function collectFiles(root, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (isSecret(entry.name)) continue;
    const child = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not supported: ${child}`);
    if (entry.isDirectory()) files.push(...collectFiles(root, child));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`Unsupported source entry: ${child}`);
  }
  return files;
}

function prepare(src, dest, binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)
      || typeof binding.project_name !== 'string' || !binding.project_name.trim()
      || typeof binding.cycle_id !== 'string'
      || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(binding.cycle_id)) {
    throw new Error('A project_name and UUID cycle_id are required');
  }
  const bindingJson = JSON.stringify(binding, null, 2);
  const source = fs.realpathSync(src);
  const destination = path.resolve(dest);
  const relativeDest = path.relative(source, destination);
  if (!relativeDest || (!relativeDest.startsWith(`..${path.sep}`)
      && relativeDest !== '..' && !path.isAbsolute(relativeDest))) {
    throw new Error('Destination must be outside the source');
  }
  if (fs.existsSync(destination)) {
    const stat = fs.lstatSync(destination);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(destination).length) {
      throw new Error('Destination must be an empty directory');
    }
  }

  // Validate every required tree before changing the destination.
  const trees = ['scripts', 'migrations'].map(name => {
    const root = path.join(source, name);
    const stat = fs.lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Missing directory: ${name}`);
    const files = collectFiles(root);
    if (!files.length) throw new Error(`Missing required files in ${name}`);
    return { name, root, files };
  });

  fs.mkdirSync(destination, { recursive: true });
  for (const { name, root, files } of trees) {
    for (const file of files) {
      const target = path.join(destination, name, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, file), target, fs.constants.COPYFILE_EXCL);
    }
  }
  const context = path.join(destination, 'AI_CONTEXT');
  fs.mkdirSync(context);
  fs.writeFileSync(path.join(context, 'project_binding.json'), `${bindingJson}\n`, { flag: 'wx' });
}

exports.prepare = prepare;
