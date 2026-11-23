import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Category, StaffProfile, UserRole } from '../../lib/types';
import {
  Plus, Trash2, Settings as SettingsIcon, Check, X,
  ShieldCheck, UserCheck, AlertCircle, Clock
} from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'staff'>('categories');
  const [savingCat, setSavingCat] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdminOrSuper = isSuperAdmin || profile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [cats, st] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('staff_profiles').select('*').order('created_at', { ascending: false }),
    ]);
    setCategories(cats.data ?? []);
    setStaff(st.data ?? []);
    setLoading(false);
  }

  function showFeedback(type: 'success' | 'error', text: string) {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    setSavingCat(true);
    const { data, error } = await supabase.from('categories').insert({ name: newCategory.trim() }).select().single();
    if (error) {
      showFeedback('error', error.message);
    } else if (data) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      showFeedback('success', 'Category added successfully');
      setNewCategory('');
    }
    setSavingCat(false);
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      showFeedback('error', error.message);
    } else {
      setCategories(prev => prev.filter(c => c.id !== id));
      showFeedback('success', 'Category removed');
    }
  }

  async function approveStaff(id: string, role: UserRole = 'consultant') {
    const { error } = await supabase
      .from('staff_profiles')
      .update({ status: 'approved', role })
      .eq('id', id);

    if (error) {
      showFeedback('error', error.message);
    } else {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, status: 'approved', role } : s));
      showFeedback('success', 'Participant approved successfully');
    }
  }

  async function rejectStaff(id: string) {
    const { error } = await supabase
      .from('staff_profiles')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      showFeedback('error', error.message);
    } else {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' } : s));
      showFeedback('success', 'Participant marked as rejected');
    }
  }

  async function updateStaffRole(id: string, role: UserRole) {
    const target = staff.find(s => s.id === id);
    if (target?.role === 'super_admin' && role !== 'super_admin') {
      const superCount = staff.filter(s => s.role === 'super_admin').length;
      if (superCount <= 1) {
        showFeedback('error', 'Cannot demote the only Super Admin.');
        return;
      }
    }

    const { error } = await supabase.from('staff_profiles').update({ role }).eq('id', id);
    if (error) {
      showFeedback('error', error.message);
    } else {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, role } : s));
      showFeedback('success', 'Role updated successfully');
    }
  }

  async function deleteStaff(id: string) {
    if (id === profile?.id) {
      showFeedback('error', 'You cannot delete your own account.');
      return;
    }
    const confirmDelete = window.confirm('Are you sure you want to remove this staff profile?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('staff_profiles').delete().eq('id', id);
    if (error) {
      showFeedback('error', error.message);
    } else {
      setStaff(prev => prev.filter(s => s.id !== id));
      showFeedback('success', 'Staff account deleted');
    }
  }

  const pendingStaff = staff.filter(s => s.status === 'pending');
  const activeStaff = staff.filter(s => s.status !== 'pending');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500 text-sm">Manage system categories and user approvals</p>
          </div>
        </div>

        {profile && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Your Role:</span>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
              </span>
            ) : isAdminOrSuper ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                <UserCheck className="w-3.5 h-3.5" /> Admin
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                Consultant
              </span>
            )}
          </div>
        )}
      </div>

      {actionMsg && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {actionMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          {actionMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Case Categories ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'staff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Staff & Approvals ({staff.length})
          {pendingStaff.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingStaff.length} pending
            </span>
          )}
        </button>
      </div>

      {/* Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Add Category</h2>
            <div className="flex gap-3">
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                placeholder="e.g. Asylum, Student Visa, Work Permit..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
              <button
                onClick={addCategory}
                disabled={!newCategory.trim() || savingCat}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Case Categories ({categories.length})</h2>
            </div>
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                    <button onClick={() => deleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff & Approvals */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* PENDING APPROVALS SECTION */}
          {pendingStaff.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-amber-100/60 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Pending Participant Approvals ({pendingStaff.length})</span>
                </div>
                <span className="text-xs text-amber-700 font-medium">Requires Super Admin approval</span>
              </div>

              <div className="divide-y divide-amber-200/60 bg-white">
                {pendingStaff.map(s => (
                  <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                        {s.full_name ? s.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{s.full_name}</p>
                        {s.email && <p className="text-xs text-slate-600 font-mono">{s.email}</p>}
                        <p className="text-xs text-slate-400">
                          Registered: {new Date(s.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <select
                        defaultValue={s.role || 'consultant'}
                        id={`role-select-${s.id}`}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="consultant">Consultant</option>
                        <option value="admin">Admin</option>
                        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      </select>

                      <button
                        onClick={() => {
                          const el = document.getElementById(`role-select-${s.id}`) as HTMLSelectElement;
                          const chosenRole = (el?.value || 'consultant') as UserRole;
                          approveStaff(s.id, chosenRole);
                        }}
                        disabled={!isAdminOrSuper}
                        title={isAdminOrSuper ? 'Approve participant' : 'Only Super Admins or Admins can approve'}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>

                      <button
                        onClick={() => rejectStaff(s.id)}
                        disabled={!isAdminOrSuper}
                        title={isAdminOrSuper ? 'Reject participant' : 'Only Super Admins or Admins can reject'}
                        className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE STAFF TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Staff Accounts ({activeStaff.length})</h2>
                <p className="text-xs text-slate-500 mt-0.5">Approved users who have access to the system</p>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading staff members...</div>
            ) : activeStaff.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No approved staff members yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="px-5 py-3 text-left font-medium">Name</th>
                    <th className="px-5 py-3 text-left font-medium">Email</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Role</th>
                    <th className="px-5 py-3 text-left font-medium">Joined</th>
                    {isSuperAdmin && <th className="px-5 py-3 text-right font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStaff.map(s => {
                    const isCurrentUser = s.id === profile?.id;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              s.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                              s.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {s.full_name ? s.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">{s.full_name}</span>
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-600 text-xs font-mono">
                          {s.email || '—'}
                        </td>

                        <td className="px-5 py-3.5">
                          {s.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
                            </span>
                          ) : s.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {isSuperAdmin ? (
                            <select
                              value={s.role || 'consultant'}
                              onChange={e => updateStaffRole(s.id, e.target.value as UserRole)}
                              disabled={isCurrentUser && staff.filter(x => x.role === 'super_admin').length <= 1}
                              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            >
                              <option value="consultant">Consultant</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md ${
                              s.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              s.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {s.role === 'super_admin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : 'Consultant'}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {new Date(s.created_at).toLocaleDateString('en-IE')}
                        </td>

                        {isSuperAdmin && (
                          <td className="px-5 py-3.5 text-right">
                            {!isCurrentUser && (
                              <button
                                onClick={() => deleteStaff(s.id)}
                                title="Remove staff account"
                                className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
