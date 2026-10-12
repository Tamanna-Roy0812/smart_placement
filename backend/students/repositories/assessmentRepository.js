const supabase = require("../../config/serviceSupabase");

// Get all active assessments
const getActiveAssessments = async () => {
  const { data, error } = await supabase
    .from("assessments")
    .select(`
      id,
      title,
      description,
      skill_id,
      duration_minutes,
      number_of_questions,
      passing_percentage,
      negative_marking,
      random_question_selection,
      is_active,
      created_at,
      updated_at
    `)
    .eq("is_active", true)
    .order("created_at");

  if (error) {
    throw error;
  }

  return data;
};

// Get one active assessment
const getAssessmentById = async (assessmentId) => {
  const { data, error } = await supabase
    .from("assessments")
    .select(`
      id,
      title,
      description,
      skill_id,
      duration_minutes,
      number_of_questions,
      passing_percentage,
      negative_marking,
      random_question_selection,
      is_active
    `)
    .eq("id", assessmentId)
    .eq("is_active", true)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Get questions for an assessment
// correct_answer is intentionally NOT selected.
const getAssessmentQuestions = async (assessmentId) => {
  const { data, error } = await supabase
    .from("assessment_questions")
    .select(`
      question_order,
      questions (
        id,
        question,
        question_type,
        options,
        difficulty,
        marks,
        negative_marks,
        skill_id
      )
    `)
    .eq("assessment_id", assessmentId)
    .order("question_order");

  if (error) {
    throw error;
  }

  return data;
};

// Create a new assessment attempt
const createAssessmentAttempt = async (studentId, assessmentId) => {
  const { data, error } = await supabase
    .from("assessment_attempts")
    .insert({
      student_id: studentId,
      assessment_id: assessmentId,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Get all attempts of a student for an assessment
const getStudentAssessmentAttempts = async (
  studentId,
  assessmentId
) => {
  const { data, error } = await supabase
    .from("assessment_attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

// Get one attempt belonging to the student
const getStudentAttemptById = async (studentId, attemptId) => {
  const { data, error } = await supabase
    .from("assessment_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("student_id", studentId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Complete an assessment attempt
const completeAssessmentAttempt = async (
  studentId,
  attemptId,
  score,
  percentage
) => {
  const { data, error } = await supabase
    .from("assessment_attempts")
    .update({
      score,
      percentage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Get the highest completed score for an assessment
const getHighestAssessmentScore = async (
  studentId,
  assessmentId
) => {
  const { data, error } = await supabase
    .from("assessment_attempts")
    .select("id, score, percentage, completed_at")
    .eq("student_id", studentId)
    .eq("assessment_id", assessmentId)
    .not("completed_at", "is", null)
    .order("percentage", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const saveAssessmentAnswer = async (
  attemptId,
  questionId,
  selectedAnswer,
  isCorrect,
  marksAwarded
) => {
  const { data, error } = await supabase
    .from("assessment_answers")
    .upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
      },
      {
        onConflict: "attempt_id,question_id",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const getAssessmentAnswers = async (attemptId) => {
  const { data, error } = await supabase
    .from("assessment_answers")
    .select(`
      id,
      attempt_id,
      question_id,
      selected_answer,
      is_correct,
      marks_awarded,
      created_at
    `)
    .eq("attempt_id", attemptId)
    .order("created_at");

  if (error) {
    throw error;
  }

  return data;
};

const getQuestionForScoring = async (assessmentId, questionId) => {
  const { data, error } = await supabase
    .from("assessment_questions")
    .select(`
      questions (
        id,
        correct_answer,
        marks,
        negative_marks
      )
    `)
    .eq("assessment_id", assessmentId)
    .eq("question_id", questionId)
    .single();

  if (error) {
    throw error;
  }

  return data?.questions;
};

const calculateAssessmentScore = async (attemptId) => {
  const { data, error } = await supabase
    .from("assessment_answers")
    .select("marks_awarded")
    .eq("attempt_id", attemptId);

  if (error) {
    throw error;
  }

  const score = data.reduce(
    (total, answer) => total + Number(answer.marks_awarded || 0),
    0
  );

  return score;
};

// All attempts of a student across assessments (for the Attempts / Results pages)
const getAllStudentAttempts = async (studentId) => {
  const { data, error } = await supabase
    .from("assessment_attempts")
    .select(
      "id, assessment_id, score, percentage, started_at, completed_at, created_at, assessments(id, title, passing_percentage, duration_minutes, skill_id)"
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  getAllStudentAttempts,
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
};