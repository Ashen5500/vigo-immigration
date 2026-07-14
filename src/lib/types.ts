export type UserRole = 'admin' | 'consultant';

export interface StaffProfile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export type ClientStatus = 'New' | 'In Progress' | 'Pending Documents' | 'Submitted' | 'Approved' | 'Rejected' | 'Closed';

export interface Client {
  id: string;
  reg_no: string;
  status: ClientStatus;
  category_id?: string;
  assigned_to?: string;
  signature?: string;
  case_date?: string;
  cv_needed: boolean;
  created_at: string;
  updated_at: string;
  // joined
  categories?: Category;
  staff_profiles?: StaffProfile;
  personal_details?: PersonalDetails;
}

export interface PersonalDetails {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  nationality?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface PassportDetails {
  id: string;
  client_id: string;
  passport_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_country?: string;
  place_of_birth?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyDetails {
  id: string;
  client_id: string;
  company_name?: string;
  company_reg_no?: string;
  position?: string;
  employer_address?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkDetails {
  id: string;
  client_id: string;
  work_permit_no?: string;
  work_permit_expiry?: string;
  visa_type?: string;
  visa_number?: string;
  visa_expiry?: string;
  occupation?: string;
  port_of_entry?: string;
  created_at: string;
  updated_at: string;
}

export interface Remark {
  id: string;
  client_id: string;
  author_id?: string;
  content: string;
  created_at: string;
  staff_profiles?: StaffProfile;
}

export interface Document {
  id: string;
  client_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Invoice {
  id: string;
  invoice_no: string;
  client_id: string;
  issue_date: string;
  due_date?: string;
  status: InvoiceStatus;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  clients?: Client;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
}

export interface EmailLog {
  id: string;
  client_id?: string;
  to_email: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  sent_by?: string;
  sent_at: string;
  clients?: Client;
}

export interface Backup {
  id: string;
  type: 'manual' | 'scheduled';
  file_name?: string;
  file_url?: string;
  status: 'pending' | 'completed' | 'failed';
  triggered_by?: string;
  created_at: string;
}
