const supabase = require("../../config/serviceSupabase");

// Check whether the student has already applied for the job
const getApplicationByStudentAndJob = async (studentId, jobId) => {
  const { data, error } = await supabase
    .from("applications")
    .select(`
      id,
      student_id,
      job_id,
      status,
      applied_at,
      created_at,
      updated_at
    `)
    .eq("student_id", studentId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

// Create a new application
const createApplication = async (studentId, jobId) => {
  const { data, error } = await supabase
    .from("applications")
    .insert({
      student_id: studentId,
      job_id: jobId,
      status: "Applied",
      applied_at: new Date().toISOString(),
    })
    .select(`
      id,
      student_id,
      job_id,
      status,
      applied_at,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Get all applications of a student
const getStudentApplications = async (studentId) => {
  const { data, error } = await supabase
    .from("applications")
    .select(`
      id,
      student_id,
      job_id,
      status,
      applied_at,
      created_at,
      updated_at,
      jobs (
        id,
        role,
        description,
        salary,
        location,
        employment_type,
        deadline,
        required_skills,
        required_skill_percentage,
        minimum_aptitude_percentage,
        minimum_cgpa,
        eligible_branches,
        companies (
          id,
          name,
          logo_url
        )
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

// Get one application belonging to the student
const getStudentApplicationById = async (
  studentId,
  applicationId
) => {
  const { data, error } = await supabase
    .from("applications")
    .select(`
      id,
      student_id,
      job_id,
      status,
      applied_at,
      created_at,
      updated_at,
      jobs (
        id,
        role,
        description,
        salary,
        location,
        employment_type,
        deadline,
        required_skills,
        required_skill_percentage,
        minimum_aptitude_percentage,
        minimum_cgpa,
        eligible_branches,
        companies (
          id,
          name,
          logo_url
        )
      )
    `)
    .eq("id", applicationId)
    .eq("student_id", studentId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  getApplicationByStudentAndJob,
  createApplication,
  getStudentApplications,
  getStudentApplicationById,
};