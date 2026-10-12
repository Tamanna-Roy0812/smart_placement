const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authenticate = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

/*
 * Privileged Supabase client.
 *
 * IMPORTANT:
 * This key is backend-only.
 * Never expose it in the frontend.
 */
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/*
 * Every admin endpoint requires:
 * 1. A valid Supabase session
 * 2. Admin authorization
 */
router.use(authenticate);
router.use(adminAuth);

/* =========================================================
   TEST ROUTE
========================================================= */

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Admin authorization is working.",
  });
});

/* =========================================================
   USER-SCOPED SUPABASE CLIENT
========================================================= */

function userSupabase(req) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: req.headers.authorization,
        },
      },
    }
  );
}

/* =========================================================
   ERROR HELPER
========================================================= */

function sendError(
  res,
  error,
  fallbackMessage = "Something went wrong."
) {
  console.error(error);

  return res.status(400).json({
    error: error?.message || fallbackMessage,
  });
}

/* =========================================================
   AUTH USER STATUS
========================================================= */

function getUserStatus(authUser) {
  if (!authUser) {
    return "Suspended";
  }

  const bannedUntil = authUser.banned_until;

  if (
    bannedUntil &&
    bannedUntil !== "none" &&
    new Date(bannedUntil).getTime() > Date.now()
  ) {
    return "Suspended";
  }

  return "Active";
}

/* =========================================================
   GET ALL AUTH USERS
========================================================= */

async function getAllAuthUsers() {
  const users = [];

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } =
      await adminSupabase.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw error;
    }

    const currentUsers = data?.users || [];

    users.push(...currentUsers);

    if (currentUsers.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

/* =========================================================
   GET ADMIN DASHBOARD STATS
========================================================= */

router.get("/dashboard", async (req, res) => {
  try {
    const [
      studentsResult,
      placementOfficersResult,
      companiesResult,
      skillsResult,
      assessmentsResult,
    ] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student"),

      adminSupabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "placement-officer"),

      adminSupabase
        .from("companies")
        .select("id", { count: "exact", head: true }),

      adminSupabase
        .from("skills")
        .select("id", { count: "exact", head: true }),

      adminSupabase
        .from("assessments")
        .select("id", { count: "exact", head: true }),
    ]);

    const results = [
      studentsResult,
      placementOfficersResult,
      companiesResult,
      skillsResult,
      assessmentsResult,
    ];

    const failedResult = results.find((result) => result.error);

    if (failedResult) {
      return sendError(res, failedResult.error);
    }

    return res.json({
      success: true,
      data: {
        students: studentsResult.count || 0,
        placement_officers: placementOfficersResult.count || 0,
        companies: companiesResult.count || 0,
        skills: skillsResult.count || 0,
        assessments: assessmentsResult.count || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      error: "Failed to load dashboard statistics.",
    });
  }
});

/* =========================================================
   GET USERS
========================================================= */

router.get("/users", async (req, res) => {
  try {
    const { data: profiles, error: profilesError } =
      await adminSupabase
        .from("profiles")
        .select("id, email, role, created_at")
        .in("role", ["student", "placement-officer"])
        .order("created_at", {
          ascending: false,
        });

    if (profilesError) {
      return sendError(res, profilesError);
    }

    const authUsers = await getAllAuthUsers();

    const authUserMap = new Map(
      authUsers.map((user) => [user.id, user])
    );

    const users = (profiles || []).map((profile) => {
      const authUser = authUserMap.get(profile.id);

      return {
        id: profile.id,
        email: profile.email || authUser?.email || "",
        role: profile.role,
        created_at:
          profile.created_at ||
          authUser?.created_at ||
          null,
        status: getUserStatus(authUser),
      };
    });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      error: "Failed to load users.",
    });
  }
});

/* =========================================================
   CREATE USER
========================================================= */

router.post("/users", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        error: "Email, password and role are required.",
      });
    }

    if (!["student", "placement-officer"].includes(role)) {
      return res.status(400).json({
        error:
          "Only Student and Placement Officer accounts can be created.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
    }

    /*
     * Step 1:
     * Create the Supabase Auth account.
     */
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({
        error: authError.message,
      });
    }

    const newUser = authData.user;

    /*
     * Step 2:
     *
     * Some Supabase projects automatically create a
     * profiles row through a database trigger.
     *
     * Therefore we use UPSERT instead of INSERT.
     */
    const { data: profile, error: profileError } =
      await adminSupabase
        .from("profiles")
        .upsert(
          {
            id: newUser.id,
            email,
            role,
          },
          {
            onConflict: "id",
          }
        )
        .select()
        .single();

    /*
     * If profile creation/update fails, roll back the
     * newly-created Auth account.
     */
    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(
        newUser.id
      );

      return res.status(400).json({
        error: profileError.message,
      });
    }

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: profile.role,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      error: "Failed to create user.",
    });
  }
});

/* =========================================================
   BULK CREATE STUDENTS
   POST /api/admin/users/bulk
   body: { rows: [{ email, name? }], password? }
   Creates one student account per row. If `password` is empty a random
   password is generated for each student. The response lists every
   email with its password so the admin can hand them out (students can
   also use "Forgot password" to set their own).
========================================================= */

const crypto = require("crypto");

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return `${out}@${(crypto.randomBytes(1)[0] % 90) + 10}`;
}

router.post("/users/bulk", async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const sharedPassword = String(req.body.password || "").trim();

    if (!rows.length) {
      return res.status(400).json({ error: "Add at least one email." });
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: "You can add up to 500 students at a time." });
    }
    if (sharedPassword && sharedPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seen = new Set();
    const results = [];

    for (const row of rows) {
      const email = String(row.email || "").trim().toLowerCase();
      const name = String(row.name || "").trim() || email.split("@")[0];

      if (!emailPattern.test(email)) {
        results.push({ email: row.email || "", status: "error", message: "Not a valid email." });
        continue;
      }
      if (seen.has(email)) {
        results.push({ email, status: "error", message: "Listed twice." });
        continue;
      }
      seen.add(email);

      const password = sharedPassword || randomPassword();

      const { data: authData, error: authError } =
        await adminSupabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) {
        const exists = /already|registered|exists/i.test(authError.message || "");
        results.push({
          email,
          status: "error",
          message: exists ? "An account with this email already exists." : authError.message,
        });
        continue;
      }

      const userId = authData.user.id;

      const { error: profileError } = await adminSupabase
        .from("profiles")
        .upsert({ id: userId, email, role: "student" }, { onConflict: "id" });

      if (profileError) {
        await adminSupabase.auth.admin.deleteUser(userId);
        results.push({ email, status: "error", message: profileError.message });
        continue;
      }

      // Make sure the student has a students row (a trigger may already have made one)
      const { data: existing } = await adminSupabase
        .from("students")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (!existing) {
        const { error: studentError } = await adminSupabase
          .from("students")
          .insert({ id: userId, name });
        if (studentError) console.error("Bulk create: students row failed:", studentError.message);
      } else if (row.name) {
        await adminSupabase.from("students").update({ name }).eq("id", userId);
      }

      results.push({ email, name, password, status: "created" });
    }

    res.status(201).json({
      success: true,
      created: results.filter((r) => r.status === "created").length,
      failed: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error) {
    console.error("Bulk create error:", error);
    res.status(500).json({ error: "Failed to create students." });
  }
});

/* =========================================================
   BULK ADD QUESTIONS
   POST /api/admin/questions/bulk
   body: { rows: [{ skill, question, question_type, option_a..option_d,
                    correct_answer, difficulty, marks, negative_marks }],
           create_assessments?: { duration_minutes, passing_percentage } }
   Skills are matched by name (created if they do not exist yet). With
   create_assessments, one assessment per skill is created (or skipped if
   it already exists).
========================================================= */

router.post("/questions/bulk", async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const auto = req.body.create_assessments || null;

    if (!rows.length) {
      return res.status(400).json({ error: "Add at least one question." });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ error: "You can add up to 1000 questions at a time." });
    }

    const { data: skillRows, error: skillError } = await adminSupabase
      .from("skills")
      .select("id, name");
    if (skillError) throw skillError;
    const skillByName = new Map((skillRows || []).map((s) => [s.name.trim().toLowerCase(), s]));

    const TYPES = ["mcq", "true_false", "fill_in_blank", "programming"];
    const DIFFICULTIES = ["easy", "medium", "hard"];
    const results = [];
    const toInsert = [];
    const perSkill = new Map();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = i + 1;
      const fail = (message) => results.push({ line, status: "error", message });

      const skillName = String(r.skill || "").trim();
      const text = String(r.question || "").trim();
      const type = String(r.question_type || "mcq").trim().toLowerCase();
      const difficulty = String(r.difficulty || "medium").trim().toLowerCase();
      let correct = String(r.correct_answer || "").trim();

      if (!skillName) { fail("skill is required."); continue; }
      if (!text) { fail("question is required."); continue; }
      if (!TYPES.includes(type)) { fail(`type must be one of ${TYPES.join(", ")}.`); continue; }
      if (!DIFFICULTIES.includes(difficulty)) { fail("difficulty must be easy, medium or hard."); continue; }

      let options = null;
      if (type === "mcq") {
        options = {
          A: String(r.option_a || "").trim(),
          B: String(r.option_b || "").trim(),
          C: String(r.option_c || "").trim(),
          D: String(r.option_d || "").trim(),
        };
        if (!options.A || !options.B) { fail("an MCQ needs at least options A and B."); continue; }
        correct = correct.toUpperCase();
        if (!["A", "B", "C", "D"].includes(correct) || !options[correct]) {
          fail("correct_answer must be A, B, C or D and point to a filled option.");
          continue;
        }
      } else if (type === "true_false") {
        const v = correct.toLowerCase();
        if (v !== "true" && v !== "false") { fail("correct_answer must be True or False."); continue; }
        correct = v === "true" ? "True" : "False";
      } else if (!correct) {
        fail("correct_answer is required.");
        continue;
      }

      const marks = r.marks === undefined || r.marks === "" ? 1 : Number(r.marks);
      const negative = r.negative_marks === undefined || r.negative_marks === "" ? 0 : Number(r.negative_marks);
      if (Number.isNaN(marks) || marks < 0 || Number.isNaN(negative) || negative < 0) {
        fail("marks and negative_marks must be numbers of 0 or more.");
        continue;
      }

      // find or create the skill
      const key = skillName.toLowerCase();
      let skill = skillByName.get(key);
      if (!skill) {
        const { data: created, error: createError } = await adminSupabase
          .from("skills")
          .insert({ name: skillName, is_active: true })
          .select("id, name")
          .single();
        if (createError) { fail(`could not create skill "${skillName}": ${createError.message}`); continue; }
        skill = created;
        skillByName.set(key, skill);
      }

      toInsert.push({
        line,
        row: {
          question: text,
          question_type: type,
          options,
          correct_answer: correct,
          difficulty,
          marks,
          negative_marks: negative,
          skill_id: skill.id,
          is_active: true,
        },
      });
      perSkill.set(skill.id, { skill, count: (perSkill.get(skill.id)?.count || 0) + 1 });
    }

    let created = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error } = await adminSupabase.from("questions").insert(batch.map((b) => b.row));
      if (error) {
        batch.forEach((b) => results.push({ line: b.line, status: "error", message: error.message }));
        const failedSkills = new Set(batch.map((b) => b.row.skill_id));
        failedSkills.forEach((id) => {
          const entry = perSkill.get(id);
          if (entry) entry.count -= batch.filter((b) => b.row.skill_id === id).length;
        });
      } else {
        created += batch.length;
      }
    }

    const assessments = [];
    if (auto) {
      const duration = Number(auto.duration_minutes) || 10;
      const passing = Number(auto.passing_percentage) || 50;
      for (const { skill, count } of perSkill.values()) {
        if (count <= 0) continue;
        const title = `${skill.name} Test`;
        const { data: existing } = await adminSupabase
          .from("assessments")
          .select("id")
          .eq("title", title)
          .eq("skill_id", skill.id)
          .maybeSingle();
        if (existing) {
          assessments.push({ title, status: "skipped", message: "An assessment with this title already exists." });
          continue;
        }
        const { error } = await adminSupabase.from("assessments").insert({
          title,
          description: `Assessment for ${skill.name}`,
          skill_id: skill.id,
          duration_minutes: duration,
          number_of_questions: count,
          passing_percentage: passing,
          negative_marking: false,
          random_question_selection: false,
          is_active: true,
        });
        assessments.push(error ? { title, status: "error", message: error.message } : { title, status: "created" });
      }
    }

    res.status(201).json({
      success: true,
      created,
      failed: results.length,
      errors: results.sort((a, b) => a.line - b.line),
      assessments,
    });
  } catch (error) {
    console.error("Bulk questions error:", error);
    res.status(500).json({ error: "Failed to add questions." });
  }
});

/* =========================================================
   UPDATE USER
========================================================= */

router.put("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        error: "Email and role are required.",
      });
    }

    if (!["student", "placement-officer"].includes(role)) {
      return res.status(400).json({
        error:
          "Role must be Student or Placement Officer.",
      });
    }

    /*
     * Prevent Admin from modifying their own account
     * through User Management.
     */
    if (userId === req.user.id) {
      return res.status(403).json({
        error:
          "You cannot modify your own administrator account here.",
      });
    }

    /*
     * Update Auth email.
     */
    const { error: authError } =
      await adminSupabase.auth.admin.updateUserById(
        userId,
        {
          email,
          email_confirm: true,
        }
      );

    if (authError) {
      return sendError(res, authError);
    }

    /*
     * Update profile.
     */
    const { data: profile, error: profileError } =
      await adminSupabase
        .from("profiles")
        .update({
          email,
          role,
        })
        .eq("id", userId)
        .select()
        .single();

    if (profileError) {
      return sendError(res, profileError);
    }

    res.json({
      success: true,
      user: profile,
    });
  } catch (error) {
    console.error("Update user error:", error);

    res.status(500).json({
      error: "Failed to update user.",
    });
  }
});

/* =========================================================
   SUSPEND USER
========================================================= */

router.post("/users/:id/suspend", async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id) {
      return res.status(403).json({
        error:
          "You cannot suspend your own administrator account.",
      });
    }

    const { error } =
      await adminSupabase.auth.admin.updateUserById(
        userId,
        {
          ban_duration: "876000h",
        }
      );

    if (error) {
      return sendError(res, error);
    }

    res.json({
      success: true,
      message: "User suspended successfully.",
    });
  } catch (error) {
    console.error("Suspend user error:", error);

    res.status(500).json({
      error: "Failed to suspend user.",
    });
  }
});

/* =========================================================
   ACTIVATE USER
========================================================= */

router.post("/users/:id/activate", async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id) {
      return res.status(403).json({
        error:
          "You cannot modify your own administrator account.",
      });
    }

    const { error } =
      await adminSupabase.auth.admin.updateUserById(
        userId,
        {
          ban_duration: "none",
        }
      );

    if (error) {
      return sendError(res, error);
    }

    res.json({
      success: true,
      message: "User activated successfully.",
    });
  } catch (error) {
    console.error("Activate user error:", error);

    res.status(500).json({
      error: "Failed to activate user.",
    });
  }
});

/* =========================================================
   RESET PASSWORD
========================================================= */

router.post(
  "/users/:id/reset-password",
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { password } = req.body;

      if (userId === req.user.id) {
        return res.status(403).json({
          error:
            "You cannot reset your own administrator password here.",
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters.",
        });
      }

      const { error } =
        await adminSupabase.auth.admin.updateUserById(
          userId,
          {
            password,
          }
        );

      if (error) {
        return sendError(res, error);
      }

      res.json({
        success: true,
        message: "Password reset successfully.",
      });
    } catch (error) {
      console.error("Reset password error:", error);

      res.status(500).json({
        error: "Failed to reset password.",
      });
    }
  }
);

/* =========================================================
   DELETE USER
========================================================= */

router.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id) {
      return res.status(403).json({
        error:
          "You cannot delete your own administrator account.",
      });
    }

    /*
     * Try to delete the Auth account.
     *
     * The Auth account may already be missing if the
     * profile is an orphaned profile.
     */
    const { error: authError } =
      await adminSupabase.auth.admin.deleteUser(userId);

    /*
     * If the Auth account does not exist, continue.
     * We still need to delete the profile.
     */
    if (
      authError &&
      authError.code !== "user_not_found" &&
      authError.status !== 404
    ) {
      return sendError(res, authError);
    }

    /*
     * Delete the profile.
     *
     * This also cleans up orphaned profiles.
     */
    const { error: profileError } =
      await adminSupabase
        .from("profiles")
        .delete()
        .eq("id", userId);

    if (profileError) {
      return sendError(res, profileError);
    }

    res.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      error: "Failed to delete user.",
    });
  }
});

/* =========================================================
   ADMIN RESOURCE CONFIGURATION
========================================================= */

const resources = {
  companies: {
    table: "companies",
    required: ["name"],
    allowedFields: [
      "name",
      "description",
      "industry",
      "website",
      "location",
      "logo_url",
      "is_verified",
    ],
  },

  skills: {
    table: "skills",
    required: ["name"],
    allowedFields: [
      "name",
      "description",
      "is_active",
    ],
  },

  questions: {
    table: "questions",
    required: [
      "question",
      "question_type",
      "skill_id",
    ],
    allowedFields: [
      "question",
      "question_type",
      "options",
      "correct_answer",
      "difficulty",
      "marks",
      "negative_marks",
      "skill_id",
      "is_active",
    ],
  },

  assessments: {
    table: "assessments",
    required: ["title", "skill_id"],
    allowedFields: [
      "title",
      "description",
      "skill_id",
      "duration_minutes",
      "number_of_questions",
      "passing_percentage",
      "negative_marking",
      "random_question_selection",
      "is_active",
    ],
  },
};

/* =========================================================
   GET RESOURCE
========================================================= */

router.get("/:resource", async (req, res, next) => {
  const resourceName = req.params.resource;

  /*
   * /users is handled by the dedicated route above.
   */
  if (resourceName === "users") {
    return next();
  }

  const config = resources[resourceName];

  if (!config) {
    return res.status(404).json({
      error: "Admin resource not found.",
    });
  }

  try {
    const client = userSupabase(req);

    const { data, error } = await client
      .from(config.table)
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return sendError(res, error);
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    return sendError(res, error);
  }
});

/* =========================================================
   CREATE RESOURCE
========================================================= */

router.post("/:resource", async (req, res, next) => {
  const resourceName = req.params.resource;

  if (resourceName === "users") {
    return next();
  }

  const config = resources[resourceName];

  if (!config) {
    return res.status(404).json({
      error: "Admin resource not found.",
    });
  }

  try {
    const client = userSupabase(req);

    const payload = {};

    for (const field of config.allowedFields) {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    }

    for (const field of config.required) {
      if (
        payload[field] === undefined ||
        payload[field] === null ||
        payload[field] === ""
      ) {
        return res.status(400).json({
          error: `${field} is required.`,
        });
      }
    }

    /*
     * Store the authenticated Admin as creator
     * for companies.
     */
    if (resourceName === "companies") {
      payload.created_by = req.user.id;
    }

    const { data, error } = await client
      .from(config.table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return sendError(res, error);
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

/* =========================================================
   UPDATE RESOURCE
========================================================= */

router.put("/:resource/:id", async (req, res, next) => {
  const resourceName = req.params.resource;

  if (resourceName === "users") {
    return next();
  }

  const config = resources[resourceName];

  if (!config) {
    return res.status(404).json({
      error: "Admin resource not found.",
    });
  }

  try {
    const client = userSupabase(req);

    const payload = {};

    for (const field of config.allowedFields) {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    }

    const { data, error } = await client
      .from(config.table)
      .update(payload)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      return sendError(res, error);
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

/* =========================================================
   DELETE RESOURCE
========================================================= */

router.delete(
  "/:resource/:id",
  async (req, res, next) => {
    const resourceName = req.params.resource;

    if (resourceName === "users") {
      return next();
    }

    const config = resources[resourceName];

    if (!config) {
      return res.status(404).json({
        error: "Admin resource not found.",
      });
    }

    try {
      const client = userSupabase(req);

      const { error } = await client
        .from(config.table)
        .delete()
        .eq("id", req.params.id);

      if (error) {
        return sendError(res, error);
      }

      res.json({
        success: true,
        message: `${resourceName} deleted successfully.`,
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;