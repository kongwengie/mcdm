const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'HierarchyDiagram.tsx');

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/#141414/g, '#4f46e5'); // Indigo 600
  content = content.replace(/#fff/g, '#ffffff');
  content = content.replace(/stroke-opacity", 0\.2/g, 'stroke-opacity", 0.3');
  content = content.replace(/stroke", "#4f46e5"/g, 'stroke", "#cbd5e1"'); // Slate 300 for links
  content = content.replace(/fill", \(d: any\) => d\.data\.isGoal \? "#4f46e5" : "#ffffff"/g, 'fill", (d: any) => d.data.isGoal ? "#4f46e5" : "#ffffff"');
  content = content.replace(/stroke", "#cbd5e1"\)\n\s*\.attr\("stroke-width", 2\)/g, 'stroke", "#4f46e5")\n      .attr("stroke-width", 2)'); // Fix node stroke
  
  // Actually, let's just do targeted replacements
  fs.writeFileSync(file, content);
  console.log(`Processed ${file}`);
}
