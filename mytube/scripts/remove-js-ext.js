const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/from\s+['"](\.?\.?\/[^'"]+|\@\/[^'"]+)\.js['"]/g, 'from "$1"');
      content = content.replace(/import\s+['"](\.?\.?\/[^'"]+|\@\/[^'"]+)\.js['"]/g, 'import "$1"');
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir('src/models');
processDir('src/services/backend');
processDir('src/lib/backend-utils');
processDir('src/app/api');
processDir('src/lib/middleware');
