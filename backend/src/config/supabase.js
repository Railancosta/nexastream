/**
 * Supabase JWT Verification
 * 
 * Configure your Supabase JWT in environment variables:
 * 
 * SUPABASE_URL=https://bslfsfquympulymbagde.supabase.co
 * SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase
 */

require('dotenv').config();

// Supabase JWT verification
async function verifySupabaseToken(token) {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) {
    throw new Error('Invalid token');
  }
  
  return user;
}

// Get Supabase client
function getSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js');
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

module.exports = { verifySupabaseToken, getSupabaseClient };
