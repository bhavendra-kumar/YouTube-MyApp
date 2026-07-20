const fs = require('fs');
const path = require('path');

function copyAndRename(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const fullPath = path.join(srcDir, file);
    if (fs.statSync(fullPath).isDirectory()) return;

    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Naive import path fixing:
    // Change ../models/ to @/models/
    content = content.replace(/\.\.\/models\//g, '@/models/');
    content = content.replace(/\.\/models\//g, '@/models/');
    
    // Change ../utils/ to @/lib/backend-utils/
    content = content.replace(/\.\.\/utils\//g, '@/lib/backend-utils/');
    content = content.replace(/\.\/utils\//g, '@/lib/backend-utils/');

    // Change ../services/ to @/services/backend/
    content = content.replace(/\.\.\/services\//g, '@/services/backend/');
    content = content.replace(/\.\/services\//g, '@/services/backend/');

    // Change ../config/env.js to @/lib/config/env
    content = content.replace(/\.\.\/config\/env\.js/g, '@/lib/config/env');
    content = content.replace(/\.\/config\/env\.js/g, '@/lib/config/env');

    const destFile = file.endsWith('.js') ? file.replace('.js', '.ts') : file;
    fs.writeFileSync(path.join(destDir, destFile), content);
    console.log('Processed', destFile, 'to', destDir);
  });
}

copyAndRename('c:/Users/bhave/MyTube/backend/src/utils', 'c:/Users/bhave/MyTube/frontend/src/lib/backend-utils');
copyAndRename('c:/Users/bhave/MyTube/backend/src/services', 'c:/Users/bhave/MyTube/frontend/src/services/backend');
