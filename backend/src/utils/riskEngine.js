export const evaluateRisk = ({ attendancePercent, backlogCount, cgpa, previousCgpa }) => {
  let score = 0;

  if (attendancePercent < 60) score += 3;
  else if (attendancePercent < 75) score += 2;

  if (backlogCount >= 3) score += 3;
  else if (backlogCount > 0) score += 2;

  if (cgpa < 6) score += 3;
  else if (cgpa < 7) score += 2;

  if (typeof previousCgpa === "number" && previousCgpa - cgpa >= 0.5) {
    score += 1;
  }

  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
};
