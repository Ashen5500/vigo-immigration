/*
# Vigo Immigration Data Management System — Initial Schema

## Overview
This migration creates the full schema for the Vigo Immigration client management system.
All staff must be authenticated to access any data. All tables use RLS with TO authenticated policies.

## New Tables

### staff_profiles
Linked to auth.users. Stores display name and role (admin, consultant).

### categories
Lookup table for case categories (Driving Licence, Work Permit, etc.)

### clients
Core client record. Contains: auto-generated registration number, status,
assigned consultant, case category, dates, and signature data.

### personal_details
Client personal info: name, DOB, gender, nationality, email, phone, WhatsApp, address.

### passport_details
Passport number, issue/expiry dates, issuing country, place of birth.

### company_details
Employer name, registration number, position, employer address.

### work_details
Work permit number/expiry, visa type/number/expiry, occupation, port of entry.

### remarks
Timestamped remarks per client, with author reference.

### documents
Metadata for uploaded files (CV, passport scan, etc.) stored in Supabase Storage.

### invoices
Invoice header: invoice number, client, date, due date, status, totals.

### invoice_items
Line items belonging to an invoice.

### email_logs
Record of every email sent to a client.

### backups
Log of database backups with type (manual/scheduled) and file URL.

### notifications
System alerts (expiring documents, etc.) per staff member.

## Security
- RLS enabled on all tables.
- All policies scoped TO authenticated.
- Staff see all client data (shared workspace model — not per-owner isolation).
- Clients table uses USING (true) so all authenticated staff can manage all cases.
*/

-- ─── STAFF PROFILES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text NOT NULL,
  role       text NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select" ON staff_profiles;
CREATE POLICY "staff_select" ON staff_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert" ON staff_profiles;
CREATE POLICY "staff_insert" ON staff_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "staff_update" ON staff_profiles;
CREATE POLICY "staff_update" ON staff_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "staff_delete" ON staff_profiles;
CREATE POLICY "staff_delete" ON staff_profiles FOR DELETE TO authenticated USING (auth.uid() = id);


-- ─── CATEGORIES ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert" ON categories;
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "categories_update" ON categories;
CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "categories_delete" ON categories;
CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated USING (true);

-- Seed default categories
INSERT INTO categories (name) VALUES
  ('Driving Licence'),
  ('Work Permit'),
  ('Visitor Visa'),
  ('Family Reunion'),
  ('Citizenship'),
  ('Asylum'),
  ('Student Visa'),
  ('Business Visa'),
  ('Residence Permit'),
  ('Travel Document')
ON CONFLICT (name) DO NOTHING;


-- ─── CLIENTS ─────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS client_reg_seq START 1;

CREATE TABLE IF NOT EXISTS clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_no       text UNIQUE NOT NULL DEFAULT 'VIG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('client_reg_seq')::text, 4, '0'),
  status       text NOT NULL DEFAULT 'New' CHECK (status IN ('New','In Progress','Pending Documents','Submitted','Approved','Rejected','Closed')),
  category_id  uuid REFERENCES categories(id),
  assigned_to  uuid REFERENCES auth.users(id),
  signature    text,
  case_date    date DEFAULT CURRENT_DATE,
  cv_needed    boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clients_delete" ON clients;
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated USING (true);


-- ─── PERSONAL DETAILS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS personal_details (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  date_of_birth date,
  gender        text CHECK (gender IN ('Male','Female','Other')),
  nationality   text,
  email         text,
  phone         text,
  whatsapp      text,
  address_line1 text,
  address_line2 text,
  city          text,
  country       text DEFAULT 'Ireland',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE personal_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pd_select" ON personal_details;
CREATE POLICY "pd_select" ON personal_details FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pd_insert" ON personal_details;
CREATE POLICY "pd_insert" ON personal_details FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pd_update" ON personal_details;
CREATE POLICY "pd_update" ON personal_details FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pd_delete" ON personal_details;
CREATE POLICY "pd_delete" ON personal_details FOR DELETE TO authenticated USING (true);


-- ─── PASSPORT DETAILS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS passport_details (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  passport_number text,
  issue_date      date,
  expiry_date     date,
  issuing_country text,
  place_of_birth  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE passport_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "passport_select" ON passport_details;
CREATE POLICY "passport_select" ON passport_details FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "passport_insert" ON passport_details;
CREATE POLICY "passport_insert" ON passport_details FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "passport_update" ON passport_details;
CREATE POLICY "passport_update" ON passport_details FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "passport_delete" ON passport_details;
CREATE POLICY "passport_delete" ON passport_details FOR DELETE TO authenticated USING (true);


-- ─── COMPANY DETAILS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_details (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  company_name    text,
  company_reg_no  text,
  position        text,
  employer_address text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_select" ON company_details;
CREATE POLICY "company_select" ON company_details FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "company_insert" ON company_details;
CREATE POLICY "company_insert" ON company_details FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "company_update" ON company_details;
CREATE POLICY "company_update" ON company_details FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "company_delete" ON company_details;
CREATE POLICY "company_delete" ON company_details FOR DELETE TO authenticated USING (true);


-- ─── WORK DETAILS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_details (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  work_permit_no     text,
  work_permit_expiry date,
  visa_type          text,
  visa_number        text,
  visa_expiry        date,
  occupation         text,
  port_of_entry      text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE work_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_select" ON work_details;
CREATE POLICY "work_select" ON work_details FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "work_insert" ON work_details;
CREATE POLICY "work_insert" ON work_details FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "work_update" ON work_details;
CREATE POLICY "work_update" ON work_details FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "work_delete" ON work_details;
CREATE POLICY "work_delete" ON work_details FOR DELETE TO authenticated USING (true);


-- ─── REMARKS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS remarks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES auth.users(id),
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE remarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "remarks_select" ON remarks;
CREATE POLICY "remarks_select" ON remarks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "remarks_insert" ON remarks;
CREATE POLICY "remarks_insert" ON remarks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "remarks_update" ON remarks;
CREATE POLICY "remarks_update" ON remarks FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "remarks_delete" ON remarks;
CREATE POLICY "remarks_delete" ON remarks FOR DELETE TO authenticated USING (auth.uid() = author_id);


-- ─── DOCUMENTS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name     text NOT NULL,
  file_url      text NOT NULL,
  file_size     bigint,
  uploaded_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "documents_update" ON documents;
CREATE POLICY "documents_update" ON documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "documents_delete" ON documents;
CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated USING (true);


-- ─── INVOICES ────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      text UNIQUE NOT NULL DEFAULT 'VIG-INV-' || lpad(nextval('invoice_seq')::text, 4, '0'),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  issue_date      date DEFAULT CURRENT_DATE,
  due_date        date,
  status          text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Paid','Overdue','Cancelled')),
  subtotal        numeric(10,2) DEFAULT 0,
  vat_rate        numeric(5,2) DEFAULT 0,
  vat_amount      numeric(10,2) DEFAULT 0,
  total           numeric(10,2) DEFAULT 0,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_update" ON invoices;
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING (true);


-- ─── INVOICE ITEMS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) DEFAULT 1,
  unit_price  numeric(10,2) NOT NULL,
  amount      numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_items_select" ON invoice_items;
CREATE POLICY "inv_items_select" ON invoice_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inv_items_insert" ON invoice_items;
CREATE POLICY "inv_items_insert" ON invoice_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inv_items_update" ON invoice_items;
CREATE POLICY "inv_items_update" ON invoice_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inv_items_delete" ON invoice_items;
CREATE POLICY "inv_items_delete" ON invoice_items FOR DELETE TO authenticated USING (true);


-- ─── EMAIL LOGS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid REFERENCES clients(id) ON DELETE SET NULL,
  to_email   text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  status     text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','pending')),
  sent_by    uuid REFERENCES auth.users(id),
  sent_at    timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_select" ON email_logs;
CREATE POLICY "email_logs_select" ON email_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "email_logs_insert" ON email_logs;
CREATE POLICY "email_logs_insert" ON email_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "email_logs_update" ON email_logs;
CREATE POLICY "email_logs_update" ON email_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "email_logs_delete" ON email_logs;
CREATE POLICY "email_logs_delete" ON email_logs FOR DELETE TO authenticated USING (true);


-- ─── BACKUPS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS backups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL DEFAULT 'manual' CHECK (type IN ('manual','scheduled')),
  file_name    text,
  file_url     text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  triggered_by uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backups_select" ON backups;
CREATE POLICY "backups_select" ON backups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "backups_insert" ON backups;
CREATE POLICY "backups_insert" ON backups FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "backups_update" ON backups;
CREATE POLICY "backups_update" ON backups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "backups_delete" ON backups;
CREATE POLICY "backups_delete" ON backups FOR DELETE TO authenticated USING (true);


-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_status      ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_category    ON clients(category_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned    ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pd_client           ON personal_details(client_id);
CREATE INDEX IF NOT EXISTS idx_passport_expiry     ON passport_details(expiry_date);
CREATE INDEX IF NOT EXISTS idx_work_permit_expiry  ON work_details(work_permit_expiry);
CREATE INDEX IF NOT EXISTS idx_remarks_client      ON remarks(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_client    ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client     ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv   ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_client   ON email_logs(client_id);
