import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Category, StaffProfile } from '../../lib/types';
import { Save, Plus, Trash2, UserPlus, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'staff'>('categories');
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('staff_profiles').select('*').order('full_name'),
    ]).then(([cats, st]) => {
      setCategories(cats.data ?? []);
      setStaff(st.data ?? []);
      setLoading(false);
    });
  }, []);

  async function addCategory() {
    if (!newCategory.trim()) return;
    setSavingCat(true);
    const { data } = await supabase.from('categories').insert({ name: newCategory.trim() }).select().single();
    if (data) setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategory('');
    setSavingCat(false);
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  async function updateStaffRole(id: string, role: 'admin' | 'consultant') {
    await supabase.from('staff_profiles').update({ role }).eq('id', id);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, role } : s));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-slate-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm">Manage categories and staff accounts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-6">
        {(['categories', 'staff'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
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
                placeholder="e.g. Asylum, Student Visa..."
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

      {/* Staff */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Staff Accounts ({staff.length})</h2>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : staff.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No staff accounts found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left font-medium text-slate-600">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-600">Role</th>
                  <th className="px-5 py-3 text-left font-medium text-slate-600">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {s.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{s.full_name}</span>
                        {s.id === profile?.id && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">You</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={s.role}
                        onChange={e => updateStaffRole(s.id, e.target.value as any)}
                        className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="consultant">Consultant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{new Date(s.created_at).toLocaleDateString('en-IE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
