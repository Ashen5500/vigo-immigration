import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Category, StaffProfile } from '../../lib/types';
import { CLIENT_STATUSES } from '../../lib/utils';
import { ChevronLeft, ChevronRight, Save, Calendar } from 'lucide-react';

const STEPS = ['Personal', 'Passport', 'Company', 'Work', 'Case'];

interface FormData {
  // personal
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  email: string;
  phone: string;
  whatsapp: string;
  address_line1: string;
  address_line2: string;
  city: string;
  country: string;
  // passport
  passport_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_country: string;
  place_of_birth: string;
  // company
  company_name: string;
  company_reg_no: string;
  position: string;
  employer_address: string;
  // work
  work_permit_no: string;
  work_permit_expiry: string;
  visa_type: string;
  visa_number: string;
  visa_expiry: string;
  occupation: string;
  port_of_entry: string;
  // case
  status: string;
  category_id: string;
  assigned_to: string;
  case_date: string;
  cv_needed: boolean;
}

const INIT: FormData = {
  first_name: '', last_name: '', date_of_birth: '', gender: '', nationality: '',
  email: '', phone: '', whatsapp: '', address_line1: '', address_line2: '', city: '', country: 'Ireland',
  passport_number: '', issue_date: '', expiry_date: '', issuing_country: '', place_of_birth: '',
  company_name: '', company_reg_no: '', position: '', employer_address: '',
  work_permit_no: '', work_permit_expiry: '', visa_type: '', visa_number: '', visa_expiry: '', occupation: '', port_of_entry: '',
  status: 'New', category_id: '', assigned_to: '', case_date: new Date().toISOString().split('T')[0], cv_needed: false,
};

// ---- date helpers ----

function formatDateForDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function parseTypedDate(input: string): string {
  // Accepts DD/MM/YYYY or DD-MM-YYYY
  const match = input.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return '';
  const [, d, m, y] = match;
  const day = d.padStart(2, '0');
  const month = m.padStart(2, '0');
  const test = new Date(`${y}-${month}-${day}`);
  if (isNaN(test.getTime())) return '';
  return `${y}-${month}-${day}`;
}

function calculateAge(iso: string): string {
  if (!iso) return '';
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

export default function ClientNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INIT);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // typed display value for DOB + ref to hidden native date picker
  const [dobDisplay, setDobDisplay] = useState('');
  const dobPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(r => setCategories(r.data ?? []));
    supabase.from('staff_profiles').select('*').order('full_name').then(r => setStaff(r.data ?? []));
  }, []);

  useEffect(() => {
    setDobDisplay(formatDateForDisplay(form.date_of_birth));
  }, [form.date_of_birth]);

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleDobTextChange(value: string) {
    setDobDisplay(value);
    if (value.trim() === '') {
      set('date_of_birth', '');
      return;
    }
    const iso = parseTypedDate(value);
    if (iso) set('date_of_birth', iso);
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.');
      setStep(0);
      return;
    }
    setSaving(true);
    setError('');

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        status: form.status,
        category_id: form.category_id || null,
        assigned_to: form.assigned_to || null,
        case_date: form.case_date || null,
        cv_needed: form.cv_needed,
      })
      .select()
      .single();

    if (clientErr || !client) {
      setError(clientErr?.message ?? 'Failed to create client.');
      setSaving(false);
      return;
    }

    const cid = client.id;
    await Promise.all([
      supabase.from('personal_details').insert({
        client_id: cid,
        first_name: form.first_name, last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        email: form.email || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        country: form.country || null,
      }),
      supabase.from('passport_details').insert({
        client_id: cid,
        passport_number: form.passport_number || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        issuing_country: form.issuing_country || null,
        place_of_birth: form.place_of_birth || null,
      }),
      supabase.from('company_details').insert({
        client_id: cid,
        company_name: form.company_name || null,
        company_reg_no: form.company_reg_no || null,
        position: form.position || null,
        employer_address: form.employer_address || null,
      }),
      supabase.from('work_details').insert({
        client_id: cid,
        work_permit_no: form.work_permit_no || null,
        work_permit_expiry: form.work_permit_expiry || null,
        visa_type: form.visa_type || null,
        visa_number: form.visa_number || null,
        visa_expiry: form.visa_expiry || null,
        occupation: form.occupation || null,
        port_of_entry: form.port_of_entry || null,
      }),
    ]);

    navigate(`/clients/${cid}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/clients')} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register New Client</h1>
          <p className="text-slate-500 text-sm">Complete all sections</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0 mb-8 bg-white rounded-xl border border-slate-200 p-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`flex-1 flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors ${
              i === step ? 'bg-blue-600 text-white' : i < step ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs mb-1 ${
              i === step ? 'bg-white/20' : i < step ? 'bg-green-100' : 'bg-slate-100'
            }`}>
              {i < step ? '✓' : i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {/* Step 0: Personal */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 text-base mb-4">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>First Name *</label><input className={inputClass} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jane" /></div>
              <div><label className={labelClass}>Last Name *</label><input className={inputClass} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date of Birth</label>
                <div className="relative">
                  <input
                    type="text"
                    className={inputClass + ' pr-9'}
                    placeholder="DD/MM/YYYY"
                    value={dobDisplay}
                    onChange={e => handleDobTextChange(e.target.value)}
                    onBlur={() => setDobDisplay(formatDateForDisplay(form.date_of_birth))}
                  />
                  <input
                    ref={dobPickerRef}
                    type="date"
                    tabIndex={-1}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => dobPickerRef.current?.showPicker?.()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input
                  type="text"
                  className={inputClass + ' bg-slate-50 text-slate-500'}
                  value={calculateAge(form.date_of_birth)}
                  readOnly
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gender</label>
                <select className={inputClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Nationality</label>
                <input className={inputClass} value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="Irish" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" /></div>
              <div><label className={labelClass}>Phone</label><input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+353..." /></div>
            </div>
            <div><label className={labelClass}>WhatsApp</label><input className={inputClass} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+353..." /></div>
            <div><label className={labelClass}>Address Line 1</label><input className={inputClass} value={form.address_line1} onChange={e => set('address_line1', e.target.value)} /></div>
            <div><label className={labelClass}>Address Line 2</label><input className={inputClass} value={form.address_line2} onChange={e => set('address_line2', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>City</label><input className={inputClass} value={form.city} onChange={e => set('city', e.target.value)} /></div>
              <div><label className={labelClass}>Country</label><input className={inputClass} value={form.country} onChange={e => set('country', e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* Step 1: Passport */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 text-base mb-4">Passport Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Passport Number</label><input className={inputClass} value={form.passport_number} onChange={e => set('passport_number', e.target.value)} /></div>
              <div><label className={labelClass}>Place of Birth</label><input className={inputClass} value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Issue Date</label><input type="date" className={inputClass} value={form.issue_date} onChange={e => set('issue_date', e.target.value)} /></div>
              <div><label className={labelClass}>Expiry Date</label><input type="date" className={inputClass} value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
            </div>
            <div><label className={labelClass}>Issuing Country</label><input className={inputClass} value={form.issuing_country} onChange={e => set('issuing_country', e.target.value)} /></div>
          </div>
        )}

        {/* Step 2: Company */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 text-base mb-4">Company / Employer Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Company Name</label><input className={inputClass} value={form.company_name} onChange={e => set('company_name', e.target.value)} /></div>
              <div><label className={labelClass}>Company Reg. No.</label><input className={inputClass} value={form.company_reg_no} onChange={e => set('company_reg_no', e.target.value)} /></div>
            </div>
            <div><label className={labelClass}>Position / Job Title</label><input className={inputClass} value={form.position} onChange={e => set('position', e.target.value)} /></div>
            <div><label className={labelClass}>Employer Address</label><textarea className={inputClass + ' resize-none'} rows={3} value={form.employer_address} onChange={e => set('employer_address', e.target.value)} /></div>
          </div>
        )}

        {/* Step 3: Work */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 text-base mb-4">Work / Immigration Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Work Permit No.</label><input className={inputClass} value={form.work_permit_no} onChange={e => set('work_permit_no', e.target.value)} /></div>
              <div><label className={labelClass}>Permit Expiry</label><input type="date" className={inputClass} value={form.work_permit_expiry} onChange={e => set('work_permit_expiry', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Visa Type</label><input className={inputClass} value={form.visa_type} onChange={e => set('visa_type', e.target.value)} placeholder="e.g. Stamp 4" /></div>
              <div><label className={labelClass}>Visa Number</label><input className={inputClass} value={form.visa_number} onChange={e => set('visa_number', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Visa Expiry</label><input type="date" className={inputClass} value={form.visa_expiry} onChange={e => set('visa_expiry', e.target.value)} /></div>
              <div><label className={labelClass}>Occupation</label><input className={inputClass} value={form.occupation} onChange={e => set('occupation', e.target.value)} /></div>
            </div>
            <div><label className={labelClass}>Port of Entry</label><input className={inputClass} value={form.port_of_entry} onChange={e => set('port_of_entry', e.target.value)} /></div>
          </div>
        )}

        {/* Step 4: Case */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 text-base mb-4">Case Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
                  {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select className={inputClass} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Assigned To</label>
                <select className={inputClass} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Unassigned</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Case Date</label>
                <input type="date" className={inputClass} value={form.case_date} onChange={e => set('case_date', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                id="cv_needed"
                type="checkbox"
                checked={form.cv_needed}
                onChange={e => set('cv_needed', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="cv_needed" className="text-sm text-slate-700">CV required for this case</label>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 disabled:opacity-30 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {saving ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Client
          </button>
        )}
      </div>
    </div>
  );
}