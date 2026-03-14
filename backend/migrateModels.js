import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsDir = path.join(__dirname, 'src', 'models');

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import statement for mainDB
    if (!content.includes('import { mainDB }')) {
        // Find the mongoose import line and insert after it
        content = content.replace(
            /(import mongoose from ['"]mongoose['"];?\r?\n)/,
            `$1import { mainDB } from "../config/db.js";\n`
        );
    }

    // Replace default export
    content = content.replace(
        /export default mongoose\.model\((.*?)\);/g,
        "export default mainDB.model($1);"
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
