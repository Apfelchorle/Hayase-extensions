import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verify() {
  const indexContent = fs.readFileSync(path.join(__dirname, 'index.json'), 'utf-8');
  const extensions = JSON.parse(indexContent);

  console.log(`Found ${extensions.length} extensions in index.json`);

  for (const ext of extensions) {
    console.log(`\nVerifying ${ext.name} (${ext.id})...`);
    
    // Extract filename from the code URL
    const filename = ext.code.split('/').pop();
    const filePath = path.join(__dirname, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    try {
      const module = await import(`file://${filePath}`);
      const instance = module.default;

      if (!instance) {
        console.error(`❌ No default export found in ${filename}`);
        continue;
      }

      if (typeof instance.test !== 'function') {
        console.error(`❌ No test method found in ${filename}`);
        continue;
      }

      console.log(`Running test for ${ext.name}...`);
      const result = await instance.test();
      
      if (result) {
        console.log(`✅ ${ext.name} passed test`);
      } else {
        console.error(`❌ ${ext.name} failed test`);
      }

    } catch (error) {
      console.error(`❌ Error verifying ${ext.name}:`, error);
    }
  }
}

verify();
