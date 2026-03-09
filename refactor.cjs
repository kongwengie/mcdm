const fs = require('fs');
const path = require('path');

const filesToProcess = [
  path.join(__dirname, 'src', 'App.tsx'),
  path.join(__dirname, 'src', 'components', 'HierarchyDiagram.tsx')
];

const replacements = [
  { from: /bg-\[#E4E3E0\]/g, to: 'bg-slate-50' },
  { from: /text-\[#141414\]/g, to: 'text-slate-900' },
  { from: /border-\[#141414\]\/20/g, to: 'border-slate-200' },
  { from: /border-\[#141414\]\/10/g, to: 'border-slate-100' },
  { from: /border-\[#141414\]/g, to: 'border-slate-200' },
  { from: /bg-\[#141414\]\/10/g, to: 'bg-slate-100' },
  { from: /bg-\[#141414\]\/5/g, to: 'bg-slate-50' },
  { from: /bg-\[#141414\]/g, to: 'bg-indigo-600' },
  { from: /text-\[#E4E3E0\]/g, to: 'text-white' },
  { from: /border-\[#E4E3E0\]\/20/g, to: 'border-slate-100' },
  { from: /bg-white\/50/g, to: 'bg-white shadow-sm rounded-2xl' },
  { from: /bg-white\/80/g, to: 'bg-white shadow-sm rounded-2xl' },
  { from: /bg-white\/30/g, to: 'bg-white shadow-sm rounded-xl' },
  { from: /bg-white\/20/g, to: 'bg-white shadow-sm rounded-lg' },
  { from: /bg-white\/10/g, to: 'bg-white shadow-sm rounded-lg' },
  { from: /font-serif/g, to: 'font-sans' },
  { from: /italic/g, to: '' },
  { from: /uppercase tracking-widest/g, to: 'font-medium tracking-tight' },
  { from: /uppercase tracking-tighter/g, to: 'tracking-tight' },
  { from: /uppercase tracking-\[0\.2em\]/g, to: 'font-medium tracking-tight text-slate-500' },
  { from: /uppercase tracking-\[0\.3em\]/g, to: 'font-medium tracking-tight' },
  { from: /border-2 border-slate-200/g, to: 'border border-slate-200 shadow-sm rounded-2xl' }, // After previous replace
  { from: /rounded-sm/g, to: 'rounded-xl' },
  { from: /hover:bg-\[#141414\]/g, to: 'hover:bg-indigo-700' },
  { from: /hover:text-\[#E4E3E0\]/g, to: 'hover:text-white' },
  { from: /bg-emerald-600/g, to: 'bg-indigo-500' },
  { from: /bg-emerald-500/g, to: 'bg-indigo-500' },
  { from: /selection:bg-\[#141414\]/g, to: 'selection:bg-indigo-500' },
  { from: /selection:text-\[#E4E3E0\]/g, to: 'selection:text-white' },
  { from: /focus:border-\[#141414\]/g, to: 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' },
  { from: /bg-transparent border-b/g, to: 'bg-slate-50 border rounded-md px-2 py-1' },
  { from: /border border-white\/20/g, to: 'border border-slate-200' },
  { from: /font-mono/g, to: 'font-sans text-slate-500' }, // Soften mono to sans with slate-500
  { from: /text-black/g, to: 'text-slate-900' },
  { from: /hover:bg-indigo-600\/10/g, to: 'hover:bg-slate-100' }, // Fix hover states
  { from: /hover:bg-slate-200\/10/g, to: 'hover:bg-slate-100' },
  { from: /text-\[10px\]/g, to: 'text-xs' },
  { from: /text-\[8px\]/g, to: 'text-[10px]' },
  { from: /bg-transparent outline-none font-bold/g, to: 'bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none font-semibold focus:ring-2 focus:ring-indigo-500' },
  { from: /bg-transparent text-center/g, to: 'bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-indigo-500' },
  { from: /bg-transparent border-b border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none/g, to: 'bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500' }
];

filesToProcess.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(({from, to}) => {
      content = content.replace(from, to);
    });
    fs.writeFileSync(file, content);
    console.log(`Processed ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
