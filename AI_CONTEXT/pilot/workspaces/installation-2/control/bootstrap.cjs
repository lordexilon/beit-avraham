const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_DIRECTORIES = ['scripts', 'migrations'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only runtime directories are copied. Secret files inside them are excluded too.
function isSecret(name) {
  return /^(?:\.env(?:\..*)?|\.aws|\.ssh|secrets?|credentials?(?:\..*)?)$/i.test(name)
    || /\.(?:pem|key|p12|pfx)$/i.test(name);
}

function collectFiles(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
    if (isSecret(entry.name)) continue;
    const name = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are unsupported: ${name}`);
    if (entry.isDirectory()) files.push(...collectFiles(directory, name));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Unsupported source entry: ${name}`);
  }
  return files;
}

function prepare(src, dest, binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)
      || typeof binding.project_name !== 'string' || !binding.project_name.trim()
      || typeof binding.cycle_id !== 'string' || !UUID.test(binding.cycle_id)) {
    throw new Error('Binding requires a nonempty project_name and UUID cycle_id');
  }
  // Serialize before writing so invalid JSON data cannot leave a partial install.
  const bindingJson = JSON.stringify(binding, null, 2);
  const source = fs.realpathSync(src);
  const destination = path.resolve(dest);
  const relative = path.relative(source, destination);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Destination must be outside the source directory');
  }
  const existed = fs.existsSync(destination);
  if (existed && (!fs.lstatSync(destination).isDirectory()
      || fs.readdirSync(destination).length !== 0)) {
    throw new Error('Destination must be an empty directory');
  }
  const manifest = REQUIRED_DIRECTORIES.map(name => {
    const directory = path.join(source, name);
    if (!fs.lstatSync(directory).isDirectory()) throw new Error(`Missing required directory: ${name}`);
    const files = collectFiles(directory);
    if (!files.length) throw new Error(`Required directory contains no usable files: ${name}`);
    return { name, directory, files };
  });

  try {
    fs.mkdirSync(destination, { recursive: true });
    for (const { name, directory, files } of manifest) {
      for (const file of files) {
        const target = path.join(destination, name, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(directory, file), target, fs.constants.COPYFILE_EXCL);
      }
    }
    const context = path.join(destination, 'AI_CONTEXT');
    fs.mkdirSync(context);
    fs.writeFileSync(path.join(context, 'project_binding.json'), `${bindingJson}\n`, { flag: 'wx' });
  } catch (error) {
    // The destination was verified empty; remove only files created by this run.
    fs.rmSync(destination, { recursive: true, force: true });
    if (existed) fs.mkdirSync(destination);
    throw error;
  }
}

exports.prepare = prepare;
