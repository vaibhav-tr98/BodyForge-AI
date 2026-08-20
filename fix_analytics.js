const fs = require('fs');
let content = fs.readFileSync('server/src/services/analytics.service.ts', 'utf8');

content = content.replace(
  /let status: "ready" \| "moderate" \| "light" \| "recent" \| "no_history";\s*if \(score >= 80\) status = "ready";/g,
  `let status: "ready" | "moderate" | "light" | "recent" | "no_history";
      if (!stat.lastTrainedAt) status = "no_history";
      else if (score >= 80) status = "ready";`
);

content = content.replace(
  /let overallStatus: "ready" \| "moderate" \| "light" \| "recent" \| "no_history";\s*if \(overallScore >= 80\) overallStatus = "ready";/g,
  `let overallStatus: "ready" | "moderate" | "light" | "recent" | "no_history";
    const allNoHistory = readinessList.every(r => r.status === "no_history");
    if (allNoHistory) overallStatus = "no_history";
    else if (overallScore >= 80) overallStatus = "ready";`
);

content = content.replace(
  /const readyMuscles = readinessList\.filter\(r => r\.status === "ready"\);\s*const recommendation = \{\s*muscleGroups: \[\] as string\[\],\s*reason: ""\s*\};\s*if \(readyMuscles\.length === 0\) \{\s*recommendation\.reason = "Most muscle groups were trained recently\. Consider a rest day or a lighter session\.";\s*\} else \{/g,
  `const readyMuscles = readinessList.filter(r => r.status === "ready");
    const musclesWithHistory = readinessList.filter(r => r.status !== "no_history");
    const recommendation = {
      muscleGroups: [] as string[],
      reason: ""
    };

    if (musclesWithHistory.length === 0) {
      recommendation.reason = "Build more training history to establish your readiness baseline.";
    } else if (readyMuscles.length === 0) {
      recommendation.reason = "Most muscle groups were trained recently. Consider a rest day or a lighter session.";
    } else {`
);

fs.writeFileSync('server/src/services/analytics.service.ts', content, 'utf8');
