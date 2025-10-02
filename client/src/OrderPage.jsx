import React, { useState, useEffect } from 'react'
import api from './api'

export default function OrderPage({ sessionId, user, onBack }){
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState(user && user.email ? user.email : '')
  const [buyerName, setBuyerName] = useState((user && user.name) ? user.name : (user && user.email ? String(user.email).split('@')[0] : ''))
  const [buyerTel, setBuyerTel] = useState((user && user.phone) ? user.phone : (localStorage.getItem('buyer_tel') || ''))
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
        const q = token ? '' : (sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch(`/cart${q}`, { headers })
        if (!mounted) return
        if (res.ok){
          const d = await res.json()
          setCart(d.cart)
        } else {
          setError('장바구니를 불러오지 못했습니다')
        }
      } catch(err){
        console.error('order page load error', err)
        setError('네트워크 오류')
      } finally { if (mounted) setLoading(false) }
    }
    load()

    // Ensure Iamport script is loaded; if missing, inject and wait
    async function ensureIamport(){
      try{
        if (typeof window === 'undefined') return
        if (!window.IMP){
          // try to load script dynamically
          await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[src="https://cdn.iamport.kr/v1/iamport.js"]')
            if (existing){
              existing.addEventListener('load', () => resolve())
              existing.addEventListener('error', () => reject(new Error('iamport script failed to load')))
              return
            }
            const s = document.createElement('script')
            s.src = 'https://cdn.iamport.kr/v1/iamport.js'
            s.async = true
            s.onload = () => resolve()
            s.onerror = () => reject(new Error('iamport script failed to load'))
            document.head.appendChild(s)
          })
        }
        // init if available
        if (window.IMP && typeof window.IMP.init === 'function'){
          window.IMP.init('imp70440525')
          setImpReady(true)
        }
      } catch(e){
        console.warn('ensureIamport failed', e)
        setImpError(String(e && e.message ? e.message : e))
        setImpReady(false)
      }
    }
    ensureIamport()
    return ()=> mounted = false
  }, [sessionId, user])

  const [impReady, setImpReady] = useState(false)
  const [impError, setImpError] = useState(null)

  function formatPrice(v){ if (v == null) return '-'; const n = Number(v); if (Number.isNaN(n)) return v; return '₩' + n.toLocaleString() }

  async function handleSubmit(){
    if (!cart || !cart.items || cart.items.length === 0) return setError('장바구니에 상품이 없습니다')
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('유효한 이메일을 입력하세요')
    // require phone for non-bank (gateway) payments like KG 이니시스
    if (paymentMethod !== 'bank' && (!buyerTel || !/^[0-9\-\s]{9,13}$/.test(buyerTel))) return setError('유효한 전화번호를 입력하세요')
    setSubmitting(true)
    setError(null)
    try{
      const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
      // If IMP is available and payment method is not bank transfer, use IMP.request_pay
      const providerMap = { bank: 'bank-transfer', card: 'card', kakao: 'kakaopay', naver: 'naverpay' }
      let paymentPayload = { method: paymentMethod, provider: providerMap[paymentMethod] || 'manual', amount: cart.total || 0, currency: cart.currency || 'KRW', status: 'pending' }

      const useImp = (paymentMethod !== 'bank') && window && window.IMP && typeof window.IMP.request_pay === 'function'
      if (useImp){
        try{
          // build imp request params
          const impParams = {
            pg: paymentMethod === 'card' ? 'html5_inicis' : (paymentMethod === 'kakao' ? 'kakaopay' : (paymentMethod === 'naver' ? 'naverpay' : 'html5_inicis')),
            pay_method: paymentMethod === 'card' ? 'card' : 'card',
            merchant_uid: `mid_${Date.now()}`,
            name: cart.items.length > 0 ? cart.items[0].title || 'PDF 상품' : 'PDF 상품',
            amount: cart.total || 0,
            buyer_email: email,
            // use the controlled inputs so user-supplied phone/name are used
            buyer_name: buyerName || ((user && user.name) ? user.name : (email ? String(email).split('@')[0] : '구매자')),
            buyer_tel: buyerTel || (user && user.phone) || (localStorage.getItem('buyer_tel') || '')
          }

          await new Promise((resolve, reject) => {
            window.IMP.request_pay(impParams, function(rsp){
              // 로그를 자세히 남기고, Iamport가 제공하는 error_msg를 사용자에게 보여줍니다.
              console.log('IMP callback rsp', rsp)
              // 브라우저 콘솔에서 실행 (디버깅용)
              // 최근 콜백이 찍힌 변수명이 없다면, request_pay 직후 콘솔에 찍힌 로그를 펼쳐서 복사
              // 또는 request_pay 콜백 내부에 아래 한 줄 추가해서 에러를 명확히 볼 수 있게 합니다.
              console.log('IMP full rsp', JSON.stringify(rsp, null, 2));
              if (rsp && rsp.success){
                paymentPayload.status = 'succeeded'
                paymentPayload.transactionId = rsp.imp_uid || rsp.merchant_uid
                resolve(rsp)
              } else {
                // Iamport 응답에 에러 메시지가 있다면 사용자에게 보여줍니다.
                try{ const msg = rsp && (rsp.error_msg || rsp.msg || rsp.message); if (msg) setError('결제 실패: ' + msg) } catch(e){}
                reject(rsp)
              }
            })
          })
        } catch(err){
          console.error('IMP payment failed or cancelled', err)
          setError('결제가 취소되었거나 실패했습니다')
          setSubmitting(false)
          return
        }
      } else {
        // fallback: simulate immediate success for non-bank methods
        if (paymentMethod !== 'bank') paymentPayload.status = 'succeeded'
      }

      const payload = {
        email,
        items: cart.items.map(i => ({ item: i.item, sku: i.sku, quantity: i.quantity })),
        sessionId: cart.sessionId || sessionId || null,
        payment: paymentPayload
      }
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const res = await fetch(api('/orders'), { method: 'POST', headers, body: JSON.stringify(payload) })
      if (res.ok){
        const data = await res.json()
        let created = data.order

        // If payment was attempted via IMP and returned a transactionId, verify it server-side
        if (paymentPayload.status === 'succeeded' && paymentPayload.transactionId && created && created._id){
          try{
            const verRes = await fetch(`/orders/${created._id}/verify`, {
              method: 'POST', headers, body: JSON.stringify({ imp_uid: paymentPayload.transactionId })
            })
            if (verRes.ok){
              const vd = await verRes.json().catch(()=>null)
              if (vd && vd.order) created = vd.order
            }
          } catch(ve){ console.warn('verification call failed', ve) }
        }

        setOrder(created)
  // persist buyer phone locally for next time if provided
  try{ if (buyerTel) localStorage.setItem('buyer_tel', buyerTel) } catch(e){}
        // call optional callback so parent can navigate to order detail or update UI
        try{ if (typeof onOrderCreated === 'function') onOrderCreated(created) } catch(e){}

        // notify user
        if (created && created.orderNumber){
          if (created.status === 'paid'){
            alert('결제가 완료되어 다운로드가 가능합니다. 주문번호: ' + created.orderNumber)
          } else {
            alert('주문이 접수되었습니다. 결제 확인 후 다운로드가 가능합니다. 주문번호: ' + created.orderNumber)
          }
        }

        // attempt to clear cart client-side: call DELETE /cart/:id when we have an id
        try{
          if (cart && cart._id){
            await fetch(`/cart/${cart._id}`, { method: 'DELETE', headers })
          } else {
            // no cart id available (guest cart may be session based) - skip clearing here
            // Future: implement DELETE /cart that accepts sessionId to abandon guest cart
          }
        } catch(e){}
      } else {
        const d = await res.json().catch(()=>null)
        setError((d && d.message) || '주문 생성 실패')
      }
    } catch(err){
      console.error('submit order error', err)
      setError('네트워크 오류')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div style={{padding:20}}>로딩중...</div>
  if (error) return <div style={{padding:20,color:'red'}}>{error}</div>

  return (
    <div style={{padding:20,maxWidth:980,margin:'0 auto'}}>
      <div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
        <main style={{flex:1,background:'#fff',padding:24,borderRadius:12,boxShadow:'0 6px 18px rgba(0,0,0,0.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2 style={{margin:0}}>결제 정보</h2>
            <button className="btn-light" onClick={onBack}>취소</button>
          </div>

          <section style={{marginTop:18}}>
            <label style={{display:'block',fontWeight:600}}>이메일</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #e5e7eb',marginTop:8}} />
            <div style={{display:'flex',gap:12,marginTop:12}}>
              <div style={{flex:1}}>
                <label style={{display:'block',fontWeight:600}}>이름</label>
                <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="홍길동" style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #e5e7eb',marginTop:8}} />
              </div>
              <div style={{width:180}}>
                <label style={{display:'block',fontWeight:600}}>전화번호</label>
                <input value={buyerTel} onChange={e=>setBuyerTel(e.target.value)} placeholder="01012345678" style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #e5e7eb',marginTop:8}} />
              </div>
            </div>
            <p style={{color:'#6b7280',marginTop:8}}>PDF 파일은 결제 완료 후 다운로드 또는 이메일로 제공됩니다.</p>
          </section>

          <section style={{marginTop:18}}>
            <label style={{display:'block',fontWeight:600,marginBottom:8}}>결제 수단</label>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {[
                { key: 'card', label: '신용카드', icon: (<svg width="28" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="4" width="22" height="14" rx="2" stroke="#6b7280" strokeWidth="1.2"/><rect x="3" y="8" width="6" height="2" rx="0.5" fill="#6b7280"/></svg>) },
                { key: 'bank', label: '계좌이체', icon: (<svg width="28" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="6" rx="1" stroke="#6b7280" strokeWidth="1.2"/><path d="M3 16h18v2H3z" stroke="#6b7280" strokeWidth="1.2"/></svg>) },
                { key: 'kakao', label: '카카오페이', icon: (<svg width="28" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="10" r="6" stroke="#6b7280" strokeWidth="1.2"/><path d="M8 15c1.2 0 2 1 4 1s2.8-1 4-1" stroke="#6b7280" strokeWidth="1.2"/></svg>) },
                { key: 'naver', label: '네이버페이', icon: (<svg width="28" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="14" rx="2" stroke="#6b7280" strokeWidth="1.2"/><path d="M6 8h12" stroke="#6b7280" strokeWidth="1.2"/></svg>) }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPaymentMethod(opt.key)}
                  onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPaymentMethod(opt.key) } }}
                  aria-pressed={paymentMethod === opt.key}
                  style={{
                    display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:10,border: paymentMethod===opt.key ? '2px solid #7c3aed' : '1px solid #e6e9ee',background: paymentMethod===opt.key ? '#f5f3ff' : '#fff',cursor:'pointer',minWidth:140,justifyContent:'flex-start'
                  }}
                >
                  <div style={{width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,background: paymentMethod===opt.key ? '#7c3aed' : '#f3f4f6',color: paymentMethod===opt.key ? '#fff' : '#111'}}>
                    {opt.icon}
                  </div>
                  <div style={{textAlign:'left'}}>
                    <div style={{fontWeight:700}}>{opt.label}</div>
                    <div style={{fontSize:12,color:'#6b7280'}}>간편하고 빠른 결제</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section style={{marginTop:22}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{margin:0}}>주문 내역</h3>
                <button className="btn-light" onClick={()=> window.dispatchEvent(new CustomEvent('navigate-to-orders'))}>주문 목록 보기</button>
              </div>
            <div style={{borderRadius:8,overflow:'hidden',border:'1px solid #f3f4f6'}}>
              {cart && cart.items && cart.items.length > 0 ? cart.items.map((it,idx)=> (
                <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,background: idx%2===0 ? '#fff' : '#fafafa'}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:56,height:56,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6}}>{it.sku || 'PDF'}</div>
                    <div>
                      <div style={{fontWeight:700}}>{it.title || it.name || 'PDF 상품'}</div>
                      <div style={{color:'#6b7280',marginTop:6}}>수량: {it.quantity}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                    <div style={{fontWeight:800}}>{it.price ? formatPrice(it.price) : '-'}</div>
                    {/* show download only when order exists and is paid */}
                    {order && order.status === 'paid' && it.item && (
                      <button className="btn-light" onClick={async ()=>{
                        try{
                          const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
                          const sid = sessionId || (() => { try { return localStorage.getItem('guestSessionId') } catch(e){ return null } })()
                          const url = `/items/${it.item}/download${token ? '' : `?sessionId=${encodeURIComponent(sid||'')}`}`
                          window.open(url, '_blank')
                        } catch(e){ console.error('download click', e) }
                      }}>다운로드</button>
                    )}
                    {order && order.status !== 'paid' && (
                      <div style={{color:'#6b7280',fontSize:13}}>결제 완료 후 다운로드 가능</div>
                    )}
                  </div>
                </div>
              )) : (<div style={{padding:12}}>장바구니가 비어 있습니다.</div>)}
            </div>
          </section>
        </main>

        <aside style={{width:320,background:'#fff',padding:20,borderRadius:12,boxShadow:'0 6px 18px rgba(0,0,0,0.04)'}}>
          <h3 style={{marginTop:0}}>주문 요약</h3>
          <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280',marginTop:12}}> <div>상품 수량</div> <div>{cart ? cart.items.reduce((s,i)=>s + (Number(i.quantity)||0),0) : 0}개</div> </div>
          <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280',marginTop:8}}> <div>소계</div> <div>{cart ? formatPrice(cart.total) : formatPrice(0)}</div> </div>
          <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280',marginTop:8}}> <div>배송</div> <div>무료</div> </div>
          <div style={{borderTop:'1px solid #eee',marginTop:12,paddingTop:12,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}> <div>총 결제금액</div> <div style={{color:'#ef4444'}}>{cart ? formatPrice(cart.total) : formatPrice(0)}</div> </div>
          {/* IMP 상태 표시 */}
          {impError && <div style={{color:'#b91c1c',marginTop:8}}>IMP 로드 오류: {impError}</div>}
          {!impError && !impReady && <div style={{color:'#92400e',marginTop:8}}>결제 스크립트 로딩 중 또는 사용 불가 — 잠시 후 다시 시도해주세요.</div>}
          <button className="btn-primary" disabled={submitting || (!!impError)} onClick={handleSubmit} style={{width:'100%',marginTop:16,padding:12}}>{submitting ? '처리중...' : '결제 진행'}</button>
          <button className="btn-light" onClick={onBack} style={{width:'100%',marginTop:12}}>돌아가기</button>
        </aside>
      </div>
    </div>
  )
}

function formatPrice(v){ if (v == null) return '-'; const n = Number(v); if (Number.isNaN(n)) return v; return '₩' + n.toLocaleString() }
