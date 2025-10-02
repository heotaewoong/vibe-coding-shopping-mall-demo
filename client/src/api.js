const API_BASE = import.meta.env.VITE_API_BASE || ''
export default function api(path){
  // path must start with '/'
  if (!path.startsWith('/')) path = '/' + path
  return API_BASE ? `${API_BASE}${path}` : path
}

export function fullUrl(path){ return api(path) }
