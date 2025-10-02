import React, { useState, useEffect } from 'react'

export default function CartPage({ apiBase = '', sessionId, onBack, onCheckout }){
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      setError(null)
      try{
        const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
        const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
          const res = await fetch(`/cart${q}`, { headers })
        if (!mounted) return
        if (res.ok){
          const data = await res.json()
          setCart(data.cart)
        } else {
          setError('장바구니를 불러오지 못했습니다')
        }
      } catch(err){
        console.error('load cart', err)
        setError('네트워크 오류')
      } finally { if (mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  }, [sessionId])

  if (loading) return <div style={{padding:20}}>로딩중...</div>
  if (error) return <div style={{padding:20,color:'red'}}>{error}</div>
  if (!cart) return <div style={{padding:20}}>장바구니가 비어 있습니다.</div>

  return (
    <div className="cart-page" style={{padding:20}}>
      <div style={{display:'flex',gap:24,alignItems:'flex-start',maxWidth:1100,margin:'0 auto'}}>
        {/* Left: items list */}
        <div style={{flex:1,background:'#fff',padding:20,borderRadius:12,boxShadow:'0 4px 12px rgba(0,0,0,0.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2 style={{margin:0}}>장바구니</h2>
            <button className="btn-light" onClick={onBack}>쇼핑 계속하기</button>
          </div>

          <div style={{marginTop:16}}>
            {cart.items.length === 0 ? (
              <div>장바구니가 비어 있습니다.</div>
            ) : (
              cart.items.map((li, idx) => (
                <div key={idx} style={{display:'flex',alignItems:'center',gap:16,padding:'16px',borderRadius:8,background:'#fafafa',marginBottom:12}}>
                  <div style={{width:96,height:96,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}}>{li.sku || 'PDF'}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:16}}>{li.title}</div>
                    <div style={{color:'#6b7280',marginTop:8}}>SKU: {li.sku}</div>
                    <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                      <button className="btn-light" disabled style={{width:28,height:28}}>−</button>
                      <div>{li.quantity}</div>
                      <button className="btn-light" disabled style={{width:28,height:28}}>+</button>
                      <button onClick={async ()=>{
                        try{
                          const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
                          const sid = sessionId || (() => { try { return localStorage.getItem('guestSessionId') } catch(e){ return null } })()
                          const body = { action: 'remove', itemId: li.item, sku: li.sku, sessionId: sid }
                          const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                          const res = await fetch('/cart/items', { method: 'PATCH', headers, body: JSON.stringify(body) })
                          if (res.ok){
                            const data = await res.json()
                            setCart(data.cart)
                          } else {
                            console.error('Could not remove item from cart', res.status)
                          }
                        } catch(err){ console.error('remove item error', err) }
                      }} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer',marginLeft:12}}>삭제</button>
                    </div>
                  </div>
                  <div style={{width:140,textAlign:'right',fontWeight:800}}>{li.price ? '₩' + Number(li.price).toLocaleString() : '-'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: order summary */}
        <aside style={{width:320,background:'#fff',padding:20,borderRadius:12,boxShadow:'0 4px 12px rgba(0,0,0,0.04)'}}>
          <h3 style={{marginTop:0}}>주문 요약</h3>
          <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280',marginTop:12}}> <div>상품 수량 ({cart.items.reduce((s,i)=>s + (Number(i.quantity)||0),0)}개)</div> <div>₩{cart.total ? Number(cart.total).toLocaleString() : '0'}</div> </div>
          <div style={{display:'flex',justifyContent:'space-between',color:'#10b981',marginTop:8}}> <div>배송비</div> <div>무료</div> </div>
          <div style={{borderTop:'1px solid #eee',marginTop:12,paddingTop:12,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}> <div>총 결제금액</div> <div style={{color:'#ef4444'}}>₩{cart.total ? Number(cart.total).toLocaleString() : '0'}</div> </div>
          <button className="btn-primary" style={{width:'100%',marginTop:16,padding:12}} onClick={() => { try{ if (typeof onCheckout === 'function') return onCheckout() } catch(e){} try{ if (typeof onBack === 'function') onBack() } catch(e){} }}>결제하기</button>
          <button className="btn-light" style={{width:'100%',marginTop:12}}>쇼핑 계속하기</button>
        </aside>
      </div>
    </div>
  )
}
