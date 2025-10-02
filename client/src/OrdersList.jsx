import React, { useEffect, useState } from 'react'

export default function OrdersList({ user, onBack }){
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      setError(null)
      try{
        const token = (()=>{ try{ return localStorage.getItem('accessToken') } catch(e){ return null } })()
        if (!token){ setError('주문을 보려면 로그인하세요'); setLoading(false); return }
        const res = await fetch('/orders', { headers: { Authorization: `Bearer ${token}` } })
        if (!mounted) return
        if (res.ok){ const d = await res.json(); setOrders(d.orders || []) }
        else { const d = await res.json().catch(()=>null); setError((d && d.message) || '주문을 불러오지 못했습니다') }
      } catch(err){ console.error('load orders', err); setError('네트워크 오류') }
      finally{ if (mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  }, [user])

  if (loading) return <div style={{padding:20}}>로딩 중...</div>
  if (error) return <div style={{padding:20,color:'red'}}>{error}</div>

  return (
    <div style={{maxWidth:1100,margin:'28px auto',padding:'0 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div>
          <h2 style={{margin:0}}>내 주문 목록</h2>
          <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
            {/* simplified tabs for a PDF shop */}
            {[
              { key: 'all', label: '전체' },
              { key: 'paid', label: '결제완료' },
              { key: 'pending', label: '결제대기' },
              { key: 'cancelled_refunded', label: '취소/환불' },
              { key: 'failed', label: '실패' }
            ].map(t => {
              // compute counts from orders (may be null while loading)
              const count = orders ? (
                t.key === 'all' ? orders.length : (
                  t.key === 'cancelled_refunded' ? orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length : orders.filter(o => o.status === t.key).length
                )
              ) : 0
              return (
                <button
                  key={t.key}
                  className="btn-light"
                  onClick={()=>setStatusFilter(t.key)}
                  style={{
                    padding: '6px 12px',
                    border: statusFilter === t.key ? '2px solid #7c3aed' : undefined,
                    background: statusFilter === t.key ? '#f5f3ff' : undefined,
                    fontWeight: statusFilter === t.key ? 700 : 500
                  }}
                >
                  {t.label} {count > 0 ? `(${count})` : ''}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-light" onClick={onBack}>돌아가기</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',gap:18}}>
        {orders && orders.length > 0 ? orders
          .filter(o => {
            if (statusFilter === 'all') return true
            if (statusFilter === 'cancelled_refunded') return (o.status === 'cancelled' || o.status === 'refunded')
            return o.status === statusFilter
          })
          .map(o => (
          <div key={o._id} style={{background:'#fff',padding:18,borderRadius:12,boxShadow:'0 8px 24px rgba(2,6,23,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:16,color:'#0f172a'}}>주문번호: {o.orderNumber || o._id}</div>
                <div style={{color:'#6b7280',marginTop:6}}>주문일: {new Date(o.createdAt).toLocaleString()}</div>
                <div style={{color:'#6b7280',marginTop:6}}>상품수: {(o.items && o.items.length) || 0}개</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:900,fontSize:18}}>{o.total ? '₩' + Number(o.total).toLocaleString() : '₩0'}</div>
                <div style={{marginTop:8}}>
                  {/* Korean labels for status badge */}
                  <span style={{display:'inline-block',padding:'6px 10px',borderRadius:20,fontWeight:700,color:'#fff',background: o.status === 'paid' ? '#16a34a' : (o.status === 'pending' ? '#f59e0b' : '#ef4444')}}>
                    {o.status === 'paid' ? '결제완료' : (o.status === 'pending' ? '결제대기' : (o.status === 'cancelled' ? '취소' : (o.status === 'refunded' ? '환불' : (o.status === 'failed' ? '실패' : o.status))))}
                  </span>
                </div>
                <div style={{marginTop:12,display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button className="btn-light" onClick={()=>{ window.dispatchEvent(new CustomEvent('navigate-to-order', { detail: o })) }}>상세보기</button>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div style={{padding:20,color:'#6b7280'}}>주문 내역이 없습니다.</div>
        )}
      </div>
    </div>
  )
}
