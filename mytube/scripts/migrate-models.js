const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/bhave/MyTube/backend/src/models';
const destDir = 'c:/Users/bhave/MyTube/frontend/src/models';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
files.forEach(file => {
  if (file.endsWith('.js')) {
    let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    // Replace mongoose.model("name", schema) with (mongoose.models["name"] || mongoose.model("name", schema))
    content = content.replace(/mongoose\.model\(\s*[\"']([^\"']+)[\"']\s*,\s*([^)]+)\)/g, '(mongoose.models[\"$1\"] || mongoose.model(\"$1\", $2))');
    
    const destFile = file.replace('.js', '.ts');
    fs.writeFileSync(path.join(destDir, destFile), content);
    console.log('Processed', destFile);
  }
});
