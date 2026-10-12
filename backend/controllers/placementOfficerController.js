const { createClient } = require("@supabase/supabase-js");

const { evaluateEligibility } = require("../services/eligibilityService");
const {
  isUuid,
  validateCompany,
  validateJob,
  validateStatus,
} = require("../utils/validators");

/*

 * Placement Officer controller.
 * Every officer endpoint requires a valid session AND the officer role.
 * Data access uses a client carrying the caller's own token, so Postgres
 * Row Level Security is the final gatekeeper (an officer only ever sees
 * jobs they created and the applicants to them). The explicit filters
 * below are defence in depth, not the only protection.
 *
 * Schema notes (matches the team's existing tables):
 *   jobs.created_by            = the officer
 *   jobs.required_skills       = text[] of skill NAMES
 *   students.name              = student's name
 *   student_skill_scores.score = official (highest) percentage per skill
 */
const RESUME_BUCKET = "resumes";
const SIGNED_URL_SECONDS = 60 * 10;

function db(req) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: req.headers.authorization } },
  });
}

/* Service-role client: used ONLY to sign resume URLs, after RLS has already
 * confirmed this officer may see the application. */
function storageClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/* applications -> students has no foreign key in this database, so student
 * names are looked up separately instead of with a PostgREST embed. */
async function studentNameMap(client, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await client.from("students").select("id, name").in("id", unique);
  return new Map((data || []).map((x) => [x.id, x.name]));
}

function fail(res, error, status = 400) {
  console.error("[officer]", error?.code || "", error?.message || error);
  let message = "Request could not be completed.";
  if (error?.code === "23503") message = "A referenced record does not exist.";
  else if (error?.code === "23505") message = "That record already exists.";
  else if (error?.code === "23514") message = "A value is outside the allowed range.";
  else if (error?.code === "42501") {
    status = 403;
    message = "You do not have permission to do that.";
  }
  return res.status(status).json({ success: false, message });
}

function badRequest(res, errors) {
  return res.status(400).json({ success: false, message: "Validation failed.", errors });
}

function requireId(req, res) {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid id." });
    return false;
  }
  return true;
}

/* =========================================================
   DASHBOARD
   GET /api/officer/dashboard
========================================================= */
const getDashboard = async (req, res) => {
  try {
    const client = db(req);
    const uid = req.user.id;

    const [jobs, apps, recent] = await Promise.all([
      client.from("jobs").select("id", { count: "exact", head: true }).eq("created_by", uid),
      client
        .from("applications")
        .select("id, jobs!inner(created_by)", { count: "exact", head: true })
        .eq("jobs.created_by", uid),
      client
        .from("applications")
        .select(
          "id, status, created_at, applied_at, student_id, job:jobs!inner(role, created_by, company:companies(name))"
        )
        .eq("job.created_by", uid)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const err = [jobs, apps, recent].find((r) => r.error)?.error;
    if (err) return fail(res, err);
    const names = await studentNameMap(client, (recent.data || []).map((a) => a.student_id));

    res.json({
      success: true,
      data: {
        total_jobs: jobs.count || 0,
        total_applications: apps.count || 0,
        recent_applications: (recent.data || []).map((a) => ({
          id: a.id,
          status: a.status,
          applied_at: a.applied_at || a.created_at,
          student_name: names.get(a.student_id) || "Unknown",
          job_role: a.job?.role,
          company: a.job?.company?.name,
        })),
      },
    });
  } catch (e) {
    fail(res, e, 500);
  }
};

/* =========================================================
   SKILLS (read-only list for the job form's skill picker)
   GET /api/officer/skills
========================================================= */
const getSkills = async (req, res) => {
  const { data, error } = await db(req)
    .from("skills")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) return fail(res, error);
  res.json({ success: true, data });
};

/* =========================================================
   COMPANIES
   Officers see every company (jobs may target any) but can only
   edit/delete companies they created.
========================================================= */
const getCompanies = async (req, res) => {
  const { data, error } = await db(req)
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return fail(res, error);
  res.json({
    success: true,
    data: data.map((c) => ({ ...c, can_edit: c.created_by === req.user.id })),
  });
};

const createCompany = async (req, res) => {
  const { value, errors } = validateCompany(req.body);
  if (errors) return badRequest(res, errors);

  const { data, error } = await db(req)
    .from("companies")
    .insert({ ...value, created_by: req.user.id })
    .select()
    .single();
  if (error) return fail(res, error);
  res.status(201).json({ success: true, data });
};

const updateCompany = async (req, res) => {
  if (!requireId(req, res)) return;
  const { value, errors } = validateCompany(req.body, { partial: true });
  if (errors) return badRequest(res, errors);
  if (!Object.keys(value).length) return badRequest(res, ["No valid fields to update."]);

  const { data, error } = await db(req)
    .from("companies")
    .update(value)
    .eq("id", req.params.id)
    .eq("created_by", req.user.id)
    .select()
    .maybeSingle();
  if (error) return fail(res, error);
  if (!data)
    return res.status(404).json({ success: false, message: "Company not found or not yours to edit." });
  res.json({ success: true, data });
};

const deleteCompany = async (req, res) => {
  if (!requireId(req, res)) return;
  const { data, error } = await db(req)
    .from("companies")
    .delete()
    .eq("id", req.params.id)
    .eq("created_by", req.user.id)
    .select("id");
  if (error) return fail(res, error);
  if (!data?.length)
    return res.status(404).json({ success: false, message: "Company not found or not yours to delete." });
  res.json({ success: true, message: "Company deleted." });
};

/* =========================================================
   JOBS
========================================================= */
const JOB_SELECT = "*, company:companies(id, name, logo_url), applications(count)";

function shapeJob(j) {
  const { applications, ...rest } = j;
  return { ...rest, application_count: applications?.[0]?.count ?? 0 };
}

const getJobs = async (req, res) => {
  const { data, error } = await db(req)
    .from("jobs")
    .select(JOB_SELECT)
    .eq("created_by", req.user.id)
    .order("created_at", { ascending: false });
  if (error) return fail(res, error);
  res.json({ success: true, data: data.map(shapeJob) });
};

const createJob = async (req, res) => {
  const { value, errors } = validateJob(req.body);
  if (errors) return badRequest(res, errors);

  const { data, error } = await db(req)
    .from("jobs")
    .insert({ ...value, created_by: req.user.id })
    .select(JOB_SELECT)
    .single();
  if (error) return fail(res, error);
  res.status(201).json({ success: true, data: shapeJob(data) });
};

const updateJob = async (req, res) => {
  if (!requireId(req, res)) return;
  const { value, errors } = validateJob(req.body, { partial: true });
  if (errors) return badRequest(res, errors);
  if (!Object.keys(value).length) return badRequest(res, ["No valid fields to update."]);

  const { data, error } = await db(req)
    .from("jobs")
    .update(value)
    .match({ id: req.params.id, created_by: req.user.id })
    .select(JOB_SELECT)
    .maybeSingle();
  if (error) return fail(res, error);
  if (!data) return res.status(404).json({ success: false, message: "Job not found." });
  res.json({ success: true, data: shapeJob(data) });
};

const deleteJob = async (req, res) => {
  if (!requireId(req, res)) return;
  const { data, error } = await db(req)
    .from("jobs")
    .delete()
    .match({ id: req.params.id, created_by: req.user.id })
    .select("id");
  if (error) return fail(res, error);
  if (!data?.length) return res.status(404).json({ success: false, message: "Job not found." });
  res.json({ success: true, message: "Job deleted." });
};

/* =========================================================
   APPLICATIONS  (the only way an officer ever sees a student)
========================================================= */

/* GET /api/officer/applications?search=&status=&job_id=&page=1&limit=20 */
const getApplications = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const search = String(req.query.search || "").trim().replace(/[%,()]/g, "");

  const client = db(req);
  let q = client
    .from("applications")
    .select(
      `id, status, created_at, applied_at, match_percentage, student_id, job:jobs!inner(id, role, created_by, company:companies(name))`,
      { count: "exact" }
    )
    .eq("job.created_by", req.user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    const { data: found } = await client.from("students").select("id").ilike("name", `%${search}%`).limit(500);
    const ids = (found || []).map((x) => x.id);
    if (!ids.length) {
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0 } });
    }
    q = q.in("student_id", ids);
  }
  if (req.query.status) q = q.eq("status", String(req.query.status));
  if (req.query.job_id) {
    if (!isUuid(req.query.job_id)) return badRequest(res, ["job_id must be a valid id."]);
    q = q.eq("job_id", req.query.job_id);
  }

  const { data, error, count } = await q;
  if (error) return fail(res, error);
  const names = await studentNameMap(client, data.map((a) => a.student_id));

  res.json({
    success: true,
    data: data.map((a) => ({
      id: a.id,
      student_id: a.student_id,
      student_name: names.get(a.student_id) || "Unknown",
      job_id: a.job?.id,
      job_role: a.job?.role,
      company: a.job?.company?.name,
      applied_at: a.applied_at || a.created_at,
      status: a.status,
      match_percentage: a.match_percentage,
    })),
    pagination: { page, limit, total: count || 0 },
  });
};

/* Storage path for a resume row: use file_path, else parse it from file_url */
function resumePath(r) {
  if (r.file_path) return r.file_path;
  const m = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/resumes\/([^?]+)/.exec(r.file_url || "");
  return m ? decodeURIComponent(m[1]) : null;
}

/* GET /api/officer/applications/:id  -> full read-only detail */
const getApplicationDetail = async (req, res) => {
  if (!requireId(req, res)) return;
  const client = db(req);

  const { data: app, error } = await client
    .from("applications")
    .select(
      `id, status, created_at, applied_at, match_percentage, extracted_skills, missing_skills, student_id,
       job:jobs!inner(*, company:companies(name))`
    )
    .eq("id", req.params.id)
    .eq("job.created_by", req.user.id)
    .maybeSingle();
  if (error) return fail(res, error);
  if (!app) return res.status(404).json({ success: false, message: "Application not found." });

  const [studentRow, profile, resume, scores, skills] = await Promise.all([
    client.from("students").select("*").eq("id", app.student_id).maybeSingle(),
    client.from("profiles").select("email").eq("id", app.student_id).maybeSingle(),
    client
      .from("resumes")
      .select("file_path, file_url, file_name, uploaded_at")
      .eq("student_id", app.student_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("student_skill_scores").select("skill_id, score").eq("student_id", app.student_id),
    client.from("skills").select("id, name"),
  ]);
  const subErr = [studentRow, profile, resume, scores, skills].find((r) => r.error)?.error;
  if (subErr) return fail(res, subErr);
  app.student = studentRow.data;

  // Resume: short-lived signed URLs (bucket stays private)
  let resumeOut = null;
  if (resume.data) {
    const path = resumePath(resume.data);
    let view_url = null;
    let download_url = null;
    if (path) {
      const storage = storageClient().storage.from(RESUME_BUCKET);
      const [v, d] = await Promise.all([
        storage.createSignedUrl(path, SIGNED_URL_SECONDS),
        storage.createSignedUrl(path, SIGNED_URL_SECONDS, { download: true }),
      ]);
      view_url = v.data?.signedUrl || null;
      download_url = d.data?.signedUrl || null;
    } else if (resume.data.file_url) {
      view_url = download_url = resume.data.file_url;
    }
    resumeOut = {
      file_name: resume.data.file_name || null,
      uploaded_at: resume.data.uploaded_at,
      view_url,
      download_url,
    };
  }

  // Official score per skill = the stored (highest) score, joined to skill names
  const nameById = new Map((skills.data || []).map((s) => [s.id, s.name]));
  const scored = (scores.data || []).map((x) => ({
    skill_id: x.skill_id,
    skill: nameById.get(x.skill_id) || "Unknown",
    highest_percentage: Number(x.score),
  }));
  const aptitude = scored.find((s) => /^aptitude$/i.test(s.skill));

  // jobs.required_skills holds skill names; match scores by name (case-insensitive)
  const requiredSkills = (app.job.required_skills || []).map((n) => ({ id: n.toLowerCase(), name: n }));
  const eligibility = evaluateEligibility({
    job: {
      ...app.job,
      min_aptitude_percentage: app.job.minimum_aptitude_percentage,
      min_cgpa: app.job.minimum_cgpa,
    },
    requiredSkills,
    scores: scored.map((s) => ({ skill_id: s.skill.toLowerCase(), highest_percentage: s.highest_percentage })),
    aptitudePercentage: aptitude ? aptitude.highest_percentage : null,
    student: app.student,
  });

  // Separate, tolerant read so a missing ai_breakdown column cannot break this page
  const bd = await client.from("applications").select("ai_breakdown").eq("id", app.id).maybeSingle();
  const aiBreakdown = bd.error ? null : bd.data?.ai_breakdown || null;

  const s = app.student || {};
  res.json({
    success: true,
    data: {
      id: app.id,
      status: app.status,
      applied_at: app.applied_at || app.created_at,
      job: {
        id: app.job.id,
        role: app.job.role,
        company: app.job.company?.name,
        required_skills: app.job.required_skills || [],
      },
      student: {
        name: s.name,
        email: profile.data?.email || null,
        phone: s.phone,
        department: s.department,
        branch: s.branch,
        graduation_year: s.graduation_year,
        cgpa: s.cgpa,
      },
      resume: resumeOut,
      ai_analysis: {
        ai_configured: Boolean(process.env.AI_SERVICE_URL),
        match_percentage: app.match_percentage,
        extracted_skills: app.extracted_skills || [],
        missing_skills: app.missing_skills || [],
        breakdown: aiBreakdown,
      },
      // Highest (official) score per attempted assessment only
      assessment_scores: scored
        .map(({ skill, highest_percentage }) => ({ skill, highest_percentage }))
        .sort((a, b) => a.skill.localeCompare(b.skill)),
      eligibility: {
        aptitude_requirement_met: eligibility.aptitudeMet,
        skill_requirement_met: eligibility.skillMet,
        overall_eligible: eligibility.eligible,
        reasons: eligibility.reasons,
      },
    },
  });
};

/* PATCH /api/officer/applications/:id/status   { "status": "Shortlisted" }
 * Changes only the application's status. Student data and scores stay
 * read-only for officers (no RLS write policy on those tables). */
const updateApplicationStatus = async (req, res) => {
  if (!requireId(req, res)) return;
  const { value, errors } = validateStatus(req.body);
  if (errors) return badRequest(res, errors);

  const client = db(req);
  const { data: owned } = await client
    .from("applications")
    .select("id, student_id, jobs!inner(created_by, role)")
    .eq("id", req.params.id)
    .eq("jobs.created_by", req.user.id)
    .maybeSingle();
  if (!owned) return res.status(404).json({ success: false, message: "Application not found." });

  const { data, error } = await client
    .from("applications")
    .update(value)
    .eq("id", req.params.id)
    .select("id, status")
    .maybeSingle();
  if (error) return fail(res, error);
  if (!data) return res.status(403).json({ success: false, message: "You cannot update this application." });

  // Tell the student (best effort: a failed notification never blocks the update)
  try {
    const { error: notifyError } = await storageClient().from("notifications").insert({
      student_id: owned.student_id,
      title: "Application status updated",
      message: `Your application for ${owned.jobs?.role || "a job"} is now: ${data.status}.`,
      type: "APPLICATION",
    });
    if (notifyError) console.error("[placement-officer] notification failed:", notifyError.message);
  } catch (e) {
    console.error("[placement-officer] notification failed:", e.message);
  }

  res.json({ success: true, data });
};

/* Student facts the AI service needs for the eligibility part of the score:
 * CGPA, branch, aptitude and each skill's official (stored) percentage. */
const buildAiContext = async (client, app) => {
  const [student, scores, skills] = await Promise.all([
    client.from("students").select("cgpa, branch").eq("id", app.student_id).maybeSingle(),
    client.from("student_skill_scores").select("skill_id, score").eq("student_id", app.student_id),
    client.from("skills").select("id, name"),
  ]);
  const nameById = new Map((skills.data || []).map((x) => [x.id, x.name]));
  const skill_scores = {};
  for (const row of scores.data || []) {
    const name = nameById.get(row.skill_id);
    if (name && row.score != null) skill_scores[name] = Number(row.score);
  }
  const aptKey = Object.keys(skill_scores).find((k) => /^aptitude$/i.test(k));
  const j = app.job || {};
  return {
    student: {
      cgpa: student.data?.cgpa != null ? Number(student.data.cgpa) : null,
      branch: student.data?.branch || null,
      aptitude: aptKey ? skill_scores[aptKey] : null,
      skill_scores,
    },
    job: {
      min_cgpa: j.minimum_cgpa,
      eligible_branches: j.eligible_branches || [],
      min_aptitude: j.minimum_aptitude_percentage,
      required_skill_percentage: j.required_skill_percentage,
    },
  };
};

/* POST /api/placement-officer/applications/:id/analyze
 * Sends the student's resume + the job to the AI service (FastAPI), stores
 * the match result on the application and returns it. The officer page
 * calls this in the background when no result exists yet.
 * Fails soft: if the AI service is off or slow, the rest of the page works. */
const analyzeApplication = async (req, res) => {
  if (!requireId(req, res)) return;
  const baseUrl = (process.env.AI_SERVICE_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    return res.status(503).json({ success: false, message: "AI service is not configured." });
  }

  const client = db(req);
  const { data: app, error } = await client
    .from("applications")
    .select("id, student_id, job:jobs!inner(description, required_skills, created_by, minimum_cgpa, eligible_branches, minimum_aptitude_percentage, required_skill_percentage)")
    .eq("id", req.params.id)
    .eq("job.created_by", req.user.id)
    .maybeSingle();
  if (error) return fail(res, error);
  if (!app) return res.status(404).json({ success: false, message: "Application not found." });

  const { data: resume, error: resumeErr } = await client
    .from("resumes")
    .select("file_path, file_url, file_name")
    .eq("student_id", app.student_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (resumeErr) return fail(res, resumeErr);
  const path = resume ? resumePath(resume) : null;
  if (!path) {
    return res.status(422).json({ success: false, message: "This student has not uploaded a resume." });
  }

  const service = storageClient();
  const { data: file, error: downloadErr } = await service.storage.from(RESUME_BUCKET).download(path);
  if (downloadErr || !file) {
    console.error("[placement-officer] resume download failed:", downloadErr?.message);
    return res.status(502).json({ success: false, message: "Could not read the resume file." });
  }

  const form = new FormData();
  form.append("file", file, resume.file_name || "resume.pdf");
  form.append("job_description", app.job.description || "");
  form.append("required_skills", JSON.stringify(app.job.required_skills || []));
  form.append("context", JSON.stringify(await buildAiContext(client, app)));

  let response;
  try {
    response = await fetch(baseUrl + "/analyze", {
      method: "POST",
      headers: process.env.AI_SERVICE_KEY ? { "X-API-Key": process.env.AI_SERVICE_KEY } : {},
      body: form,
      signal: AbortSignal.timeout(60000), // free hosting can take a while to wake up
    });
  } catch (e) {
    console.error("[placement-officer] AI service unreachable:", e.message);
    return res.status(502).json({ success: false, message: "The AI service is not reachable right now." });
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = response.status === 422 || response.status === 415 ? 422 : 502;
    return res.status(status).json({
      success: false,
      message: typeof body.detail === "string" ? body.detail : "The AI service could not analyse this resume.",
    });
  }

  const result = {
    match_percentage: body.match_percentage,
    extracted_skills: body.extracted_skills || [],
    missing_skills: body.missing_skills || [],
  };
  // ai_breakdown comes from sql/003; if that column is not there yet, still save the rest
  let { error: saveErr } = await service
    .from("applications")
    .update({ ...result, ai_breakdown: body.breakdown || null })
    .eq("id", app.id);
  if (saveErr) {
    ({ error: saveErr } = await service.from("applications").update(result).eq("id", app.id));
  }
  if (saveErr) console.error("[placement-officer] could not save AI result:", saveErr.message);

  res.json({
    success: true,
    data: {
      ...result,
      verified_skills: body.verified_skills || [],
      recommended_skills: body.recommended_skills || [],
      breakdown: body.breakdown || null,
    },
  });
};

module.exports = {
  getDashboard,
  getSkills,
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getApplications,
  getApplicationDetail,
  updateApplicationStatus,
  analyzeApplication,
};
