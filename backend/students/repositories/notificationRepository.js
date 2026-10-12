const supabase = require("../../config/serviceSupabase");

const getStudentNotifications = async (studentId) => {
  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id,
      student_id,
      title,
      message,
      type,
      is_read,
      created_at
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

const getStudentNotificationById = async (
  studentId,
  notificationId
) => {
  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id,
      student_id,
      title,
      message,
      type,
      is_read,
      created_at
    `)
    .eq("id", notificationId)
    .eq("student_id", studentId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const markNotificationAsRead = async (
  studentId,
  notificationId
) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .eq("student_id", studentId)
    .select(`
      id,
      student_id,
      title,
      message,
      type,
      is_read,
      created_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const createNotification = async (
  studentId,
  title,
  message,
  type
) => {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      student_id: studentId,
      title,
      message,
      type,
    })
    .select(`
      id,
      student_id,
      title,
      message,
      type,
      is_read,
      created_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  getStudentNotifications,
  getStudentNotificationById,
  markNotificationAsRead,
  createNotification,
};