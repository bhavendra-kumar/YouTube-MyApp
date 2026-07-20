const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/bhave/MyTube/backend/src/controllers';
const destDir = 'c:/Users/bhave/MyTube/frontend/src/services/backend';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
files.forEach(file => {
  if (file.endsWith('.js')) {
    let content = fs.readFileSync(path.join(srcDir, file), 'utf8');

    // 1. Fix imports
    content = content.replace(/\.\.\/models\//g, '@/models/');
    content = content.replace(/\.\.\/utils\//g, '@/lib/backend-utils/');
    content = content.replace(/\.\.\/services\//g, '@/services/backend/');
    content = content.replace(/\.\.\/config\/env\.js/g, '@/lib/config/env');

    // 2. Change `export const fnName = async (req, res) => {` 
    // to `export const fnName = async (reqArgs) => { const req = reqArgs;`
    content = content.replace(/export\s+const\s+(\w+)\s*=\s*async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{/g, 'export const $1 = async (reqArgs: any = {}) => {\n  const req = reqArgs;\n  const resContext = { cookies: [] };\n  const res = {\n    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),\n    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),\n    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })\n  };');

    // 3. Replace sendSuccess(res, data, status) with return { data, status, cookies: resContext.cookies }
    content = content.replace(/return\s+sendSuccess\(\s*res\s*,\s*(.+?)\s*,\s*(\d+)\s*\)\s*;/g, 'return { data: $1, status: $2, cookies: resContext.cookies };');
    content = content.replace(/sendSuccess\(\s*res\s*,\s*(.+?)\s*,\s*(\d+)\s*\)\s*;/g, 'return { data: $1, status: $2, cookies: resContext.cookies };');

    // 4. Replace res.status(c).json(d) with return { data: d, status: c, cookies: resContext.cookies }
    content = content.replace(/return\s+res\.status\((\d+)\)\.json\((.+?)\);/g, 'return { data: $2, status: $1, cookies: resContext.cookies };');
    content = content.replace(/res\.status\((\d+)\)\.json\((.+?)\);/g, 'return { data: $2, status: $1, cookies: resContext.cookies };');

    const destFile = file.replace('.js', '.ts');
    fs.writeFileSync(path.join(destDir, destFile), content);
    console.log('Processed', destFile);
  }
});
