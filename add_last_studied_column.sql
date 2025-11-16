-- Add last_studied column to flashcard_sets table
ALTER TABLE flashcard_sets 
ADD COLUMN IF NOT EXISTS last_studied TIMESTAMP WITH TIME ZONE;