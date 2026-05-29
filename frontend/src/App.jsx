import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './components/ConfirmDialog';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

/* ── Global error boundary — shows a friendly message instead of blank page ── */
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error('[AppErrorBoundary]', err, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 32,
          background: '#f1f5f9', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 32,
            maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: 8, fontSize: 18, fontWeight: 700 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                background: '#2563eb', color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 20px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
              }}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// Admin + Super Admin pages
import AdminDashboard    from './pages/admin/AdminDashboard';
import StaffDetails      from './pages/admin/StaffDetails';
import AdminReports      from './pages/admin/AdminReports';
import AdminFeedback     from './pages/admin/AdminFeedback';
import AdminAttendance   from './pages/admin/AdminAttendance';
import AdminTodos        from './pages/admin/AdminTodos';
import AdminTutorials    from './pages/admin/AdminTutorials';
import AdminProjects     from './pages/admin/AdminProjects';
import AdminAchievements from './pages/admin/AdminAchievements';
import AdminLeaves       from './pages/admin/AdminLeaves';
import AdminOffers       from './pages/admin/AdminOffers';
import AdminBanners      from './pages/admin/AdminBanners';
import AdminSettings     from './pages/admin/AdminSettings';

// Staff pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffReports from './pages/staff/StaffReports';
import StaffAchievements from './pages/staff/StaffAchievements';
import StaffFeedback from './pages/staff/StaffFeedback';
import StaffTodos from './pages/staff/StaffTodos';
import StaffTutorials from './pages/staff/StaffTutorials';
import StaffAttendance from './pages/staff/StaffAttendance';
import StaffLeaves from './pages/staff/StaffLeaves';
import StaffProjects from './pages/staff/StaffProjects';
import StaffOffers    from './pages/staff/StaffOffers';
import MadhavamLayout from './pages/MadhavamLayout';
import StaffSettings  from './pages/staff/StaffSettings';

function SuperAdminLayout({ children }) {
  return (
    <ProtectedRoute role="super_admin">
      <Layout role="super_admin">{children}</Layout>
    </ProtectedRoute>
  );
}

function AdminLayout({ children }) {
  return (
    <ProtectedRoute role="admin">
      <Layout role="admin">{children}</Layout>
    </ProtectedRoute>
  );
}

function StaffLayout({ children }) {
  return (
    <ProtectedRoute role="staff">
      <Layout role="staff">{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
    <ThemeProvider>
      <ConfirmProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Super Admin routes */}
            <Route path="/superadmin"            element={<SuperAdminLayout><AdminDashboard /></SuperAdminLayout>} />
            <Route path="/superadmin/staff"      element={<SuperAdminLayout><StaffDetails /></SuperAdminLayout>} />
            <Route path="/superadmin/attendance" element={<SuperAdminLayout><AdminAttendance /></SuperAdminLayout>} />
            <Route path="/superadmin/leaves"     element={<SuperAdminLayout><AdminLeaves /></SuperAdminLayout>} />
            <Route path="/superadmin/projects"   element={<SuperAdminLayout><AdminProjects /></SuperAdminLayout>} />
            <Route path="/superadmin/tutorials"  element={<SuperAdminLayout><AdminTutorials /></SuperAdminLayout>} />
            <Route path="/superadmin/layout/madhavamnagar" element={<SuperAdminLayout><MadhavamLayout /></SuperAdminLayout>} />
            <Route path="/superadmin/reports"    element={<SuperAdminLayout><AdminReports /></SuperAdminLayout>} />
            <Route path="/superadmin/settings"   element={<SuperAdminLayout><AdminSettings /></SuperAdminLayout>} />

            {/* Admin routes */}
            <Route path="/admin" element={<Navigate to="/admin/staff" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/admin/staff" replace />} />
            <Route path="/admin/staff" element={<AdminLayout><StaffDetails /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><AdminReports /></AdminLayout>} />
            <Route path="/admin/feedback" element={<AdminLayout><AdminFeedback /></AdminLayout>} />
            <Route path="/admin/attendance" element={<AdminLayout><AdminAttendance /></AdminLayout>} />
            <Route path="/admin/todos" element={<AdminLayout><AdminTodos /></AdminLayout>} />
            <Route path="/admin/tutorials" element={<AdminLayout><AdminTutorials /></AdminLayout>} />
            <Route path="/admin/projects" element={<AdminLayout><AdminProjects /></AdminLayout>} />
            <Route path="/admin/layout/madhavamnagar" element={<AdminLayout><MadhavamLayout /></AdminLayout>} />
            <Route path="/admin/achievements" element={<AdminLayout><AdminAchievements /></AdminLayout>} />
            <Route path="/admin/offers" element={<AdminLayout><AdminOffers /></AdminLayout>} />
            <Route path="/admin/banners"   element={<AdminLayout><AdminBanners /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />

            {/* Staff routes */}
            <Route path="/staff" element={<StaffLayout><StaffDashboard /></StaffLayout>} />
            <Route path="/staff/reports" element={<StaffLayout><StaffReports /></StaffLayout>} />
            <Route path="/staff/achievements" element={<StaffLayout><StaffAchievements /></StaffLayout>} />
            <Route path="/staff/feedback" element={<StaffLayout><StaffFeedback /></StaffLayout>} />
            <Route path="/staff/todos" element={<StaffLayout><StaffTodos /></StaffLayout>} />
            <Route path="/staff/tutorials" element={<StaffLayout><StaffTutorials /></StaffLayout>} />
            <Route path="/staff/attendance" element={<StaffLayout><StaffAttendance /></StaffLayout>} />
            <Route path="/staff/leaves" element={<StaffLayout><StaffLeaves /></StaffLayout>} />
            <Route path="/staff/projects" element={<StaffLayout><StaffProjects /></StaffLayout>} />
            <Route path="/staff/layout/madhavamnagar" element={<StaffLayout><MadhavamLayout /></StaffLayout>} />
            <Route path="/staff/offers"    element={<StaffLayout><StaffOffers /></StaffLayout>} />
            <Route path="/staff/settings"  element={<StaffLayout><StaffSettings /></StaffLayout>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </ConfirmProvider>
    </ThemeProvider>
    </AppErrorBoundary>
  );
}
