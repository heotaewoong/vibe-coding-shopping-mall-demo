import React, { useState, useRef, useEffect } from 'react'

export default function Navbar({ user, loadingUser, onLogin, onSignup, onLogout, onAdmin, onOrders, cartCount = 0, onCart }){
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)

  useEffect(()=>{
    function handleDoc(e){
      if (!btnRef.current) return
      if (!btnRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', handleDoc)
    return ()=> document.removeEventListener('click', handleDoc)
  }, [])

  return (
    <header className="site-header">
      <div className="brand">HeoBrain PDF Shop</div>
      <div className="header-actions">
        {loadingUser ? null : (
          user ? (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div ref={btnRef} style={{position:'relative'}}>
                <button aria-expanded={open} aria-haspopup="true" onClick={()=>setOpen(s=>!s)} className="btn-link" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:6}}>
                  <img src={user.avatar || '/default-avatar.png'} alt="avatar" style={{width:28,height:28,borderRadius:14,objectFit:'cover'}}/>
                  <span style={{whiteSpace:'nowrap'}}>{user.name}님 환영합니다.</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{marginLeft:6}} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {open && (
                  <div role="menu" style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:'#fff',border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 8px 24px rgba(0,0,0,0.08)',borderRadius:8,padding:8,minWidth:140,zIndex:60}}>
                    <button role="menuitem" onClick={()=>{ setOpen(false); onOrders && onOrders() }} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 12px',border:'none',background:'transparent',cursor:'pointer'}}>내 주문</button>
                    <button role="menuitem" onClick={()=>{ setOpen(false); onLogout && onLogout() }} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 12px',border:'none',background:'transparent',cursor:'pointer'}}>로그아웃</button>
                    {user.user_type === 'admin' && <button role="menuitem" onClick={()=>{ setOpen(false); onAdmin && onAdmin() }} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 12px',border:'none',background:'transparent',cursor:'pointer'}}>Admin</button>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button className="btn-link" onClick={onLogin}>로그인</button>
          )
        )}
  <button className="btn-primary" onClick={onSignup} style={{marginLeft:12}}>회원가입</button>
  {/* My Orders button */}
  <button className="btn-light" onClick={onOrders} style={{marginLeft:12}}>내 주문</button>

        {/* Cart icon (SVG) */}
        <button className="btn-cart" onClick={onCart} title="장바구니" aria-label="장바구니" style={{marginLeft:12,position:'relative',background:'transparent',border:'none',cursor:'pointer',padding:6}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 3h2l1.68 9.39A2 2 0 0 0 8.63 14h7.72a2 2 0 0 0 1.95-1.61L21 6H6" stroke="#111827" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="10" cy="20" r="1.5" fill="#111827" />
            <circle cx="18" cy="20" r="1.5" fill="#111827" />
          </svg>
          {cartCount > 0 && (
            <span style={{position:'absolute',top:-6,right:-6,minWidth:18,height:18,fontSize:12,display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#ef4444',color:'#fff',borderRadius:12,padding:'0 6px',boxShadow:'0 1px 2px rgba(0,0,0,0.2)'}}>{cartCount}</span>
          )}
        </button>
      </div>
    </header>
  )
}
