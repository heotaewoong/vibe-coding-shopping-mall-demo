console.log("VITE_API_BASE_URL from Vercel:", import.meta.env.VITE_API_BASE_URL);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function api(path){
  if (!path) path = '/'
  if (path.startsWith('/api/')) path = path.slice(4)
  else if (path === '/api') path = '/'
  if (!path.startsWith('/')) path = '/' + path
  return `${API_BASE_URL}/api${path}`
}

export function fullUrl(path){ return api(path) }

export async function get(url, options = {}) {
  const token = localStorage.getItem('accessToken')
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}
