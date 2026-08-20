const fs = require('fs');
let content = fs.readFileSync('server/src/services/analytics.service.test.ts', 'utf8');

const regex = /expect\(result\)\.toBeNull\(\);/;
const replacement = `expect(result).not.toBeNull();
      expect(result.overallScore).toBe(100);
      expect(result.muscleGroups[0].status).toBe("no_history");`;

content = content.replace(regex, replacement);
fs.writeFileSync('server/src/services/analytics.service.test.ts', content, 'utf8');
