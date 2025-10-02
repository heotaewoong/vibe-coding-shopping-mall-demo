import React, { useState, useEffect } from 'react'
import Signup from './Signup'
import Navbar from './Navbar'
import AdminDashboard from './admin/AdminDashboard'
import CartPage from './CartPage'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function App(){
  const [route, setRoute] = useState('home')
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [sessionId] = useState(() => {
    try{ const s = localStorage.getItem('guestSessionId'); if (s) return s; const gen = 'sess-' + Math.random().toString(36).slice(2,10); localStorage.setItem('guestSessionId', gen); return gen } catch(e){ return null }
  })

  const [cartCount, setCartCount] = useState(0)
  // Import Login component
  const Login = React.lazy(() => import('./Login'))
  const ProductDetail = React.lazy(() => import('./ProductDetail'))
  const OrderPage = React.lazy(() => import('./OrderPage'))
  const OrderDetail = React.lazy(() => import('./OrderDetail'))
  const OrdersList = React.lazy(() => import('./OrdersList'))
  const [currentOrder, setCurrentOrder] = useState(null)

  useEffect(()=>{
    // listen for detail navigation events from OrdersList (to avoid prop drilling)
    function onNavigate(e){ const o = e && e.detail; if (o) { setCurrentOrder(o); setRoute('order:detail') } }
    window.addEventListener('navigate-to-order', onNavigate)
    // listen for OrderPage -> OrdersList navigation
    function onNavigateOrders(){ setRoute('orders') }
    window.addEventListener('navigate-to-orders', onNavigateOrders)
    async function fetchMe(){
      setLoadingUser(true)
      const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
      if (!token) { setLoadingUser(false); return }
      try {
        const res = await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok){
          const data = await res.json()
          setUser(data.user)
        } else {
          // token invalid or expired -> clear
          localStorage.removeItem('accessToken')
          setUser(null)
        }
      } catch(e){
        console.warn('Could not fetch /auth/me', e)
        setUser(null)
      } finally {
        setLoadingUser(false)
        // refresh cart count now that we know auth state
        try{ fetchCartCount() } catch(e){}
      }
    }
    fetchMe()
    return ()=> { window.removeEventListener('navigate-to-order', onNavigate); window.removeEventListener('navigate-to-orders', onNavigateOrders) }
  }, [])

  // 사이트 상단에 보여줄 추천 상품(서버에서 가져온 실제 상품을 우선으로 사용)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState(null)

  function formatPrice(v){
    if (v == null || v === '') return '-'
    const n = Number(v)
    if (Number.isNaN(n)) return v
    return '₩' + n.toLocaleString()
  }

  // fallback static cards when server data is not available
  const fallbackFeatured = [
    { id: 'p1', title: 'HeoBrain SEO Guide', author: 'HeoBrain', price: 9990, desc: '실전 SEO 전략과 사례' },
    { id: 'p2', title: 'YouTube Growth Kit', author: 'HeoBrain', price: 14990, desc: '구독자 증가를 위한 체크리스트' },
    { id: 'p3', title: 'PDF 마케팅 플랜', author: 'HeoBrain', price: 7990, desc: 'PDF 상품화 및 판매 전략' }
  ]

  useEffect(()=>{
    let mounted = true
    async function loadFeatured(){
      setProductsLoading(true)
      setProductsError(null)
      try{
        // request first 6 products to display on the home page
        const res = await fetch(`/items?page=1&perPage=6`)
        if (!mounted) return
        if (res.ok){
          const data = await res.json()
          setProducts(Array.isArray(data.items) ? data.items : [])
        } else {
          setProductsError('상품을 불러오지 못했습니다')
        }
      } catch(err){
        console.error('load featured products error', err)
        setProductsError('네트워크 오류')
      } finally {
        if (mounted) setProductsLoading(false)
      }
    }
    loadFeatured()
    return ()=>{ mounted = false }
  }, [])

  // load cart count for badge (uses sessionId when present)
  // helper to load cart count for badge (uses sessionId when present)
  async function fetchCartCount(){
    try{
      // prefer authenticated cart when token exists, else fall back to guest sessionId
      const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
      let res
      if (token){
        res = await fetch('/cart', { headers: { Authorization: `Bearer ${token}` } })
      } else {
        const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
        res = await fetch(`/cart${q}`)
      }
      if (res.ok){
        const data = await res.json()
        const items = (data.cart && Array.isArray(data.cart.items)) ? data.cart.items : []
        const count = items.reduce((s,i)=>s + (Number(i.quantity) || 0), 0)
        setCartCount(count)
      }
    } catch(err){
      console.warn('Could not load cart count', err)
    }
  }

  useEffect(()=>{
    let mounted = true
    // call fetchCartCount but guard against unmounted state
    fetchCartCount()
    return ()=> mounted = false
  }, [route, user])

  return (
    <div className="app-root">
      {/* Navbar now contains greeting and logout dropdown; removed duplicate top-right greeting to avoid overlap */}
      {route === 'home' && (
        <div className="home-page">
          <Navbar
            user={user}
            loadingUser={loadingUser}
            onLogin={()=>setRoute('login')}
            onSignup={()=>setRoute('signup')}
            onLogout={()=>{
              localStorage.removeItem('accessToken');
              // keep guestSessionId so guest cart remains across logout/login cycles
              setUser(null);
              setRoute('home');
              // refresh cart count (will use guestSessionId if not authenticated)
              setTimeout(()=>fetchCartCount(), 50)
            }}
            onAdmin={()=>setRoute('admin')}
            cartCount={cartCount}
            onCart={()=>setRoute('cart')}
            onOrders={()=>setRoute('orders')}
          />

          <section className="hero">
            <div className="hero-inner">
              <h1>HeoBrain의 전문 PDF 컬렉션</h1>
              <p>기획 · 마케팅 · 유튜브 성장 전략을 PDF로 빠르게 학습하세요.</p>
              <div className="hero-actions">
                <input className="search" placeholder="검색어를 입력하세요 (예: SEO, YouTube)" />
                <button className="btn-primary">검색</button>
              </div>
            </div>
          </section>

          <section className="featured">
            <h2>추천 PDF</h2>
            <div className="cards">
              {productsLoading && <div style={{padding:20}}>로딩중...</div>}
              {!productsLoading && (products && products.length > 0 ? (
                products.map(p => (
                  <div key={p._id || p.sku} className="card" style={{cursor:'pointer'}} onClick={()=>setRoute(`product:${p._id || p.sku}`)}>
                    <div className="card-thumb">{p.image ? <img src={p.image} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : 'PDF'}</div>
                    <div className="card-body">
                      <h3>{p.name}</h3>
                      <div className="meta">{p.sku} · {p.category}</div>
                      <p className="desc">{p.description}</p>
                      <div className="card-actions">
                        <button className="btn-light" onClick={(e)=>{ e.stopPropagation(); setRoute(`product:${p._id || p.sku}`) }}>미리보기</button>
                        <button className="btn-primary" onClick={(e)=>{ e.stopPropagation(); /* 구매 로직 연결 예정 */ }}>구매 {formatPrice(p.price)}</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // fallback static cards
                fallbackFeatured.map(p => (
                  <div key={p.id} className="card">
                    <div className="card-thumb">PDF</div>
                    <div className="card-body">
                      <h3>{p.title}</h3>
                      <div className="meta">{p.author} · {formatPrice(p.price)}</div>
                      <p className="desc">{p.desc}</p>
                      <div className="card-actions">
                        <button className="btn-light">미리보기</button>
                        <button className="btn-primary">구매</button>
                      </div>
                    </div>
                  </div>
                ))
              ))}
            </div>
          </section>

          <footer className="site-footer">© {new Date().getFullYear()} HeoBrain</footer>
        </div>
      )}

      {route === 'signup' && (
        <Signup onCancel={()=>setRoute('home')} apiBase={API_BASE} onSigned={()=>setRoute('home')} />
      )}

      {route === 'login' && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Login
            onCancel={()=>setRoute('home')}
            onLogin={(data)=>{ if (data && data.user) setUser(data.user); setRoute('home') }}
            user={user}
            loadingUser={loadingUser}
            onSignup={()=>setRoute('signup')}
          />
        </React.Suspense>
      )}

      {route === 'admin' && (
        <AdminDashboard onBack={()=>setRoute('home')} onOpenProduct={(id)=>setRoute(`product:${id}`)} />
      )}

      {route === 'cart' && (
        <CartPage sessionId={sessionId} onBack={()=>setRoute('home')} onCheckout={()=>setRoute('checkout')} />
      )}

      {route && route.startsWith('product:') && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <ProductDetail id={route.split(':')[1]} onBack={()=>setRoute('home')} sessionId={sessionId} onCartUpdated={fetchCartCount} />
        </React.Suspense>
      )}

      {route === 'checkout' && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <OrderPage sessionId={sessionId} user={user} onBack={()=>setRoute('home')} onOrderCreated={(o)=>{ setCurrentOrder(o); setRoute('order:detail') }} />
        </React.Suspense>
      )}

      {route === 'orders' && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <OrdersList user={user} onBack={()=>setRoute('home')} />
        </React.Suspense>
      )}

      {route === 'order:detail' && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <OrderDetail order={currentOrder} sessionId={sessionId} />
        </React.Suspense>
      )}
    </div>
  )
}
