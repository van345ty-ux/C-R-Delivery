const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src', 'components', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Regex to match className attributes of input, select, textarea
  const tagRegex = /<(input|textarea|select)[^>]*className=["']([^"']*)["'][^>]*>/g;
  
  content = content.replace(tagRegex, (match, tag, className) => {
    let newClassName = className;
    let needsChange = false;
    
    if (!newClassName.includes('text-gray-900') && !newClassName.includes('!text-black') && !newClassName.includes('text-gray-500')) {
      newClassName += ' text-gray-900';
      needsChange = true;
    }
    
    if (!newClassName.includes('bg-white') && !newClassName.includes('bg-gray-50') && !newClassName.includes('bg-transparent')) {
      newClassName += ' bg-white';
      needsChange = true;
    }
    
    if (needsChange) {
      changed = true;
      return match.replace(className, newClassName);
    }
    
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + file);
  }
}
