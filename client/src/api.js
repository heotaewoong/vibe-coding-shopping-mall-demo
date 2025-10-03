console.log("VITE_API_BASE_URL from Vercel:", import.meta.env.VITE_API_BASE_URL);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function api(path){
  // path must start with '/'
  if (!path.startsWith('/')) path = '/' + path
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export function fullUrl(path){ return api(path) }
