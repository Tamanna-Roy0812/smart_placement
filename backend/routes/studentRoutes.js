const express = require("express");
const authenticate = require("../middleware/auth");
const studentController = require("../students/controllers/studentController");
const resumeFileController = require("../students/controllers/resumeFileController");
const recommendationController = require("../students/controllers/recommendationController");

const router = express.Router();

// All Student routes require authentication
router.use(authenticate);

// Student profile
router.get("/profile", studentController.getStudentProfile);
router.patch("/profile", studentController.updateStudentProfile);

// Skills
router.get("/skills", studentController.getAvailableSkills);
router.get("/skills/my", studentController.getStudentSkills);
router.post("/skills", studentController.addStudentSkill);
router.get("/skill-scores", studentController.getStudentSkillScores);

// Resume file upload (raw bytes) and short-lived view link
router.post(
  "/resume/upload",
  express.raw({ type: () => true, limit: "6mb" }),
  resumeFileController.uploadResume
);
router.get("/resume/link", resumeFileController.getResumeLink);

// Resume
router.get("/resume", studentController.getStudentResume);
router.post("/resume", studentController.saveStudentResume);
router.patch("/resume", studentController.updateStudentResume);
router.delete("/resume", studentController.deleteStudentResume);

// Assessments
router.get("/attempts", studentController.getAllAttempts);
router.get("/assessments", studentController.getActiveAssessments);
router.get("/assessments/:id", studentController.getAssessmentById);
router.get("/assessments/:id/questions", studentController.getAssessmentQuestions);
router.post(
  "/assessments/:id/attempts",
  studentController.createAssessmentAttempt
);
router.get(
  "/assessments/:id/attempts",
  studentController.getStudentAssessmentAttempts
);
router.get(
  "/assessments/:id/highest-score",
  studentController.getHighestAssessmentScore
);
router.get(
  "/assessments/:id/attempts/:attemptId",
  studentController.getStudentAttemptById
);
router.patch(
  "/assessments/:id/attempts/:attemptId/complete",
  studentController.completeAssessmentAttempt
);
router.post(
  "/assessments/:id/attempts/:attemptId/answers",
  studentController.saveAssessmentAnswer
);
router.get(
  "/assessments/:id/attempts/:attemptId/answers",
  studentController.getAssessmentAnswers
);

//Jobs
router.get("/recommendations", recommendationController.getRecommendations);
router.get("/jobs", studentController.getActiveJobs);
router.get("/jobs/:id", studentController.getJobById);
router.get("/jobs/:id/eligibility", studentController.checkJobEligibility);

// Applications
router.post(
  "/jobs/:id/apply",
  studentController.applyForJob
);
router.get(
  "/applications",
  studentController.getStudentApplications
);
router.get(
  "/applications/:applicationId",
  studentController.getStudentApplicationById
);

// Notifications
router.get(
  "/notifications",
  studentController.getStudentNotifications
);
router.get(
  "/notifications/:notificationId",
  studentController.getStudentNotificationById
);
router.patch(
  "/notifications/:notificationId/read",
  studentController.markNotificationAsRead
);

module.exports = router;