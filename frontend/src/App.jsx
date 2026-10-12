import { BrowserRouter, Routes, Route } from "react-router-dom";

// ==================== AUTH ====================
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// ==================== PROTECTED ROUTE ====================
import ProtectedRoute from "./components/ProtectedRoute";

// ==================== STUDENT ====================
import StudentLayout from "./pages/student/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import StudentOpportunities from "./pages/student/StudentOpportunities";
import StudentApplications from "./pages/student/StudentApplications";
import Assessments from "./pages/student/Assessments";
import AssessmentsAttempts from "./pages/student/AssessmentsAttempts";
import Results from "./pages/student/Results";
import SkillScores from "./pages/student/SkillScores";
import TakeAssessment from "./pages/student/TakeAssessment";
import ResumeUpload from "./pages/student/ResumeUpload";
import Notifications from "./pages/student/Notifications";
import JobEligibility from "./pages/student/JobEligibility";

// ==================== ADMIN ====================
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import SkillsAssessments from "./pages/admin/SkillsAssessments";
import Companies from "./pages/admin/Companies";
import BulkStudents from "./pages/admin/BulkStudents";

// ==================== PLACEMENT OFFICER ====================
import PlacementOfficerLayout from "./layouts/PlacementOfficerLayout";
import PlacementOfficerDashboard from "./pages/placement-officer/PlacementOfficerDashboard";
import CompaniesJobs from "./pages/placement-officer/CompaniesJobs";
import Applications from "./pages/placement-officer/Applications";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ==================== AUTH ==================== */}

        <Route path="/" element={<LoginPage />} />

        <Route
          path="/signup"
          element={<SignupPage />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />


        {/* ==================== STUDENT ==================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/student"
            element={<StudentDashboard />}
          />

          <Route
            path="/student/profile"
            element={<StudentProfile />}
          />

          <Route
            path="/student/opportunities"
            element={<StudentOpportunities />}
          />

          <Route
            path="/student/applications"
            element={<StudentApplications />}
          />

          <Route
            path="/student/assessments"
            element={<Assessments />}
          />

          <Route
            path="/student/assessments/:id"
            element={<TakeAssessment />}
          />

          <Route
            path="/student/resume"
            element={<ResumeUpload />}
          />

          <Route
            path="/student/notifications"
            element={<Notifications />}
          />

          <Route
            path="/student/eligibility"
            element={<JobEligibility />}
          />

          <Route
            path="/student/assessment-attempts"
            element={<AssessmentsAttempts />}
          />

          <Route
            path="/student/results"
            element={<Results />}
          />

          <Route
            path="/student/skill-scores"
            element={<SkillScores />}
          />
        </Route>


        {/* ==================== ADMIN ==================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<UserManagement />}
          />

          <Route
            path="/admin/bulk-students"
            element={<BulkStudents />}
          />

          <Route
            path="/admin/skills-assessments"
            element={<SkillsAssessments />}
          />

          <Route
            path="/admin/companies"
            element={<Companies />}
          />
        </Route>


        {/* ==================== PLACEMENT OFFICER ==================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["placement-officer"]}>
              <PlacementOfficerLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/placement-officer"
            element={<PlacementOfficerDashboard />}
          />

          <Route
            path="/placement-officer/companies-jobs"
            element={<CompaniesJobs />}
          />

          <Route
            path="/placement-officer/applications"
            element={<Applications />}
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;