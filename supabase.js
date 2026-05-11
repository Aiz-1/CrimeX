// ─── SUPABASE INIT ───────────────────────────────────────────────
const SUPABASE_URL = 'https://ovgdwjswxvqiafnbpqhm.supabase.co';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Z2R3anN3eHZxaWFmbmJwcWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMDE4MTksImV4cCI6MjA5MjY3NzgxOX0.J9n7nNAjALnUOJSd9p72QPHP_YFbpntFs8PFd3WuZUA';

const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Z2R3anN3eHZxaWFmbmJwcWhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzEwMTgxOSwiZXhwIjoyMDkyNjc3ODE5fQ.LXpVV7N6YCbCk4XESfizfQe8tVeftqEFuvi-GeTHqoc';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const dbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});
