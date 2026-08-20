const fs = require('fs');
let content = fs.readFileSync('client/src/components/dashboard/TrainingReadinessSection.tsx', 'utf8');
content = content.replace(/{m.status === 'ready' \? '\?' : m.status === 'no_history' \? '\?' : '\?'} {m.daysSinceLastTrained === null/g, "{m.status === 'ready' ? '?' : m.status === 'no_history' ? '?' : '?'} {m.daysSinceLastTrained === null");
fs.writeFileSync('client/src/components/dashboard/TrainingReadinessSection.tsx', content, 'utf8');
