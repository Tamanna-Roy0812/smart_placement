const studentRepository = require("../repositories/studentRepository");
const skillRepository = require("../repositories/skillRepository");
const resumeRepository = require("../repositories/resumeRepository");
const assessmentRepository = require("../repositories/assessmentRepository");
const jobRepository = require("../repositories/jobRepository");
const applicationRepository = require("../repositories/applicationRepository");
const notificationRepository = require("../repositories/notificationRepository");

const getStudentProfile = async (studentId) => {
  const student = await studentRepository.getStudentById(studentId);

  if (!student) {
    return null;
  }

  return student;
};

const getAvailableSkills = async () => {
  return await skillRepository.getActiveSkills();
};

const getStudentSkills = async (studentId) => {
  return await skillRepository.getStudentSkills(studentId);
};

const addStudentSkill = async (studentId, skillId, score) => {
  return await skillRepository.addStudentSkill(
    studentId,
    skillId,
    score
  );
};

const updateSkillScore = async (studentId, skillId, score) => {
  return await skillRepository.updateSkillScore(
    studentId,
    skillId,
    score
  );
};

const updateStudentProfile = async (studentId, updates) => {
  return await studentRepository.updateStudent(studentId, updates);
};

const getStudentResume = async (studentId) => {
  return await resumeRepository.getStudentResume(studentId);
};

const saveStudentResume = async (studentId, fileUrl, fileName) => {
  return await resumeRepository.saveStudentResume(
    studentId,
    fileUrl,
    fileName
  );
};

const updateStudentResume = async (studentId, fileUrl, fileName) => {
  return await resumeRepository.updateStudentResume(
    studentId,
    fileUrl,
    fileName
  );
};

const deleteStudentResume = async (studentId) => {
  return await resumeRepository.deleteStudentResume(studentId);
};

const getActiveAssessments = async () => {
  return await assessmentRepository.getActiveAssessments();
};

const getAssessmentById = async (assessmentId) => {
  return await assessmentRepository.getAssessmentById(assessmentId);
};

const getAssessmentQuestions = async (assessmentId) => {
  return await assessmentRepository.getAssessmentQuestions(assessmentId);
};

const createAssessmentAttempt = async (studentId, assessmentId) => {
  return await assessmentRepository.createAssessmentAttempt(
    studentId,
    assessmentId
  );
};

const getStudentAssessmentAttempts = async (
  studentId,
  assessmentId
) => {
  return await assessmentRepository.getStudentAssessmentAttempts(
    studentId,
    assessmentId
  );
};

const getStudentAttemptById = async (studentId, attemptId) => {
  return await assessmentRepository.getStudentAttemptById(
    studentId,
    attemptId
  );
};

const completeAssessmentAttempt = async (
  studentId,
  attemptId,
  score,
  percentage
) => {
  return await assessmentRepository.completeAssessmentAttempt(
    studentId,
    attemptId,
    score,
    percentage
  );
};

const getHighestAssessmentScore = async (
  studentId,
  assessmentId
) => {
  return await assessmentRepository.getHighestAssessmentScore(
    studentId,
    assessmentId
  );
};

const saveAssessmentAnswer = async (
  attemptId,
  questionId,
  selectedAnswer,
  isCorrect,
  marksAwarded
) => {
  return await assessmentRepository.saveAssessmentAnswer(
    attemptId,
    questionId,
    selectedAnswer,
    isCorrect,
    marksAwarded
  );
};

const getAllStudentAttempts = async (studentId) => {
  return await assessmentRepository.getAllStudentAttempts(studentId);
};

const getAssessmentAnswers = async (attemptId) => {
  return await assessmentRepository.getAssessmentAnswers(attemptId);
};

const getQuestionForScoring = async (
  assessmentId,
  questionId
) => {
  return await assessmentRepository.getQuestionForScoring(
    assessmentId,
    questionId
  );
};

const calculateAssessmentScore = async (attemptId) => {
  return await assessmentRepository.calculateAssessmentScore(
    attemptId
  );
};

const getActiveJobs = async () => {
  return await jobRepository.getActiveJobs();
};

const getJobById = async (jobId) => {
  return await jobRepository.getJobById(jobId);
};

const checkJobEligibility = async (studentId, jobId) => {
  const student = await studentRepository.getStudentById(studentId);

  if (!student) {
    return {
      eligible: false,
      reasons: ["Student profile not found."],
    };
  }

  const job = await jobRepository.getJobById(jobId);

  if (!job) {
    return null;
  }

  const reasons = [];

  // Check deadline
  if (
    job.deadline &&
    new Date(job.deadline) < new Date()
  ) {
    reasons.push("Job application deadline has passed.");
  }

  // Check CGPA
  if (
    job.minimum_cgpa !== null &&
    job.minimum_cgpa !== undefined
  ) {
    if (
      student.cgpa === null ||
      student.cgpa === undefined
    ) {
      reasons.push("Student CGPA is not available.");
    } else if (
      Number(student.cgpa) < Number(job.minimum_cgpa)
    ) {
      reasons.push(
        `CGPA must be at least ${job.minimum_cgpa}.`
      );
    }
  }

  // Check branch
  if (
    job.eligible_branches &&
    job.eligible_branches.length > 0
  ) {
    const branchEligible =
      job.eligible_branches.includes(student.branch);

    if (!branchEligible) {
      reasons.push(
        "Student branch is not eligible for this job."
      );
    }
  }

  // Get student's skill scores
  const studentSkills =
    await skillRepository.getStudentSkills(studentId);

  // Check aptitude: the student must have taken the Aptitude test, whatever
  // the job's minimum is (no minimum set = any score is fine)
  const aptitudeSkill = studentSkills.find(
    (item) => item.skills?.name?.toLowerCase() === "aptitude"
  );

  if (!aptitudeSkill) {
    reasons.push("Aptitude test not attempted.");
  } else if (
    job.minimum_aptitude_percentage !== null &&
    job.minimum_aptitude_percentage !== undefined &&
    Number(aptitudeSkill.score) < Number(job.minimum_aptitude_percentage)
  ) {
    reasons.push(
      `Aptitude score must be at least ${job.minimum_aptitude_percentage}%.`
    );
  }

  // Check required skills (only when the job sets a minimum skill score)
  const requiredPercentage =
    Number(job.required_skill_percentage || 0);

  if (
    requiredPercentage > 0 &&
    job.required_skills &&
    job.required_skills.length > 0
  ) {

    for (const requiredSkill of job.required_skills) {
      const studentSkill = studentSkills.find(
        (item) =>
          item.skills?.name?.toLowerCase() ===
          requiredSkill.toLowerCase()
      );

      if (!studentSkill) {
        reasons.push(
          `${requiredSkill} skill score is not available.`
        );
        continue;
      }

      if (
        Number(studentSkill.score) <
        requiredPercentage
      ) {
        reasons.push(
          `${requiredSkill} skill score must be at least ${requiredPercentage}%.`
        );
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    job,
  };
};

const applyForJob = async (studentId, jobId) => {
  const job = await jobRepository.getJobById(jobId);

  if (!job) {
    return {
      error: "JOB_NOT_FOUND",
    };
  }

  // Check deadline
  if (
    job.deadline &&
    new Date(job.deadline) < new Date()
  ) {
    return {
      error: "DEADLINE_PASSED",
    };
  }

  // Check whether the student has already applied
  const existingApplication =
    await applicationRepository.getApplicationByStudentAndJob(
      studentId,
      jobId
    );

  if (existingApplication) {
    return {
      error: "ALREADY_APPLIED",
      application: existingApplication,
    };
  }

  // Check eligibility before allowing application
  const eligibility = await checkJobEligibility(
    studentId,
    jobId
  );

  if (!eligibility || !eligibility.eligible) {
    return {
      error: "NOT_ELIGIBLE",
      reasons: eligibility?.reasons || [
        "Student is not eligible for this job.",
      ],
    };
  }

  const application =
  await applicationRepository.createApplication(
    studentId,
    jobId
  );

try {
  await notificationRepository.createNotification(
    studentId,
    "Application Submitted",
    `Your application for ${job.role} has been submitted successfully.`,
    "APPLICATION"
  );
} catch (notificationError) {
  console.error(
    "Create application notification error:",
    notificationError
  );
}

return {
  application,
};
};

const getStudentApplications = async (studentId) => {
  return await applicationRepository.getStudentApplications(
    studentId
  );
};

const getStudentApplicationById = async (
  studentId,
  applicationId
) => {
  return await applicationRepository.getStudentApplicationById(
    studentId,
    applicationId
  );
};

const getStudentNotifications = async (studentId) => {
  return await notificationRepository.getStudentNotifications(
    studentId
  );
};

const getStudentNotificationById = async (
  studentId,
  notificationId
) => {
  return await notificationRepository.getStudentNotificationById(
    studentId,
    notificationId
  );
};

const markNotificationAsRead = async (
  studentId,
  notificationId
) => {
  return await notificationRepository.markNotificationAsRead(
    studentId,
    notificationId
  );
};

const createNotification = async (
  studentId,
  title,
  message,
  type
) => {
  return await notificationRepository.createNotification(
    studentId,
    title,
    message,
    type
  );
};

module.exports = {
  getAllStudentAttempts,
  getStudentProfile,
  updateStudentProfile,
  getAvailableSkills,
  getStudentSkills,
  addStudentSkill,
  getStudentResume,
  saveStudentResume,
  updateStudentResume,
  deleteStudentResume,
  getActiveAssessments,
  getAssessmentById,
  getAssessmentQuestions,
  createAssessmentAttempt,
  getStudentAssessmentAttempts,
  getStudentAttemptById,
  completeAssessmentAttempt,
  getHighestAssessmentScore,
  saveAssessmentAnswer,
  getAssessmentAnswers,
  getQuestionForScoring,
  calculateAssessmentScore,
  updateSkillScore,
  getActiveJobs,
  getJobById,
  checkJobEligibility,
  applyForJob,
  getStudentApplications,
  getStudentApplicationById,
  getStudentNotifications,
  getStudentNotificationById,
  markNotificationAsRead,
  createNotification,
};