const supabase = require("../../config/serviceSupabase");

const getStudentResume = async (studentId) => {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const saveStudentResume = async (studentId, fileUrl, fileName) => {
  const { data, error } = await supabase
    .from("resumes")
    .upsert(
      {
        student_id: studentId,
        file_url: fileUrl,
        file_name: fileName,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_id",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateStudentResume = async (studentId, fileUrl, fileName) => {
  const { data, error } = await supabase
    .from("resumes")
    .update({
      file_url: fileUrl,
      file_name: fileName,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const deleteStudentResume = async (studentId) => {
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("student_id", studentId);

  if (error) {
    throw error;
  }

  return true;
};

module.exports = {
  getStudentResume,
  saveStudentResume,
  updateStudentResume,
  deleteStudentResume,
};