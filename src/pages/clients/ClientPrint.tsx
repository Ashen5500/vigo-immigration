import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Client, PersonalDetails, PassportDetails, CompanyDetails, WorkDetails, Remark } from '../../lib/types';
import { formatDate, calculateAge } from '../../lib/utils';

export default function ClientPrint() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [pd, setPd] = useState<PersonalDetails | null>(null);
  const [passport, setPassport] = useState<PassportDetails | null>(null);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [work, setWork] = useState<WorkDetails | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [c, p, pass, comp, wrk, rem] = await Promise.all([
          supabase.from('clients').select('*, categories!clients_category_id_fkey(name), staff_profiles!clients_assigned_to_staff_fkey(full_name)').eq('id', id!).maybeSingle(),
          supabase.from('personal_details').select('*').eq('client_id', id!).maybeSingle(),
          supabase.from('passport_details').select('*').eq('client_id', id!).maybeSingle(),
          supabase.from('company_details').select('*').eq('client_id', id!).maybeSingle(),
          supabase.from('work_details').select('*').eq('client_id', id!).maybeSingle(),
          supabase.from('remarks').select('*, staff_profiles(full_name)').eq('client_id', id!).order('created_at', { ascending: false }),
        ]);

        if (c.error) throw new Error(c.error.message);
        if (p.error) throw new Error(p.error.message);
        if (pass.error) throw new Error(pass.error.message);
        if (comp.error) throw new Error(comp.error.message);
        if (wrk.error) throw new Error(wrk.error.message);
        if (rem.error) throw new Error(rem.error.message);

        setClient(c.data);
        setPd(p.data);
        setPassport(pass.data);
        setCompany(comp.data);
        const workData = wrk.data;
        if (workData) {
          try {
            const parsed = JSON.parse(workData.port_of_entry || '{}');
            if (parsed && typeof parsed === 'object' && 'experiences' in parsed) {
              workData.experiences = parsed.experiences || [];
              workData.port_of_entry = parsed.port_of_entry || '';
            }
          } catch (e) {
            // fallback
          }
        }
        setWork(workData);
        setRemarks(rem.data ?? []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load client details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function Field({ label, value }: { label: string; value?: string | null }) {
    return (
      <div className="mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className="border-b border-gray-300 mt-1 pb-1 text-sm text-gray-900 min-h-[20px]">{value || ''}</div>
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white bg-gray-800 px-3 py-1.5 mb-3 rounded">{title}</h3>
        <div className="grid grid-cols-3 gap-x-6 gap-y-0">{children}</div>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg max-w-lg mx-auto mt-8 font-medium">Error loading print view: {error}</div>;
  if (!client) return <div className="p-8 text-sm text-gray-500">Client not found.</div>;

  const name = pd ? `${pd.first_name} ${pd.last_name}` : '—';

  return (
    <div className="bg-white min-h-screen p-8 max-w-4xl mx-auto font-sans text-gray-900">
      {/* Print button */}
      <div className="print:hidden mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Print This Form
        </button>
        <button onClick={() => window.close()} className="border border-gray-300 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Close
        </button>
      </div>

      {/* Letterhead */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vigo Immigration</h1>
          <p className="text-sm text-gray-500">Case Management System</p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p className="font-mono font-bold text-lg text-gray-800">{client.reg_no}</p>
          <p>Registered: {formatDate(client.created_at)}</p>
          <p>Printed: {new Date().toLocaleDateString('en-IE')}</p>
        </div>
      </div>

      {/* Status bar */}
      <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
        <div><p className="text-xs text-gray-500 font-medium mb-0.5">Status</p><p className="font-bold">{client.status}</p></div>
        <div><p className="text-xs text-gray-500 font-medium mb-0.5">Category</p><p className="font-bold">{(client as any).categories?.name ?? '—'}</p></div>
        <div><p className="text-xs text-gray-500 font-medium mb-0.5">Assigned To</p><p className="font-bold">{(client as any).staff_profiles?.full_name ?? '—'}</p></div>
        <div><p className="text-xs text-gray-500 font-medium mb-0.5">Case Date</p><p className="font-bold">{formatDate(client.case_date)}</p></div>
      </div>

      <Section title="Personal Details">
        <Field label="Full Name" value={name} />
        <Field label="Date of Birth" value={formatDate(pd?.date_of_birth)} />
        <Field label="Age" value={calculateAge(pd?.date_of_birth)} />
        <Field label="Gender" value={pd?.gender} />
        <Field label="Nationality" value={pd?.nationality} />
        <Field label="Email" value={pd?.email} />
        <Field label="Phone" value={pd?.phone} />
        <Field label="WhatsApp" value={pd?.whatsapp} />
        <Field label="Address" value={[pd?.address_line1, pd?.address_line2, pd?.city, pd?.country].filter(Boolean).join(', ')} />
      </Section>

      <Section title="Passport Details">
        <Field label="Passport Number" value={passport?.passport_number} />
        <Field label="Place of Birth" value={passport?.place_of_birth} />
        <Field label="Issue Date" value={formatDate(passport?.issue_date)} />
        <Field label="Expiry Date" value={formatDate(passport?.expiry_date)} />
        <Field label="Issuing Country" value={passport?.issuing_country} />
      </Section>

      <Section title="Company / Employer Details">
        <Field label="Company Name" value={company?.company_name} />
        <Field label="Company Reg. No." value={company?.company_reg_no} />
        <Field label="Position" value={company?.position} />
        <Field label="Employer Address" value={company?.employer_address} />
      </Section>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-white bg-gray-800 px-3 py-1.5 mb-3 rounded">Work Experience</h3>
        
        {/* Render work experience list first if any */}
        {work?.experiences && work.experiences.length > 0 ? (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Previous Employment</span>
            <div className="space-y-2">
              {work.experiences.map((exp: any, index: number) => (
                <div key={exp.id || index} className="text-sm flex justify-between border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                  <div>
                    <span className="font-semibold text-gray-800">{exp.position}</span>
                    <span className="text-gray-500 text-xs ml-2">at {exp.company}</span>
                  </div>
                  <span className="text-gray-600 text-xs font-medium">{exp.duration}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 text-sm text-gray-400 italic">No work experience entries recorded.</div>
        )}

        <div className="grid grid-cols-3 gap-x-6 gap-y-0">
          <Field label="Work Permit No." value={work?.work_permit_no} />
          <Field label="Permit Expiry" value={formatDate(work?.work_permit_expiry)} />
          <Field label="Visa Type" value={work?.visa_type} />
          <Field label="Visa Number" value={work?.visa_number} />
          <Field label="Visa Expiry" value={formatDate(work?.visa_expiry)} />
          <Field label="Occupation" value={work?.occupation} />
          <Field label="Port of Entry" value={work?.port_of_entry} />
        </div>
      </div>

      {/* Remarks */}
      {remarks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white bg-gray-800 px-3 py-1.5 mb-3 rounded">Remarks</h3>
          <div className="space-y-2">
            {remarks.map(r => (
              <div key={r.id} className="border border-gray-200 rounded p-3 text-sm">
                <p className="text-gray-800">{r.content}</p>
                <p className="text-xs text-gray-400 mt-1">{(r as any).staff_profiles?.full_name ?? 'Staff'} · {new Date(r.created_at).toLocaleString('en-IE')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remark box for handwritten notes */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-white bg-gray-800 px-3 py-1.5 mb-3 rounded">Additional Remarks (Handwritten)</h3>
        <div className="border border-gray-300 rounded-lg h-24 p-2" />
      </div>

      {/* Signature */}
      <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-300">
        <div>
          <p className="text-xs text-gray-500 mb-12">Client Signature</p>
          <div className="border-b border-gray-400" />
          <p className="text-xs text-gray-400 mt-1">{name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-12">Consultant Signature</p>
          <div className="border-b border-gray-400" />
          <p className="text-xs text-gray-400 mt-1">{(client as any).staff_profiles?.full_name ?? 'Consultant'}</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </div>
  );
}
