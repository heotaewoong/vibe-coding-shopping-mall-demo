import React, { useEffect, useState } from 'react'
import api from './api'

export default function ProductDetail({ id, onBack, sessionId, onCartUpdated }){
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)

  useEffect(()=>{
    if (!id) return
    let mounted = true
    async function load(){
      setLoading(true); setError(null)
      try{
  const res = await fetch(api(`/items/${encodeURIComponent(id)}`))
        if (!mounted) return
        if (res.ok){
          const data = await res.json()
          setItem(data.item || data)
        } else {
          setError('상품을 불러오지 못했습니다.')
        }
      } catch(e){
        console.error(e)
        setError('네트워크 오류 발생')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return ()=>{ mounted = false }
  }, [id])

  if (!id) return null
  if (loading) return <div className="product-detail card-panel">로딩중...</div>
  if (error) return <div className="product-detail card-panel">{error}</div>
  if (!item) return <div className="product-detail card-panel">상품이 없습니다.</div>

  return (
    <div className="product-detail card-panel" style={{maxWidth:980,margin:'24px auto',padding:24}}>
      <div style={{display:'flex',gap:24}}>
        <div style={{flex:'0 0 360px'}}>
          <div style={{width: '100%', height: 360, borderRadius:12, overflow:'hidden', background:'#fafafa', display:'flex',alignItems:'center',justifyContent:'center'}}>
            {item.image ? <img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <div style={{color:'#9ca3af'}}>No image</div>}
          </div>
        </div>
        <div style={{flex:1, position:'relative', paddingBottom:84}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <h2 style={{margin:0}}>{item.name}</h2>
              <div style={{color:'#6b7280',marginTop:6}}>SKU: {item.sku} • {item.category}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:20,fontWeight:800}}>₩{Number(item.price).toLocaleString()}</div>
              <div style={{marginTop:12}}>
                <button className="btn-primary" style={{marginRight:8}}>구매하기</button>
                <button className="btn-light" onClick={onBack}>목록으로</button>
              </div>
            </div>
          </div>

          <div style={{marginTop:18,color:'#374151'}}>
            <h4 style={{marginTop:0}}>상품 설명</h4>
            <p style={{lineHeight:1.7}}>{item.description || '설명 없음'}</p>
          </div>

          <div style={{marginTop:18}}>
            <h4 style={{marginTop:0}}>상세 정보</h4>
            <ul style={{color:'#6b7280'}}>
              <li>카테고리: {item.category}</li>
              <li>SKU: {item.sku}</li>
              <li>재고: {item.qty ?? 'N/A'}</li>
            </ul>
            {addError && <div style={{color:'crimson',marginTop:12}}>{addError}</div>}
          </div>

          {/* Bottom full-width add-to-cart bar */}
          <div style={{position:'absolute',left:0,right:0,bottom:0,display:'flex',justifyContent:'center',padding:16}}>
            <button onClick={async (e)=>{
                e.preventDefault(); setAddError(null)
                try{
                  setAdding(true)
                  const sid = sessionId || (() => { try { return localStorage.getItem('guestSessionId') } catch(e){ return null } })()
                  const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
                  const body = { sessionId: sid, items: [{ itemId: item._id, sku: item.sku, quantity: 1 }] }
                  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                  const res = await fetch(api('/cart'), { method: 'POST', headers, body: JSON.stringify(body) })
                  if (!res.ok){
                    const txt = await res.text()
                    setAddError('장바구니에 추가하지 못했습니다')
                    console.error('Add to cart failed', res.status, txt)
                  } else {
                    if (typeof onCartUpdated === 'function') onCartUpdated()
                  }
                } catch(e){
                  console.error('add to cart error', e)
                  setAddError('네트워크 오류 발생')
                } finally { setAdding(false) }
              }} disabled={adding} style={{
                width:'100%', maxWidth:820, background:'#0f172a', color:'#fff', border:'none', padding:'14px 20px', borderRadius:8, fontWeight:700, boxShadow:'0 6px 18px rgba(15,23,42,0.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:12
              }}>
              <span style={{display:'inline-flex',alignItems:'center',gap:10}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="20" r="1.2" fill="currentColor"/><circle cx="18" cy="20" r="1.2" fill="currentColor"/></svg>
                <span style={{textTransform:'uppercase',letterSpacing:1}}>Add to Bag</span>
                <span style={{marginLeft:8,opacity:0.9}}>-</span>
                <span style={{marginLeft:8}}>₩{Number(item.price).toLocaleString()}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Decorative floating cart icon (bottom-right)
// A small visual flourish appended by the component file for easier maintenance.
