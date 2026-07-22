import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Client, PersonalDetails, PassportDetails, CompanyDetails, WorkDetails, Remark, Document, Category, StaffProfile } from '../../lib/types';
import { STATUS_COLORS, CLIENT_STATUSES, formatDate, calculateAge } from '../../lib/utils';
import {
  ChevronLeft, Edit2, Save, X, Printer, Plus, Trash2,
  User, FileText, Building, Briefcase, MessageSquare, Upload, File
} from 'lucide-react';

type Tab = 'personal' | 'passport' | 'company' | 'work' | 'remarks' | 'documents';

function parseWorkDetails(workData: any): any {
  if (!workData) return null;
  try {
    const parsed = JSON.parse(workData.port_of_entry || '{}');
    if (parsed && typeof parsed === 'object' && 'experiences' in parsed) {
      return {
        ...workData,
        experiences: parsed.experiences || [],
        port_of_entry: parsed.port_of_entry || '',
      };
    }
  } catch (e) {
    // fallback if it's not JSON
  }
  return workData;
}

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('personal');
  const [client, setClient] = useState<Client | null>(null);
  const [pd, setPd] = useState<PersonalDetails | null>(null);
  const [passport, setPassport] = useState<PassportDetails | null>(null);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [work, setWork] = useState<WorkDetails | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // editable copies
  const [editPd, setEditPd] = useState<Partial<PersonalDetails>>({});
  const [editPassport, setEditPassport] = useState<Partial<PassportDetails>>({});
  const [editCompany, setEditCompany] = useState<Partial<CompanyDetails>>({});
  const [editWork, setEditWork] = useState<Partial<WorkDetails>>({});
  const [editClient, setEditClient] = useState<Partial<Client>>({});

  // Work experience helper states for edit mode
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpPosition, setNewExpPosition] = useState('');
  const [newExpDuration, setNewExpDuration] = useState('');

  function addEditExperience() {
    if (!newExpCompany.trim() || !newExpPosition.trim() || !newExpDuration.trim()) return;
    const newExp = {
      id: Math.random().toString(36).substring(2, 9),
      company: newExpCompany.trim(),
      position: newExpPosition.trim(),
      duration: newExpDuration.trim()
    };
    setEditWork(prev => ({
      ...prev,
      experiences: [...(prev.experiences || []), newExp]
    }));
    setNewExpCompany('');
    setNewExpPosition('');
    setNewExpDuration('');
  }

  function removeEditExperience(id: string) {
    setEditWork(prev => ({
      ...prev,
      experiences: (prev.experiences || []).filter(e => e.id !== id)
    }));
  }

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [c, p, pass, comp, wrk, rem, docs, cats, st] = await Promise.all([
        supabase.from('clients').select('*, categories!clients_category_id_fkey(name), staff_profiles!clients_assigned_to_staff_fkey(full_name)').eq('id', id!).maybeSingle(),
        supabase.from('personal_details').select('*').eq('client_id', id!).maybeSingle(),
        supabase.from('passport_details').select('*').eq('client_id', id!).maybeSingle(),
        supabase.from('company_details').select('*').eq('client_id', id!).maybeSingle(),
        supabase.from('work_details').select('*').eq('client_id', id!).maybeSingle(),
        supabase.from('remarks').select('*').eq('client_id', id!).order('created_at', { ascending: false }),
        supabase.from('documents').select('*').eq('client_id', id!).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('staff_profiles').select('*').order('full_name'),
      ]);
      setClient(c.data);
      setPd(p.data);
      setPassport(pass.data);
      setCompany(comp.data);
      setWork(parseWorkDetails(wrk.data));
      setRemarks(rem.data ?? []);
      setDocuments(docs.data ?? []);
      setCategories(cats.data ?? []);
      setStaff(st.data ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  function startEdit() {
    setEditPd({ ...pd });
    setEditPassport({ ...passport });
    setEditCompany({ ...company });
    setEditWork({ ...work });
    setEditClient({ status: client?.status, category_id: client?.category_id, assigned_to: client?.assigned_to, case_date: client?.case_date, cv_needed: client?.cv_needed });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!id || !client) return;
    setSaving(true);

    const { id: _id, client_id: _cid, created_at: _cat, updated_at: _uat, experiences, port_of_entry, ...otherWorkFields } = editWork;
    const serializedPortOfEntry = JSON.stringify({
      port_of_entry: port_of_entry || '',
      experiences: experiences || []
    });
    const workPayload = {
      ...otherWorkFields,
      port_of_entry: serializedPortOfEntry
    };

    const results = await Promise.all([
      supabase.from('clients').update({ ...editClient, updated_at: new Date().toISOString() }).eq('id', id),
      pd ? supabase.from('personal_details').update({ ...editPd, updated_at: new Date().toISOString() }).eq('client_id', id)
         : supabase.from('personal_details').insert({ client_id: id, ...editPd }),
      passport ? supabase.from('passport_details').update({ ...editPassport, updated_at: new Date().toISOString() }).eq('client_id', id)
               : supabase.from('passport_details').insert({ client_id: id, ...editPassport }),
      company ? supabase.from('company_details').update({ ...editCompany, updated_at: new Date().toISOString() }).eq('client_id', id)
              : supabase.from('company_details').insert({ client_id: id, ...editCompany }),
      work ? supabase.from('work_details').update({ ...workPayload, updated_at: new Date().toISOString() }).eq('client_id', id)
           : supabase.from('work_details').insert({ client_id: id, ...workPayload }),
    ]);

    const errResult = results.find(r => r.error);
    if (errResult && errResult.error) {
      alert(`Failed to save client details: ${errResult.error.message}`);
      setSaving(false);
      return;
    }

    // Reload
    const [c, p, pass, comp, wrk] = await Promise.all([
      supabase.from('clients').select('*, categories!clients_category_id_fkey(name), staff_profiles!clients_assigned_to_staff_fkey(full_name)').eq('id', id).maybeSingle(),
      supabase.from('personal_details').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('passport_details').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('company_details').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('work_details').select('*').eq('client_id', id).maybeSingle(),
    ]);
    setClient(c.data);
    setPd(p.data);
    setPassport(pass.data);
    setCompany(comp.data);
    setWork(parseWorkDetails(wrk.data));
    setSaving(false);
    setEditing(false);
  }

  async function addRemark() {
    if (!newRemark.trim() || !id) return;
    const { data } = await supabase.from('remarks').insert({
      client_id: id,
      author_id: user?.id,
      content: newRemark.trim(),
    }).select('*, staff_profiles(full_name)').single();
    if (data) setRemarks(prev => [data, ...prev]);
    setNewRemark('');
  }

  async function deleteRemark(rid: string) {
    await supabase.from('remarks').delete().eq('id', rid);
    setRemarks(prev => prev.filter(r => r.id !== rid));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const path = `${id}/${Date.now()}_${file.name}`;
    const { data: upload, error } = await supabase.storage.from('client-documents').upload(path, file);
    if (!error && upload) {
      const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(path);
      const { data: doc } = await supabase.from('documents').insert({
        client_id: id,
        document_type: 'Other',
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        uploaded_by: user?.id,
      }).select().single();
      if (doc) setDocuments(prev => [doc, ...prev]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function deleteDocument(docId: string) {
    await supabase.from('documents').delete().eq('id', docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  }

  if (loading) return <div className="p-6 text-slate-400 text-sm">Loading...</div>;
  if (!client) return <div className="p-6 text-slate-400 text-sm">Client not found.</div>;

  const clientName = pd ? `${pd.first_name} ${pd.last_name}` : 'Unknown Client';
  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700";
  const lbl = "block text-xs font-medium text-slate-500 mb-1";

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'personal', label: 'Personal', icon: User },
    { key: 'passport', label: 'Passport', icon: FileText },
    { key: 'company', label: 'Company', icon: Building },
    { key: 'work', label: 'Work Experience', icon: Briefcase },
    { key: 'remarks', label: `Remarks (${remarks.length})`, icon: MessageSquare },
    { key: 'documents', label: `Documents (${documents.length})`, icon: Upload },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="text-slate-400 hover:text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{clientName}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[client.status]}`}>{client.status}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{client.reg_no}</span>
              {(client as any).categories?.name && (
                <span className="text-xs text-slate-500">{(client as any).categories.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/clients/${id}/print`}
            target="_blank"
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </Link>
          {!editing ? (
            <button onClick={startEdit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <>
              <button onClick={cancelEdit} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Case meta bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Assigned To</p>
          {editing ? (
            <select className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editClient.assigned_to ?? ''} onChange={e => setEditClient(p => ({ ...p, assigned_to: e.target.value || undefined }))}>
              <option value="">Unassigned</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          ) : (
            <p className="font-medium text-slate-800">{(client as any).staff_profiles?.full_name ?? '—'}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Status</p>
          {editing ? (
            <select className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editClient.status ?? ''} onChange={e => setEditClient(p => ({ ...p, status: e.target.value as any }))}>
              {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[client.status]}`}>{client.status}</span>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Category</p>
          {editing ? (
            <select className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editClient.category_id ?? ''} onChange={e => setEditClient(p => ({ ...p, category_id: e.target.value || undefined }))}>
              <option value="">Select</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <p className="font-medium text-slate-800">{(client as any).categories?.name ?? '—'}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Case Date</p>
          {editing ? (
            <input type="date" className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editClient.case_date ?? ''} onChange={e => setEditClient(p => ({ ...p, case_date: e.target.value }))} />
          ) : (
            <p className="font-medium text-slate-800">{formatDate(client.case_date)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">CV Needed</p>
          {editing ? (
            <input type="checkbox" checked={editClient.cv_needed ?? false} onChange={e => setEditClient(p => ({ ...p, cv_needed: e.target.checked }))} className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          ) : (
            <p className="font-medium text-slate-800">{client.cv_needed ? 'Yes' : 'No'}</p>
          )}
        </div>
        <div className="ml-auto">
          <p className="text-xs text-slate-400 mb-0.5">Registered</p>
          <p className="font-medium text-slate-800">{formatDate(client.created_at)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-5 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">

        {/* Personal */}
        {tab === 'personal' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { label: 'First Name', field: 'first_name', src: pd?.first_name },
              { label: 'Last Name', field: 'last_name', src: pd?.last_name },
              { label: 'Date of Birth', field: 'date_of_birth', src: formatDate(pd?.date_of_birth), type: 'date' },
              { label: 'Age', field: 'age', src: calculateAge(pd?.date_of_birth), type: 'readonly' },
              { label: 'Gender', field: 'gender', src: pd?.gender, type: 'select', options: ['Male', 'Female', 'Other'] },
              { label: 'Nationality', field: 'nationality', src: pd?.nationality },
              { label: 'Email', field: 'email', src: pd?.email, type: 'email' },
              { label: 'Phone', field: 'phone', src: pd?.phone },
              { label: 'WhatsApp', field: 'whatsapp', src: pd?.whatsapp },
              { label: 'Address Line 1', field: 'address_line1', src: pd?.address_line1 },
              { label: 'Address Line 2', field: 'address_line2', src: pd?.address_line2 },
              { label: 'City', field: 'city', src: pd?.city },
              { label: 'Country', field: 'country', src: pd?.country },
            ].map(({ label, field, src, type, options }) => (
              <div key={field}>
                <p className={lbl}>{label}</p>
                {editing ? (
                  type === 'select' ? (
                    <select className={inp} value={(editPd as any)[field] ?? ''} onChange={e => setEditPd(p => ({ ...p, [field]: e.target.value }))}>
                      <option value="">—</option>
                      {options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : type === 'readonly' ? (
                    <input type="text" className={inp + ' bg-slate-50 text-slate-500'} value={calculateAge(editPd.date_of_birth)} readOnly placeholder="Auto-calculated" />
                  ) : (
                    <input type={type ?? 'text'} className={inp} value={(editPd as any)[field] ?? ''} onChange={e => setEditPd(p => ({ ...p, [field]: e.target.value }))} />
                  )
                ) : (
                  <p className="text-sm font-medium text-slate-800">{(type === 'date' ? src : src) || '—'}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Passport */}
        {tab === 'passport' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { label: 'Passport Number', field: 'passport_number', src: passport?.passport_number },
              { label: 'Place of Birth', field: 'place_of_birth', src: passport?.place_of_birth },
              { label: 'Issue Date', field: 'issue_date', src: formatDate(passport?.issue_date), type: 'date' },
              { label: 'Expiry Date', field: 'expiry_date', src: formatDate(passport?.expiry_date), type: 'date' },
              { label: 'Issuing Country', field: 'issuing_country', src: passport?.issuing_country },
            ].map(({ label, field, src, type }) => (
              <div key={field}>
                <p className={lbl}>{label}</p>
                {editing ? (
                  <input type={type ?? 'text'} className={inp} value={(editPassport as any)[field] ?? ''} onChange={e => setEditPassport(p => ({ ...p, [field]: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium text-slate-800">{src || '—'}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Company */}
        {tab === 'company' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { label: 'Company Name', field: 'company_name', src: company?.company_name },
              { label: 'Company Reg. No.', field: 'company_reg_no', src: company?.company_reg_no },
              { label: 'Position', field: 'position', src: company?.position },
              { label: 'Employer Address', field: 'employer_address', src: company?.employer_address, full: true },
            ].map(({ label, field, src, full }) => (
              <div key={field} className={full ? 'col-span-2' : ''}>
                <p className={lbl}>{label}</p>
                {editing ? (
                  full ? (
                    <textarea className={inp + ' resize-none'} rows={3} value={(editCompany as any)[field] ?? ''} onChange={e => setEditCompany(p => ({ ...p, [field]: e.target.value }))} />
                  ) : (
                    <input className={inp} value={(editCompany as any)[field] ?? ''} onChange={e => setEditCompany(p => ({ ...p, [field]: e.target.value }))} />
                  )
                ) : (
                  <p className="text-sm font-medium text-slate-800">{src || '—'}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Work */}
        {tab === 'work' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Work Experience</h3>
              
              {/* List Section */}
              <div className="space-y-2 mb-4">
                {editing ? (
                  // Edit mode experiences
                  <>
                    {editWork.experiences && editWork.experiences.length > 0 ? (
                      <div className="space-y-2">
                        {editWork.experiences.map((exp: any) => (
                          <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 truncate">{exp.position}</p>
                              <p className="text-xs text-slate-500 truncate">{exp.company} &middot; {exp.duration}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEditExperience(exp.id)}
                              className="text-slate-400 hover:text-red-500 p-1.5 transition-colors"
                              title="Remove experience"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                        No work experience added yet. Add one below.
                      </div>
                    )}

                    {/* Add Experience in Edit Mode */}
                    <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl space-y-3 mt-3">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Add Experience Entry</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Company Name</label>
                          <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
                            placeholder="e.g. Acme Corp"
                            value={newExpCompany}
                            onChange={e => setNewExpCompany(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Position / Job Title</label>
                          <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
                            placeholder="e.g. Software Engineer"
                            value={newExpPosition}
                            onChange={e => setNewExpPosition(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                          <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
                            placeholder="e.g. 2 years / Jan 2020 - Dec 2022"
                            value={newExpDuration}
                            onChange={e => setNewExpDuration(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addEditExperience}
                        disabled={!newExpCompany.trim() || !newExpPosition.trim() || !newExpDuration.trim()}
                        className="w-full flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-600 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors border border-blue-100"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Experience
                      </button>
                    </div>
                  </>
                ) : (
                  // View mode experiences
                  <>
                    {work?.experiences && work.experiences.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {work.experiences.map((exp: any) => (
                          <div key={exp.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{exp.position}</p>
                              <p className="text-xs text-slate-500">{exp.company}</p>
                              <span className="inline-block mt-1 text-[10px] font-medium bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded">
                                {exp.duration}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-6 border border-dashed border-slate-200 rounded-xl">
                        No work experience recorded.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Visa / Permit Details */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Visa &amp; Permit Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {[
                  { label: 'Work Permit No.', field: 'work_permit_no', src: work?.work_permit_no },
                  { label: 'Permit Expiry', field: 'work_permit_expiry', src: formatDate(work?.work_permit_expiry), type: 'date' },
                  { label: 'Visa Type', field: 'visa_type', src: work?.visa_type },
                  { label: 'Visa Number', field: 'visa_number', src: work?.visa_number },
                  { label: 'Visa Expiry', field: 'visa_expiry', src: formatDate(work?.visa_expiry), type: 'date' },
                  { label: 'Occupation', field: 'occupation', src: work?.occupation },
                  { label: 'Port of Entry', field: 'port_of_entry', src: work?.port_of_entry },
                ].map(({ label, field, src, type }) => (
                  <div key={field}>
                    <p className={lbl}>{label}</p>
                    {editing ? (
                      <input type={type ?? 'text'} className={inp} value={(editWork as any)[field] ?? ''} onChange={e => setEditWork(p => ({ ...p, [field]: e.target.value }))} />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{src || '—'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Remarks */}
        {tab === 'remarks' && (
          <div>
            <div className="flex gap-3 mb-6">
              <textarea
                value={newRemark}
                onChange={e => setNewRemark(e.target.value)}
                placeholder="Add a remark..."
                rows={2}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-700"
              />
              <button
                onClick={addRemark}
                disabled={!newRemark.trim()}
                className="flex-shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {remarks.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No remarks yet.</p>}
            <div className="space-y-3">
              {remarks.map(r => (
                <div key={r.id} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{r.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                    {staff.find(s => s.id === r.author_id)?.full_name ?? 'Staff'} · {new Date(r.created_at).toLocaleString('en-IE')}
                    </p>
                  </div>
                  {r.author_id === user?.id && (
                    <button onClick={() => deleteRemark(r.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {tab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">{documents.length} file{documents.length !== 1 ? 's' : ''}</p>
              <div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {uploading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Upload className="w-4 h-4" />}
                  Upload File
                </button>
              </div>
            </div>
            {documents.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No documents uploaded.</p>}
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate block">{doc.file_name}</a>
                    <p className="text-xs text-slate-400">{doc.document_type} · {formatDate(doc.created_at)}</p>
                  </div>
                  <button onClick={() => deleteDocument(doc.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
