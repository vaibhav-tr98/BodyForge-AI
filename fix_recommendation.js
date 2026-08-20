const fs = require('fs');
let content = fs.readFileSync('server/src/services/workoutRecommendation.service.ts', 'utf8');

const regex = /for \(const workout of workouts\) \{[\s\S]*?if \(bestWorkout\) \{/m;

const replacement = `for (const workout of workouts) {
        let totalScore = 0;
        let muscleCount = 0;
        let hasConflict = false;
        let hasHistory = false;
        
        const targetedMuscles = new Set<string>();

        for (const ex of workout.exercises) {
          const muscles = exerciseMuscleMap.get(ex.name.toLowerCase()) || [];
          for (const m of muscles) {
            const mapped = MUSCLE_GROUP_MAP[m.toLowerCase()] || (m.charAt(0).toUpperCase() + m.slice(1));
            targetedMuscles.add(mapped.toLowerCase());
          }
        }

        if (targetedMuscles.size === 0) {
          totalScore = 50;
          muscleCount = 1;
        } else {
          for (const muscle of targetedMuscles) {
            const muscleReadiness = readiness.muscleGroups.find(m => m.muscle.toLowerCase() === muscle);
            if (muscleReadiness) {
              totalScore += muscleReadiness.readinessScore;
              if (muscleReadiness.status === "recent" || muscleReadiness.readinessScore < 30) {
                hasConflict = true;
              }
              if (muscleReadiness.status !== "no_history") {
                hasHistory = true;
              }
            } else {
              totalScore += 100;
            }
            muscleCount++;
          }
        }

        let avgScore = totalScore / muscleCount;

        // Rule 2 - Recovery conflict
        if (hasConflict) {
          avgScore *= 0.5; // Heavily penalize
        }

        if (avgScore > highestScore) {
          highestScore = avgScore;
          bestWorkout = workout;
          
          if (avgScore >= 80 && !hasConflict) {
            bestConfidence = "high";
            const musclesArr = Array.from(targetedMuscles).slice(0, 2);
            if (musclesArr.length > 0) {
              if (hasHistory) {
                bestReason = \`Your \${musclesArr.join(" and ")} are recovered and ready for training.\`;
              } else {
                bestReason = \`Your \${musclesArr.join(" and ")} \${musclesArr.length > 1 ? "have" : "has"} no recorded training history.\`;
              }
            } else {
              bestReason = hasHistory ? "Your body is recovered and ready for training." : "You have no recorded training history.";
            }
          } else if (avgScore >= 50 && !hasConflict) {
            bestConfidence = "medium";
            bestReason = hasHistory ? "These muscle groups have recovered well." : "These muscle groups have no recorded training history.";
          } else {
            bestConfidence = "low";
            bestReason = hasHistory ? "Your recent training history suggests taking a lighter day. This workout is your best available option." : "This workout is your best available option.";
          }
        }
      }

      if (bestWorkout) {`;

content = content.replace(regex, replacement);
fs.writeFileSync('server/src/services/workoutRecommendation.service.ts', content, 'utf8');
