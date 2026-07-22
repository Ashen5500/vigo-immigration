-- Migration: Add work experiences JSONB column to work_details
ALTER TABLE work_details ADD COLUMN IF NOT EXISTS experiences jsonb DEFAULT '[]'::jsonb;
