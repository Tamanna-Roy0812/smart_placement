const supabase = require("../../config/serviceSupabase");

// Get all active jobs that have not passed their deadline
const getActiveJobs = async () => {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("jobs")
    .select(`
      id,
      company_id,
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
        description,
        industry,
        website,
        location,
        logo_url
      )
    `)
    .or(`deadline.is.null,deadline.gte.${today}`)
    .order("deadline");

  if (error) {
    throw error;
  }

  return data;
};

// Get one job
const getJobById = async (jobId) => {
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      id,
      company_id,
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
        description,
        industry,
        website,
        location,
        logo_url
      )
    `)
    .eq("id", jobId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  getActiveJobs,
  getJobById,
};