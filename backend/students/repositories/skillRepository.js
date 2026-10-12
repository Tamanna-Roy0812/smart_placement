const supabase = require("../../config/serviceSupabase");

const getActiveSkills = async () => {
  const { data, error } = await supabase
    .from("skills")
    .select("id, name, description")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw error;
  }

  return data;
};

const getStudentSkills = async (studentId) => {
  const { data, error } = await supabase
    .from("student_skill_scores")
    .select(`
      id,
      score,
      skill_id,
      skills (
        id,
        name,
        description
      )
    `)
    .eq("student_id", studentId)
    .order("created_at");

  if (error) {
    throw error;
  }

  return data;
};

const addStudentSkill = async (studentId, skillId, score) => {
  const { data, error } = await supabase
    .from("student_skill_scores")
    .upsert(
      {
        student_id: studentId,
        skill_id: skillId,
        score,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_id,skill_id",
      }
    )
    .select(`
      id,
      score,
      skill_id,
      skills (
        id,
        name,
        description
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateSkillScore = async (studentId, skillId, score) => {
  const { data, error } = await supabase
    .from("student_skill_scores")
    .upsert(
      {
        student_id: studentId,
        skill_id: skillId,
        score,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_id,skill_id",
      }
    )
    .select(`
      id,
      student_id,
      skill_id,
      score,
      updated_at,
      skills (
        id,
        name,
        description
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  getActiveSkills,
  getStudentSkills,
  addStudentSkill,
  updateSkillScore,
};