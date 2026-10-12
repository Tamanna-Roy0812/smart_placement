const studentService = require("../services/studentService");

const getStudentProfile = async (req, res) => {
  try {
    const student = await studentService.getStudentProfile(req.user.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    return res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Get student profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch student profile.",
    });
  }
};

const getAvailableSkills = async (req, res) => {
  try {
    const skills = await studentService.getAvailableSkills();

    return res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error("Get available skills error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch skills.",
    });
  }
};

const getStudentSkills = async (req, res) => {
  try {
    const skills = await studentService.getStudentSkills(req.user.id);

    return res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error("Get student skills error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch student skills.",
    });
  }
};

const addStudentSkill = async (req, res) => {
  try {
    const { skill_id, score } = req.body;

    if (!skill_id) {
      return res.status(400).json({
        success: false,
        message: "skill_id is required.",
      });
    }

    if (score !== undefined && (isNaN(score) || score < 0 || score > 100)) {
      return res.status(400).json({
        success: false,
        message: "Score must be between 0 and 100.",
      });
    }

    const skill = await studentService.addStudentSkill(
      req.user.id,
      skill_id,
      score ?? null
    );

    return res.json({
      success: true,
      message: "Student skill saved successfully.",
      data: skill,
    });
  } catch (error) {
    console.error("Add student skill error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save student skill.",
    });
  }
};

const getStudentSkillScores = async (req, res) => {
  try {
    const skills = await studentService.getStudentSkills(
      req.user.id
    );

    return res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error("Get student skill scores error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch student skill scores.",
    });
  }
};

const getStudentResume = async (req, res) => {
  try {
    const resume = await studentService.getStudentResume(req.user.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    return res.json({
      success: true,
      data: resume,
    });
  } catch (error) {
    console.error("Get student resume error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch resume.",
    });
  }
};

const saveStudentResume = async (req, res) => {
  try {
    const { file_url, file_name } = req.body;

    if (!file_url) {
      return res.status(400).json({
        success: false,
        message: "file_url is required.",
      });
    }

    const resume = await studentService.saveStudentResume(
      req.user.id,
      file_url,
      file_name || null
    );

    return res.status(201).json({
      success: true,
      message: "Resume saved successfully.",
      data: resume,
    });
  } catch (error) {
    console.error("Save student resume error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save resume.",
    });
  }
};

const updateStudentResume = async (req, res) => {
  try {
    const { file_url, file_name } = req.body;

    if (!file_url) {
      return res.status(400).json({
        success: false,
        message: "file_url is required.",
      });
    }

    const resume = await studentService.updateStudentResume(
      req.user.id,
      file_url,
      file_name || null
    );

    return res.json({
      success: true,
      message: "Resume updated successfully.",
      data: resume,
    });
  } catch (error) {
    console.error("Update student resume error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update resume.",
    });
  }
};

const deleteStudentResume = async (req, res) => {
  try {
    await studentService.deleteStudentResume(req.user.id);

    return res.json({
      success: true,
      message: "Resume deleted successfully.",
    });
  } catch (error) {
    console.error("Delete student resume error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete resume.",
    });
  }
};

const getActiveAssessments = async (req, res) => {
  try {
    const assessments = await studentService.getActiveAssessments();

    return res.json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    console.error("Get active assessments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessments.",
    });
  }
};

const getAssessmentById = async (req, res) => {
  try {
    const assessment = await studentService.getAssessmentById(
      req.params.id
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found.",
      });
    }

    return res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    console.error("Get assessment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessment.",
    });
  }
};

const getAssessmentQuestions = async (req, res) => {
  try {
    const questions = await studentService.getAssessmentQuestions(
      req.params.id
    );

    return res.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Get assessment questions error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessment questions.",
    });
  }
};

const createAssessmentAttempt = async (req, res) => {
  try {
    const attempt = await studentService.createAssessmentAttempt(
      req.user.id,
      req.params.id
    );

    return res.status(201).json({
      success: true,
      message: "Assessment attempt started successfully.",
      data: attempt,
    });
  } catch (error) {
    console.error("Create assessment attempt error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start assessment.",
    });
  }
};

const getStudentAssessmentAttempts = async (req, res) => {
  try {
    const attempts =
      await studentService.getStudentAssessmentAttempts(
        req.user.id,
        req.params.id
      );

    return res.json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error("Get assessment attempts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessment attempts.",
    });
  }
};

const getStudentAttemptById = async (req, res) => {
  try {
    const attempt = await studentService.getStudentAttemptById(
      req.user.id,
      req.params.attemptId
    );

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Assessment attempt not found.",
      });
    }

    return res.json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    console.error("Get assessment attempt error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessment attempt.",
    });
  }
};

const completeAssessmentAttempt = async (req, res) => {
  try {
    const attempt = await studentService.getStudentAttemptById(
      req.user.id,
      req.params.attemptId
    );

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Assessment attempt not found.",
      });
    }

    if (attempt.completed_at) {
      return res.status(400).json({
        success: false,
        message: "Assessment attempt is already completed.",
      });
    }

    const score =
      await studentService.calculateAssessmentScore(
        req.params.attemptId
      );

    const questions =
      await studentService.getAssessmentQuestions(
        attempt.assessment_id
      );

    const totalMarks = questions.reduce(
      (total, item) =>
        total + Number(item.questions.marks || 0),
      0
    );

    // negative marking can push the raw score below zero; never show < 0%
    const percentage =
      totalMarks > 0
        ? Math.max(0, (score / totalMarks) * 100)
        : 0;

    const completedAttempt =
      await studentService.completeAssessmentAttempt(
        req.user.id,
        req.params.attemptId,
        score,
        percentage
      );

    // Get the student's highest completed score
    const highestScore =
      await studentService.getHighestAssessmentScore(
        req.user.id,
        attempt.assessment_id
      );

    // Get the assessment to identify its skill
    const assessment =
      await studentService.getAssessmentById(
        attempt.assessment_id
      );

    // Store the highest percentage as the student's skill score
    if (highestScore && assessment) {
      await studentService.updateSkillScore(
        req.user.id,
        assessment.skill_id,
        highestScore.percentage
      );
    }

    return res.json({
      success: true,
      message: "Assessment submitted successfully.",
      data: completedAttempt,
    });
  } catch (error) {
    console.error(
      "Complete assessment attempt error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to submit assessment.",
    });
  }
};

const getAllAttempts = async (req, res) => {
  try {
    const attempts = await studentService.getAllStudentAttempts(req.user.id);
    return res.json({ success: true, data: attempts });
  } catch (error) {
    console.error("Get all attempts error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessment attempts.",
    });
  }
};

const getHighestAssessmentScore = async (req, res) => {
  try {
    const result =
      await studentService.getHighestAssessmentScore(
        req.user.id,
        req.params.id
      );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get highest assessment score error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessment score.",
    });
  }
};

const saveAssessmentAnswer = async (req, res) => {
  try {
    const { question_id, selected_answer } = req.body;

    if (!question_id) {
      return res.status(400).json({
        success: false,
        message: "question_id is required.",
      });
    }

    const attempt = await studentService.getStudentAttemptById(
      req.user.id,
      req.params.attemptId
    );

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Assessment attempt not found.",
      });
    }

    if (attempt.completed_at) {
  return res.status(400).json({
    success: false,
    message: "Assessment attempt is already completed.",
  });
}

    const question =
  await studentService.getQuestionForScoring(
    attempt.assessment_id,
    question_id
  );

if (!question) {
  return res.status(404).json({
    success: false,
    message: "Question does not belong to this assessment.",
  });
}

const isUnanswered =
  selected_answer === undefined ||
  selected_answer === null ||
  selected_answer === "";

const isCorrect =
  !isUnanswered &&
  selected_answer === question.correct_answer;

const marksAwarded = isUnanswered
  ? 0
  : isCorrect
  ? Number(question.marks)
  : Number(question.negative_marks || 0) * -1;

    const answer = await studentService.saveAssessmentAnswer(
      req.params.attemptId,
      question_id,
      selected_answer || null,
      isCorrect,
      marksAwarded
    );

    return res.json({
      success: true,
      message: "Answer saved successfully.",
      data: answer,
    });
  } catch (error) {
    console.error("Save assessment answer error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save assessment answer.",
    });
  }
};

const getAssessmentAnswers = async (req, res) => {
  try {
    const attempt = await studentService.getStudentAttemptById(
      req.user.id,
      req.params.attemptId
    );

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Assessment attempt not found.",
      });
    }

    const answers = await studentService.getAssessmentAnswers(
      req.params.attemptId
    );

    return res.json({
      success: true,
      data: answers,
    });
  } catch (error) {
    console.error("Get assessment answers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assessment answers.",
    });
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "department",
      "branch",
      "graduation_year",
      "cgpa",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile fields provided for update.",
      });
    }

    const student = await studentService.updateStudentProfile(
      req.user.id,
      updates
    );

    return res.json({
      success: true,
      message: "Student profile updated successfully.",
      data: student,
    });
  } catch (error) {
    console.error("Update student profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update student profile.",
    });
  }
};

const getActiveJobs = async (req, res) => {
  try {
    const jobs = await studentService.getActiveJobs();

    return res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error("Get active jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch jobs.",
    });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await studentService.getJobById(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Get job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch job.",
    });
  }
};

const checkJobEligibility = async (req, res) => {
  try {
    const result =
      await studentService.checkJobEligibility(
        req.user.id,
        req.params.id
      );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Check job eligibility error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to check job eligibility.",
    });
  }
};

const applyForJob = async (req, res) => {
  try {
    const result = await studentService.applyForJob(
      req.user.id,
      req.params.id
    );

    if (result.error === "JOB_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (result.error === "DEADLINE_PASSED") {
      return res.status(400).json({
        success: false,
        message: "Job application deadline has passed.",
      });
    }

    if (result.error === "ALREADY_APPLIED") {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job.",
        data: result.application,
      });
    }

    if (result.error === "NOT_ELIGIBLE") {
      return res.status(403).json({
        success: false,
        message: "You are not eligible for this job.",
        reasons: result.reasons,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      data: result.application,
    });
  } catch (error) {
    console.error("Apply for job error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit application.",
    });
  }
};

const getStudentApplications = async (req, res) => {
  try {
    const applications =
      await studentService.getStudentApplications(
        req.user.id
      );

    return res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error(
      "Get student applications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch applications.",
    });
  }
};

const getStudentApplicationById = async (req, res) => {
  try {
    const application =
      await studentService.getStudentApplicationById(
        req.user.id,
        req.params.applicationId
      );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    return res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error(
      "Get student application error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch application.",
    });
  }
};

const getStudentNotifications = async (req, res) => {
  try {
    const notifications =
      await studentService.getStudentNotifications(
        req.user.id
      );

    return res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error(
      "Get student notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notifications.",
    });
  }
};

const getStudentNotificationById = async (req, res) => {
  try {
    const notification =
      await studentService.getStudentNotificationById(
        req.user.id,
        req.params.notificationId
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error(
      "Get notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notification.",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const notification =
      await studentService.markNotificationAsRead(
        req.user.id,
        req.params.notificationId
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error(
      "Mark notification as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update notification.",
    });
  }
};

module.exports = {
  getAllAttempts,
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
getStudentSkillScores,
getActiveJobs,
getJobById,
checkJobEligibility,
applyForJob,
getStudentApplications,
getStudentApplicationById,
getStudentNotifications,
getStudentNotificationById,
markNotificationAsRead,
};