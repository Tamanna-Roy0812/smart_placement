const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const supabase = require("./config/supabase");
const adminRoutes = require("./routes/adminRoutes");
const placementOfficerRoutes = require("./routes/placementOfficerRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Allow frontend to communicate with backend
// On Render the app sits behind a proxy (needed for correct client IPs / rate limiting)
app.set("trust proxy", 1);

// FRONTEND_URL (comma separated) locks CORS to your deployed site; empty = allow all (local dev)
app.use(
  cors(
    process.env.FRONTEND_URL
      ? { origin: process.env.FRONTEND_URL.split(",").map((u) => u.trim().replace(/\/$/, "")) }
      : undefined
  )
);

// Parse JSON request bodies
app.use(express.json());

// Basic API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // pages make several calls each; this still blocks abuse
});

app.use("/api", limiter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend server is running",
  });
});

// Admin routes
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

// Placement Officer routes
app.use("/api/placement-officer", placementOfficerRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});