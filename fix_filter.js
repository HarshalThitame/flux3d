const fs = require('fs');
const path = './src/components/shop/ProductFilterBar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/--lux-/g, '--shop-');
content = content.replace(
  "result = result.filter((p) => p.category_slug === selectedCategory)",
  "result = result.filter((p) => p.categories?.some(c => c.slug === selectedCategory))"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed ProductFilterBar.tsx');
