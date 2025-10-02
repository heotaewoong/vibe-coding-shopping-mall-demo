import React, { useEffect, useState } from 'react'

export default function AdminOrders({ onBack }){
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 12
  const [total, setTotal] = useState(0)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true); setError(null)
      try{
        const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
        const query = []
        if (q) query.push(`q=${encodeURIComponent(q)}`)
        if (status && status !== 'all') query.push(`status=${encodeURIComponent(status)}`)
        query.push(`page=${page}`)
        query.push(`perPage=${perPage}`)
        const url = '/orders' + (query.length ? '?' + query.join('&') : '')
        const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        const res = await fetch(url, opts)
        if (!mounted) return
        if (res.ok){
          const d = await res.json().catch(()=>null)
          setOrders(d && d.orders ? d.orders : [])
          setTotal(d && typeof d.total === 'number' ? d.total : (d && d.length ? d.length : 0))
        } else {
          const d = await res.json().catch(()=>null)
          setError((d && d.message) || '주문을 불러오지 못했습니다')
        }
      } catch(err){
        console.error('admin orders load', err)
        setError('네트워크 오류')
      } finally { if (mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  }, [q, status, page])

  function formatPrice(v){ if (v == null) return '₩0'; const n = Number(v); if (Number.isNaN(n)) return '₩0'; return '₩' + n.toLocaleString() }

  const statusList = [
    { key: 'all', label: '전체' },
    { key: 'paid', label: '결제완료' },
    { key: 'pending', label: '결제대기' },
    { key: 'cancelled', label: '취소' },
    { key: 'refunded', label: '환불' },
    { key: 'failed', label: '실패' }
  ]

  return (
    <div style={{padding:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div>
          <h2 style={{margin:0}}>주문 관리</h2>
          <div style={{color:'#6b7280',marginTop:6}}>전체 주문을 검색하고 상태별로 관리하세요</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-light" onClick={onBack}>대시보드로</button>
        </div>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:18,alignItems:'center'}}>
        <input placeholder="주문번호 또는 이메일로 검색" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid #e6e9ee'}} />
        <select value={status} onChange={e=>{ setStatus(e.target.value); setPage(1) }} style={{padding:10,borderRadius:8,border:'1px solid #e6e9ee'}}>
          {statusList.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button className="btn-primary" onClick={()=>{ setPage(1); /* triggers useEffect */ }}>검색</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
        {loading ? <div style={{gridColumn:'1/-1',padding:20}}>로딩중...</div> : null}
        {error ? <div style={{gridColumn:'1/-1',color:'red',padding:20}}>{error}</div> : null}
        {!loading && !error && orders.length === 0 && <div style={{gridColumn:'1/-1',color:'#6b7280',padding:20}}>주문 내역이 없습니다.</div>}
        {orders.map(o => (
          <div key={o._id} style={{background:'#fff',borderRadius:12,padding:16,boxShadow:'0 8px 30px rgba(2,6,23,0.06)',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:14,color:'#6b7280'}}>주문번호</div>
                <div style={{fontWeight:800,fontSize:16}}>{o.orderNumber || o._id}</div>
                <div style={{color:'#6b7280',marginTop:6}}>{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:900,fontSize:18}}>{formatPrice(o.total)}</div>
                <div style={{marginTop:8}}>
                  <span style={{display:'inline-block',padding:'6px 10px',borderRadius:18,fontWeight:700,color:'#fff',background: o.status === 'paid' ? '#16a34a' : (o.status === 'pending' ? '#f59e0b' : '#ef4444')}}>
                    {o.status === 'paid' ? '결제완료' : (o.status === 'pending' ? '결제대기' : (o.status === 'cancelled' ? '취소' : (o.status === 'refunded' ? '환불' : (o.status === 'failed' ? '실패' : o.status))))}
                  </span>
                </div>
              </div>
            </div>

            <div style={{marginTop:12,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:0}}>
                {o.items && o.items.length > 0 ? (
                  o.items.slice(0,3).map((it, idx) => (
                    <div key={idx} style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                      <div style={{width:56,height:56,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>{it.sku || 'PDF'}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.title || it.name}</div>
                        <div style={{fontSize:13,color:'#6b7280'}}>수량: {it.quantity}</div>
                      </div>
                    </div>
                  ))
                ) : <div style={{color:'#6b7280'}}>상품 없음</div>}
              </div>

              <div style={{display:'flex',gap:8}}>
                <button className="btn-light" onClick={()=>{ window.dispatchEvent(new CustomEvent('navigate-to-order', { detail: o })); window.location.href = '/'; }}>상세보기</button>
                {o.status === 'paid' && (
                  <button className="btn-primary" onClick={()=>{ window.open(`/orders/${o._id}`, '_blank') }}>다운로드 페이지</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:18}}>
        <button className="btn-light" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>{'<'}</button>
        <div style={{padding:'8px 12px',background:'#fff',borderRadius:8}}>{page}</div>
        <button className="btn-light" onClick={()=>setPage(p=>p+1)} disabled={orders.length < perPage}>{'>'}</button>
      </div>
    </div>
  )
}
