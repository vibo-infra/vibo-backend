import fs from 'fs';
import path from 'path';

const name = process.argv[2];

if (!name) {
  console.error('Usage: npm run migration:create <name>');
  console.error('Example: npm run migration:create add_avatar_to_users');
  process.exit(1);
}

const timestamp = new Date()
  .toISOString()
  .replaceAll(/[-T:.Z]/g, '')
  .slice(0, 14); // → "20250322143012"

const filename = `${timestamp}_${name}.sql`;
const filepath = path.join(__dirname, '../../core/database/migrations', filename);

fs.writeFileSync(filepath, `-- Migration: ${name}\n-- Created at: ${new Date().toISOString()}\n\n`);

console.log(`✅ Created: ${filename}`);