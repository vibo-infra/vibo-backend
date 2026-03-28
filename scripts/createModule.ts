const fs = require("fs");
const path = require("path");

const moduleName = process.argv[2];

if (!moduleName) {
  console.error("❌ Please provide a module name");
  process.exit(1);
}

const basePath = path.join(__dirname, "..", "modules", moduleName);

const files = [
  `${moduleName}.routes.ts`,
  `${moduleName}.controller.ts`,
  `${moduleName}.service.ts`,
  `${moduleName}.repository.ts`,
  `${moduleName}.queries.ts`,
  `index.ts`,
];

if (fs.existsSync(basePath)) {
  console.error("❌ Module already exists");
  process.exit(1);
}

fs.mkdirSync(basePath, { recursive: true });

files.forEach((file) => {
  const filePath = path.join(basePath, file);
  fs.writeFileSync(filePath, "");
});

console.log(`✅ Module '${moduleName}' created successfully.`);