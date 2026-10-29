const fs = require('fs');
const path = require('path');

const hookDir = path.join(__dirname, '..', '.git', 'hooks');
const preCommitPath = path.join(hookDir, 'pre-commit');

const hookScript = `#!/bin/sh
# SCA Framework - Pre-commit Hook
node scripts/verify_compliance.js
`;

if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
}

fs.writeFileSync(preCommitPath, hookScript, { mode: 0o755 });
console.log('✅ Pre-commit hook de SCA instalado correctamente en .git/hooks/pre-commit');
