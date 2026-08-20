const fs = require('fs');
let content = fs.readFileSync('server/src/services/analytics.service.test.ts', 'utf8');

// For Exercise mock in the first test:
content = content.replace(/(Exercise\.find as jest\.Mock\)\.mockReturnValue\(\{[\s\S]*?\}\);)/, "$1\n      (Exercise.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });");

// For WorkoutSession mock:
content = content.replace(/mockReturnValue\(\{\s*lean:\s*jest\.fn\(\)\.mockResolvedValue\(([\s\S]*?)\)\s*\}\)/g, "mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue($1) }) })");

fs.writeFileSync('server/src/services/analytics.service.test.ts', content, 'utf8');
