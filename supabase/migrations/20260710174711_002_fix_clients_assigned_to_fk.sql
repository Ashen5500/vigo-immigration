/*
# Fix clients.assigned_to foreign key to reference staff_profiles directly

The original FK pointed to auth.users(id). PostgREST cannot automatically resolve
the join from clients.assigned_to to staff_profiles via auth.users.
This migration drops that FK and adds a new one pointing directly to staff_profiles(id),
allowing the ORM embed `staff_profiles(full_name)` to work correctly.

No data is lost — only the constraint target changes.
*/

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_assigned_to_fkey;

ALTER TABLE clients
  ADD CONSTRAINT clients_assigned_to_staff_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES staff_profiles(id)
  ON DELETE SET NULL;
