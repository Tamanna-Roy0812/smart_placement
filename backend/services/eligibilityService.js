/*
 * Pure eligibility logic (no database access) so it can be unit-tested and
 * reused by both the Placement Officer and Student modules.
 *
 * job:      { min_aptitude_percentage, min_cgpa, eligible_branches[],
 *             required_skill_percentage }
 * requiredSkills: [{ id, name }]
 * scores:   [{ skill_id, highest_percentage }]  (official = highest)
 * aptitudePercentage: number | null  (null = never attempted)
 * student:  { cgpa, branch }
 */
function evaluateEligibility({ job, requiredSkills = [], scores = [], aptitudePercentage, student }) {
  const reasons = [];
  const byId = new Map(scores.map((s) => [s.skill_id, Number(s.highest_percentage)]));

  // Aptitude
  const minApt = Number(job.min_aptitude_percentage ?? 0);
  const aptitudeMet = aptitudePercentage != null && aptitudePercentage >= minApt;
  if (!aptitudeMet) {
    reasons.push(
      aptitudePercentage == null
        ? "Aptitude test not attempted."
        : `Aptitude score ${aptitudePercentage}% is below the required ${minApt}%.`
    );
  }

  // Skills: every required skill must reach the required percentage
  const minSkill = Number(job.required_skill_percentage ?? 0);
  const failedSkills = [];
  // No minimum set (0 or empty) means no skill assessment is required
  for (const skill of minSkill > 0 ? requiredSkills : []) {
    const score = byId.get(skill.id);
    if (score === undefined || score < minSkill) {
      failedSkills.push(skill.name);
      reasons.push(
        score === undefined
          ? `${skill.name} assessment not attempted (needs ${minSkill}%).`
          : `${skill.name} score ${score}% is below the required ${minSkill}%.`
      );
    }
  }
  const skillMet = failedSkills.length === 0;

  // CGPA
  const minCgpa = Number(job.min_cgpa ?? 0);
  const cgpa = student?.cgpa == null ? null : Number(student.cgpa);
  const cgpaMet = cgpa != null && cgpa >= minCgpa;
  if (!cgpaMet) {
    reasons.push(
      cgpa == null
        ? "CGPA is missing from the student profile."
        : `CGPA ${cgpa} is below the required ${minCgpa}.`
    );
  }

  // Branch (empty list = open to all branches)
  const branches = (job.eligible_branches || []).map((b) => b.toLowerCase());
  const branchMet =
    branches.length === 0 ||
    (student?.branch != null && branches.includes(String(student.branch).toLowerCase()));
  if (!branchMet) {
    reasons.push(
      student?.branch
        ? `Branch ${student.branch} is not eligible for this job.`
        : "Branch is missing from the student profile."
    );
  }

  return {
    aptitudeMet,
    skillMet,
    cgpaMet,
    branchMet,
    eligible: aptitudeMet && skillMet && cgpaMet && branchMet,
    reasons,
  };
}

module.exports = { evaluateEligibility };
