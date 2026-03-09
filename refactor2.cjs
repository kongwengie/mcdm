const fs = require('fs');
const path = require('path');

const filesToProcess = [
  path.join(__dirname, 'src', 'App.tsx'),
  path.join(__dirname, 'src', 'components', 'HierarchyDiagram.tsx')
];

const replacements = [
  { from: /uppercase  font-sans/g, to: 'font-sans' },
  { from: /uppercase font-sans text-slate-500 tracking-widest/g, to: 'font-sans text-slate-500 tracking-wide' },
  { from: /font-medium tracking-tight font-sans text-slate-500/g, to: 'font-medium tracking-tight text-slate-500' },
  { from: /text-xs font-medium tracking-tight text-slate-500 opacity-50 mb-4 font-sans text-slate-500/g, to: 'text-xs font-medium tracking-tight text-slate-500 opacity-70 mb-4' },
  { from: /font-medium tracking-tight font-bold/g, to: 'font-semibold tracking-tight' },
  { from: /font-sans text-slate-500 uppercase/g, to: 'uppercase tracking-wide' },
  { from: /bg-white shadow-sm rounded-2xl border border-slate-200 rounded-xl/g, to: 'bg-white shadow-sm rounded-2xl border border-slate-200' },
  { from: /font-sans text-slate-500 opacity-50/g, to: 'text-slate-500 opacity-70' },
  { from: /font-sans text-slate-500 opacity-70/g, to: 'text-slate-500 opacity-70' },
  { from: /font-sans text-slate-500 opacity-40/g, to: 'text-slate-500 opacity-60' },
  { from: /font-sans text-slate-500 opacity-60/g, to: 'text-slate-500 opacity-60' },
  { from: /font-sans text-slate-500 opacity-30/g, to: 'text-slate-500 opacity-50' },
  { from: /font-sans text-slate-500/g, to: 'text-slate-600' },
  { from: /border border-slate-200 shadow-sm rounded-2xl space-y-6/g, to: 'bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6' },
  { from: /bg-indigo-600 text-white hover:bg-opacity-90/g, to: 'bg-indigo-600 text-white hover:bg-indigo-700' },
  { from: /text-3xl font-bold tracking-tighter uppercase  font-sans/g, to: 'text-3xl font-bold tracking-tight text-slate-900' },
  { from: /text-4xl font-bold tracking-tighter uppercase  font-sans/g, to: 'text-4xl font-bold tracking-tight text-slate-900' },
  { from: /text-2xl font-bold tracking-tighter uppercase  font-sans/g, to: 'text-2xl font-bold tracking-tight text-slate-900' },
  { from: /text-xl font-bold uppercase  font-sans/g, to: 'text-xl font-bold tracking-tight text-slate-900' },
  { from: /uppercase tracking-widest/g, to: 'font-medium tracking-tight' },
  { from: /bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none font-semibold focus:ring-2 focus:ring-indigo-500/g, to: 'bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none font-semibold focus:ring-2 focus:ring-indigo-500' },
  { from: /bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-indigo-500/g, to: 'bg-white border border-slate-200 rounded-md px-3 py-1.5 text-center focus:ring-2 focus:ring-indigo-500' },
  { from: /bg-slate-50 border rounded-md px-2 py-1/g, to: 'bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none' },
  { from: /border border-slate-200 p-4 bg-white shadow-sm rounded-xl/g, to: 'border border-slate-200 p-4 bg-white shadow-sm rounded-xl' },
  { from: /bg-white shadow-sm rounded-2xl p-1/g, to: 'bg-white shadow-sm rounded-xl p-1' },
  { from: /bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-500/g, to: 'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight' },
  { from: /border border-slate-200 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-500/g, to: 'border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-700' },
  { from: /hover:bg-indigo-600 hover:text-white/g, to: 'hover:bg-slate-50 hover:text-slate-900' },
  { from: /bg-indigo-600 text-white/g, to: 'bg-indigo-600 text-white' },
  { from: /text-xs font-medium tracking-tight text-slate-500 opacity-50 mb-4 text-slate-600/g, to: 'text-xs font-semibold tracking-wider text-slate-500 uppercase mb-4' },
  { from: /text-xs font-medium tracking-tight text-slate-500 opacity-70 mb-4/g, to: 'text-xs font-semibold tracking-wider text-slate-500 uppercase mb-4' },
  { from: /text-xs font-medium tracking-tight text-slate-500 opacity-50/g, to: 'text-xs font-semibold tracking-wider text-slate-500 uppercase' },
  { from: /text-xs font-medium tracking-tight text-slate-500 opacity-40/g, to: 'text-xs font-semibold tracking-wider text-slate-500 uppercase' },
  { from: /text-\[10px\] font-medium tracking-tight text-slate-500 opacity-50/g, to: 'text-[10px] font-semibold tracking-wider text-slate-500 uppercase' },
  { from: /text-\[10px\] font-medium tracking-tight text-slate-500 opacity-40/g, to: 'text-[10px] font-semibold tracking-wider text-slate-500 uppercase' },
  { from: /text-\[10px\] font-medium tracking-tight text-slate-500 opacity-70/g, to: 'text-[10px] font-semibold tracking-wider text-slate-500 uppercase' },
  { from: /border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs font-medium tracking-tight text-slate-600 flex items-center gap-2/g, to: 'border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs font-medium tracking-tight text-slate-700 flex items-center gap-2 rounded-lg' },
  { from: /border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all/g, to: 'border border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-lg' },
  { from: /border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-500 cursor-pointer/g, to: 'border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-700 cursor-pointer rounded-lg' },
  { from: /px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-700/g, to: 'px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-700 rounded-lg' },
  { from: /px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-500/g, to: 'px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight rounded-lg' },
  { from: /px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight/g, to: 'px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight rounded-lg' },
  { from: /px-12 py-6 bg-indigo-600 text-white overflow-hidden transition-all hover:pr-16/g, to: 'px-12 py-6 bg-indigo-600 text-white overflow-hidden transition-all hover:pr-16 rounded-2xl shadow-md' },
  { from: /bg-white shadow-sm rounded-2xl p-6 border-2 border-slate-200 space-y-6/g, to: 'bg-white shadow-sm rounded-2xl p-6 border border-slate-200 space-y-6' },
  { from: /border border-slate-200 p-4 bg-white shadow-sm rounded-xl space-y-4 relative group/g, to: 'border border-slate-200 p-4 bg-white shadow-sm rounded-xl space-y-4 relative group' },
  { from: /border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-2 text-\[10px\] font-medium tracking-tight text-slate-600 font-bold/g, to: 'border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-2 text-[10px] font-semibold tracking-tight text-slate-700 rounded-md' },
  { from: /border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs font-medium tracking-tight text-slate-600 flex items-center gap-2/g, to: 'border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs font-medium tracking-tight text-slate-700 flex items-center gap-2 rounded-lg' },
  { from: /px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs font-medium tracking-tight text-slate-600 flex items-center gap-2/g, to: 'px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs font-medium tracking-tight text-slate-700 flex items-center gap-2 rounded-lg' },
  { from: /px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-medium tracking-tight text-slate-600/g, to: 'px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-medium tracking-tight rounded-lg' }
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
