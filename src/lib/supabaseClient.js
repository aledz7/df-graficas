import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xkefbprhsyajhxsnxdih.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZWZicHJoc3lhamh4c254ZGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NjY4OTksImV4cCI6MjA2NTE0Mjg5OX0.5j33BTFcLc7s4Jl1JE3hSgR24JHkbQikuq9x6nekS88';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);