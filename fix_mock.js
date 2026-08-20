const fs = require('fs');
let content = fs.readFileSync('server/src/services/analytics.service.test.ts', 'utf8');

const regex = /lean: jest\.fn\(\)\.mockResolvedValue\((.*?)\)/g;
const replacement = "sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue($1) })";

content = content.replace(regex, replacement);
fs.writeFileSync('server/src/services/analytics.service.test.ts', content, 'utf8');
