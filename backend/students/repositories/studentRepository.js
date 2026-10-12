const supabase = require("../../config/serviceSupabase");

const getStudentById = async (studentId) => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
};

const updateStudent = async (studentId, updates) => {
  const { data, error } = await supabase
    .from("students")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  getStudentById,
  updateStudent,
};