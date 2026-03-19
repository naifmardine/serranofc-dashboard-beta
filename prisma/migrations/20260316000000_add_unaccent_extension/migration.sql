-- Enable unaccent extension for accent-insensitive text search
-- This allows queries like "caca ferrari" to match "Cacá Ferrari"
CREATE EXTENSION IF NOT EXISTS unaccent;
