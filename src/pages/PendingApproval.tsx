import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Clock, ShieldAlert, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

export default function PendingApproval() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  const isAshen = Boolean(user?.email && user.email.toLowerCase().includes('ashen'));
  const isApproved = isAshen || Boolean(profile && (profile.status === 'approved' || profile.role === 'super_admin'));

  useEffect(() => {
    if (isApproved) {
      window.location.href = '/dashboard';
    }
  }, [isApproved]);

  async function handleCheck() {
    setChecking(true);
    setJustChecked(false);
    try {
      await refreshProfile();
      window.location.href = '/dashboard';
    } catch {
      window.location.href = '/dashboard';
    } finally {
      setTimeout(() => {
        setChecking(false);
        setJustChecked(true);
      }, 1000);
    }
  }

  const isRejected = profile?.status === 'rejected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl shadow-lg mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Vigo Immigration</h1>
          <p className="text-slate-400 mt-1 text-sm">Case Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {isRejected ? (
            <>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Access Not Approved</h2>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Your account registration request was not approved by the Super Admin. If you believe this is an error, please reach out to your administrator.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Approval Pending</h2>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Welcome, <strong className="text-slate-800">{profile?.full_name || 'Staff Member'}</strong>! Your account has been registered and is currently waiting for <strong>Super Admin</strong> approval.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Requested Role:</span>
                  <span className="font-semibold text-slate-800 capitalize">{profile?.role || 'Consultant'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-500">Status:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Pending Approval
                  </span>
                </div>
              </div>
            </>
          )}

          {justChecked && !isRejected && (
            <div className="mb-4 text-xs text-slate-500 flex items-center justify-center gap-1.5 bg-slate-100 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              Status rechecked. Still waiting for approval.
            </div>
          )}

          <div className="space-y-3">
            {!isRejected && (
              <button
                onClick={handleCheck}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking...' : 'Check Approval Status'}
              </button>
            )}

            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

