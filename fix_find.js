const fs = require('fs');
let content = fs.readFileSync('server/src/services/analytics.service.ts', 'utf8');

const regexFind = /const sessions = await WorkoutSession\.find\(\{[\s\S]*?\}\)\.lean\(\);[\s\S]*?if \(sessions\.length === 0\) \{\s*return null;\s*\}/;

const replacementFind = `const sessions = await WorkoutSession.find({
      user: userId,
      status: "completed"
    }).sort({ completedAt: 1 }).lean();`;

content = content.replace(regexFind, replacementFind);
fs.writeFileSync('server/src/services/analytics.service.ts', content, 'utf8');
