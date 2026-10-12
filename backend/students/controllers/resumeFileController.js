const supabase = require("../../config/serviceSupabase");
const resumeRepository = require("../repositories/resumeRepository");

const BUCKET = "resumes";
const MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 10;

const isPdf = (buf) => buf.length > 5 && buf.slice(0, 5).toString("latin1") === "%PDF-";

const safeName = (name) =>
  String(name || "resume.pdf")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "resume.pdf";

/* POST /api/student/resume/upload
 * Body: the raw file bytes (Content-Type application/pdf or text/plain).
 * Header X-File-Name carries the original name.
 * The file goes into the private `resumes` bucket under the student's own
 * folder; the database row keeps the path (officers get short-lived links). */
const uploadResume = async (req, res) => {
  try {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      return res.status(400).json({ success: false, message: "No file received." });
    }
    if (buf.length > MAX_BYTES) {
      return res.status(413).json({ success: false, message: "Resume must be 5 MB or smaller." });
    }

    const rawName = decodeURIComponent(req.headers["x-file-name"] || "resume.pdf");
    const isText = /\.txt$/i.test(rawName);
    if (!isPdf(buf) && !isText) {
      return res.status(415).json({
        success: false,
        message: "Please upload a PDF resume (text-based, not a scan).",
      });
    }

    const fileName = safeName(rawName);
    const path = `${req.user.id}/${Date.now()}-${fileName}`;

    const previous = await resumeRepository.getStudentResume(req.user.id);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: isPdf(buf) ? "application/pdf" : "text/plain",
        upsert: false,
      });
    if (uploadError) {
      console.error("Resume upload error:", uploadError.message);
      return res.status(502).json({ success: false, message: "Could not store the resume file." });
    }

    const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("resumes")
      .upsert(
        {
          student_id: req.user.id,
          file_url: fileUrl,
          file_path: path,
          file_name: fileName,
          uploaded_at: now,
          updated_at: now,
        },
        { onConflict: "student_id" }
      )
      .select("*")
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }

    // Remove the older file so storage does not fill with old versions
    const oldPath = previous?.file_path;
    if (oldPath && oldPath !== path) {
      await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }

    return res.status(201).json({ success: true, message: "Resume uploaded.", data });
  } catch (error) {
    console.error("Upload resume error:", error);
    return res.status(500).json({ success: false, message: "Unable to upload resume." });
  }
};

/* GET /api/student/resume/link  -> short-lived view/download URLs */
const getResumeLink = async (req, res) => {
  try {
    const resume = await resumeRepository.getStudentResume(req.user.id);
    if (!resume || !resume.file_path) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }
    const storage = supabase.storage.from(BUCKET);
    const [view, download] = await Promise.all([
      storage.createSignedUrl(resume.file_path, SIGNED_URL_SECONDS),
      storage.createSignedUrl(resume.file_path, SIGNED_URL_SECONDS, { download: true }),
    ]);
    return res.json({
      success: true,
      data: {
        file_name: resume.file_name,
        uploaded_at: resume.uploaded_at,
        view_url: view.data?.signedUrl || null,
        download_url: download.data?.signedUrl || null,
      },
    });
  } catch (error) {
    console.error("Resume link error:", error);
    return res.status(500).json({ success: false, message: "Unable to open resume." });
  }
};

module.exports = { uploadResume, getResumeLink };
