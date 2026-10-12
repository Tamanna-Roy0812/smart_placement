import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function StudentLayout() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
      isActive
        ? "bg-white text-slate-900"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userRole");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar */}
      <aside className="w-full bg-slate-900 p-6 md:w-64 md:min-h-screen">
        <h1 className="text-lg font-bold text-white">
          Smart Placement
        </h1>

        <p className="mb-8 text-sm text-slate-400">
          Student Portal
        </p>

        <nav className="space-y-1">

          {/* Existing pages */}
          <NavLink to="/student" end className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/student/profile" className={linkClass}>
            My Profile
          </NavLink>

          <NavLink to="/student/opportunities" className={linkClass}>
            Opportunities
          </NavLink>

          <NavLink to="/student/applications" className={linkClass}>
            Applications
          </NavLink>

          <NavLink to="/student/eligibility" className={linkClass}>
            Job Eligibility
          </NavLink>

          <NavLink to="/student/resume" className={linkClass}>
            Resume
          </NavLink>

          <NavLink to="/student/notifications" className={linkClass}>
            Notifications
          </NavLink>

          {/* New features */}
          <NavLink to="/student/assessments" className={linkClass}>
            Assessments
          </NavLink>

          <NavLink
            to="/student/assessment-attempts"
            className={linkClass}
          >
            Assessment Attempts
          </NavLink>

          <NavLink to="/student/results" className={linkClass}>
            Results
          </NavLink>

          <NavLink to="/student/skill-scores" className={linkClass}>
            Skill Scores
          </NavLink>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
          >
            Logout
          </button>

        </nav>
      </aside>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default StudentLayout;