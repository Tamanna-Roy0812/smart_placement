const supabase = require("../../config/serviceSupabase");
const resumeRepository = require("../repositories/resumeRepository");
const jobRepository = require("../repositories/jobRepository");
const studentRepository = require("../repositories/studentRepository");
const skillRepository = require("../repositories/skillRepository");

const BUCKET = "resumes";

/* GET /api/student/recommendations
 * Sends the student's resume and the open jobs to the AI service and
 * returns the jobs ranked by match %. Fails soft: if the AI service is off
 * the page shows a friendly message instead of breaking. */
const getRecommendations = async (req, res) => {
  const baseUrl = (process.env.AI_SERVICE_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    return res.status(503).json({ success: false, message: "Job matching is not set up yet." });
  }

  try {
    const resume = await resumeRepository.getStudentResume(req.user.id);
    if (!resume || !resume.file_path) {
      return res.status(422).json({
        success: false,
        message: "Upload your resume to see job matches.",
      });
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(resume.file_path);
    if (downloadError || !file) {
      return res.status(502).json({ success: false, message: "Could not read your resume." });
    }

    const [jobs, student, skills] = await Promise.all([
      jobRepository.getActiveJobs(),
      studentRepository.getStudentById(req.user.id),
      skillRepository.getStudentSkills(req.user.id),
    ]);
    if (!jobs.length) {
      return res.json({ success: true, data: { extracted_skills: [], recommendations: [] } });
    }

    const skill_scores = {};
    for (const s of skills) {
      if (s.skills?.name && s.score != null) skill_scores[s.skills.name] = Number(s.score);
    }
    const aptKey = Object.keys(skill_scores).find((k) => /^aptitude$/i.test(k));
    const context = {
      student: {
        cgpa: student?.cgpa != null ? Number(student.cgpa) : null,
        branch: student?.branch || null,
        aptitude: aptKey ? skill_scores[aptKey] : null,
        skill_scores,
      },
    };

    const form = new FormData();
    form.append("file", file, resume.file_name || "resume.pdf");
    form.append(
      "jobs",
      JSON.stringify(
        jobs.map((j) => ({
          id: j.id,
          role: j.role,
          description: j.description || "",
          required_skills: j.required_skills || [],
          minimum_cgpa: j.minimum_cgpa,
          eligible_branches: j.eligible_branches || [],
          minimum_aptitude_percentage: j.minimum_aptitude_percentage,
          required_skill_percentage: j.required_skill_percentage,
        }))
      )
    );
    form.append("top_n", "50");
    form.append("context", JSON.stringify(context));

    let response;
    try {
      response = await fetch(baseUrl + "/recommend", {
        method: "POST",
        headers: process.env.AI_SERVICE_KEY ? { "X-API-Key": process.env.AI_SERVICE_KEY } : {},
        body: form,
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) {
      console.error("AI service unreachable:", e.message);
      return res.status(502).json({ success: false, message: "Job matching is unavailable right now." });
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status === 422 || response.status === 415 ? 422 : 502).json({
        success: false,
        message: typeof body.detail === "string" ? body.detail : "Job matching failed.",
      });
    }
    return res.json({ success: true, data: body });
  } catch (error) {
    console.error("Recommendations error:", error);
    return res.status(500).json({ success: false, message: "Unable to load job matches." });
  }
};

module.exports = { getRecommendations };
