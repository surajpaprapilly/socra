import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchWithAuth = async (url, options = {}) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = {
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  return fetch(url, { ...options, headers });
};

export const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchWithAuth(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const error = new Error('Request timed out');
      error.isTimeout = true;
      throw error;
    }
    throw err;
  }
};
