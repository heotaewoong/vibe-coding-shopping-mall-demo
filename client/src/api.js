console.log("VITE_API_BASE_URL from Vercel:", import.meta.env.VITE_API_BASE_URL);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function api(path){
  // path must start with '/'
  if (!path.startsWith('/')) path = '/' + path;
  // API_BASE_URL과 path 사이에 '/api'를 추가
  const url = API_BASE_URL ? `${API_BASE_URL}/api${path}` : `/api${path}`;
  return url;
}

export function fullUrl(path){ return api(path) }
