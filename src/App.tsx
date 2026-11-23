import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientList from './pages/clients/ClientList';
import ClientNew from './pages/clients/ClientNew';
import ClientProfile from './pages/clients/ClientProfile';
import ClientPrint from './pages/clients/ClientPrint';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceNew from './pages/invoices/InvoiceNew';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import EmailCompose from './pages/email/EmailCompose';
import BackupPage from './pages/backup/BackupPage';
import SettingsPage from './pages/settings/SettingsPage';
import PendingApproval from './pages/PendingApproval';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <span className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading application...</p>
      </div>
    </div>
  );

  if (!session) return <Navigate to="/login" replace />;

  // Super Admin / Ashen is guaranteed immediate access; other participants require approval
  const isAshen = Boolean(user?.email && user.email.toLowerCase().includes('ashen'));
  const isApproved = Boolean(
    isAshen || (profile && (profile.status === 'approved' || profile.role === 'super_admin'))
  );

  if (!isApproved) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <span className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading application...</p>
      </div>
    </div>
  );

  return (
    <Routes>
      {/* Root redirect: immediately routes unauthenticated users to /login */}
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Print view — no sidebar */}
      <Route path="/clients/:id/print" element={
        <ProtectedRoute><ClientPrint /></ProtectedRoute>
      } />

      {/* Main app with layout */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/new" element={<ClientNew />} />
              <Route path="/clients/:id" element={<ClientProfile />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceNew />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/email" element={<EmailCompose />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
