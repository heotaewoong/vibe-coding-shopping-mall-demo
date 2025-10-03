import React, { useState, useEffect } from 'react'
import AdminProductForm from './AdminProductForm'
import AdminOrders from './AdminOrders'
import api from '../api'

export default function AdminDashboard({ onBack, onOpenProduct }){
	const [view, setView] = useState('home')
	const [items, setItems] = useState([])

	// admin auth guard
	const [adminUser, setAdminUser] = useState(null)
	const [adminLoading, setAdminLoading] = useState(true)
	const [adminError, setAdminError] = useState(null)

	// mock stats and recent orders for the dashboard UI
	const stats = [
		{ id: 's1', label: '총 주문', value: '1,234', change: '+12% from last month' },
		{ id: 's2', label: '총 상품', value: '156', change: '+3% from last month' },
		{ id: 's3', label: '총 고객', value: '2,345', change: '+8% from last month' },
		{ id: 's4', label: '총 매출', value: '$45,678', change: '+15% from last month' }
	]

	const quickActions = [
		{ id: 'a1', label: '새 상품 등록', action: ()=>setView('create') },
		{ id: 'a5', label: '상품 관리', action: ()=>setView('products') },
		{ id: 'a2', label: '주문 관리', action: ()=>setView('orders') },
		{ id: 'a3', label: '매출 분석' },
		{ id: 'a4', label: '고객 관리' }
	]

	// verify admin on mount
	useEffect(()=>{
		let mounted = true
		async function checkAdmin(){
			setAdminLoading(true)
			setAdminError(null)
			try{
				const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
				if (!token) {
					if (mounted) {
						setAdminError('관리자 권한이 필요합니다. 로그인 후 관리자 계정으로 접속하세요.')
						setAdminLoading(false)
					}
					return
				}
				const res = await fetch(api('/auth/me'), { headers: { Authorization: `Bearer ${token}` } })
				if (!mounted) return
				if (!res.ok){
					setAdminError('관리자 권한이 필요합니다.')
					setAdminLoading(false)
					return
				}
				const d = await res.json().catch(()=>null)
				if (!d || !d.user) {
					setAdminError('관리자 전용 페이지입니다.')
					setAdminLoading(false)
					return
				}
				// Check both role (new) and user_type (legacy) fields
				const userRole = d.user.role || d.user.user_type
				if (userRole !== 'admin'){
					setAdminError('관리자 전용 페이지입니다.')
					setAdminLoading(false)
					return
				}
				setAdminUser(d.user)
				setAdminLoading(false)
			} catch(err){
				console.error('admin check error', err)
				if (mounted) { setAdminError('인증 중 오류가 발생했습니다'); setAdminLoading(false) }
			}
		}
		checkAdmin()
		return ()=> mounted = false
	}, [])

	const recentOrders = [
		{ id: 'ORD-001234', name: '김민수', date: '2024-12-30', price: '$219' },
		{ id: 'ORD-001233', name: '이영희', date: '2024-12-29', price: '$156' },
		{ id: 'ORD-001232', name: '박철수', date: '2024-12-28', price: '$97' }
	]

	async function handleCreated(newItem){
		try{
			const created = newItem && (newItem.item || newItem)
			if (created && (created._id || created.sku)) {
				try{
					const qParam = encodeURIComponent(search || '')
					const res = await fetch(api(`/items?page=1&perPage=${perPage}${qParam ? `&q=${qParam}` : ''}`))
					if (res.ok){
						const data = await res.json()
						setItems(Array.isArray(data.items) ? data.items : [])
						setTotalProducts(typeof data.total === 'number' ? data.total : 0)
					}
				} catch(e){ /* ignore reload errors */ }
				if (typeof onOpenProduct === 'function'){
					const idToOpen = created._id || created.sku
					onOpenProduct(idToOpen)
					return
				}
			}
		} catch(e){ /* ignore shape issues */ }
		setPage(1)
		setView('products')
	}

	// Products view state
	const [loadingProducts, setLoadingProducts] = useState(false)
	const [productsError, setProductsError] = useState(null)
	const [search, setSearch] = useState('')
	const [page, setPage] = useState(1)
	const perPage = 2 // show 2 items per page as requested
	const [totalProducts, setTotalProducts] = useState(0)

	// local detail modal state (fallback if routing isn't available)
	const [detailId, setDetailId] = useState(null)
	const [detailItem, setDetailItem] = useState(null)
	const [detailLoading, setDetailLoading] = useState(false)
	const [detailError, setDetailError] = useState(null)

	async function openLocalDetail(id){
		if (!id) return
		setDetailId(id)
		setDetailLoading(true)
		setDetailError(null)
		try{
			const res = await fetch(api(`/items/${encodeURIComponent(id)}`))
			if (res.ok){
				const data = await res.json()
				setDetailItem(data.item || data)
			} else {
				setDetailError('상품을 불러오지 못했습니다.')
			}
		} catch(e){
			console.error('openLocalDetail error', e)
			setDetailError('네트워크 오류')
		} finally {
			setDetailLoading(false)
		}
	}

	function formatPrice(v){
		if (v == null || v === '') return '-'
		const n = Number(v)
		if (Number.isNaN(n)) return v
		return '₩' + n.toLocaleString()
	}

	useEffect(()=>{
		if (view !== 'products') return
		let mounted = true
		// reset search and page when entering products view
		setSearch('')
		setPage(1)
		async function load(){
			setLoadingProducts(true)
			setProductsError(null)
			try{
				const qParam = encodeURIComponent(search || '')
				const res = await fetch(api(`/items?page=1&perPage=${perPage}${qParam ? `&q=${qParam}` : ''}`))
				if (!mounted) return
				if (res.ok){
					const data = await res.json()
					// server returns { items, total }
					setItems(Array.isArray(data.items) ? data.items : [])
					setTotalProducts(typeof data.total === 'number' ? data.total : 0)
					setProductsError(null)
				} else {
					console.error('Failed to load items', res.status)
					setProductsError('상품 목록을 불러오지 못했습니다.')
				}
			} catch(err){
				console.error('load items error', err)
				setProductsError('네트워크 오류로 상품을 불러올 수 없습니다.')
			} finally {
				if (mounted) setLoadingProducts(false)
			}
		}
		load()
		return ()=>{ mounted = false }
	}, [view, search])

	function filteredItems(){
		const q = String(search || '').trim().toLowerCase()
		// when using server-side pagination we don't filter client-side here
		return items
	}

	// load page when page changes
	useEffect(()=>{
		if (view !== 'products') return
		let mounted = true
		async function loadPage(){
			setLoadingProducts(true)
			try{
				const qParam = encodeURIComponent(search || '')
				const res = await fetch(api(`/items?page=${page}&perPage=${perPage}${qParam ? `&q=${qParam}` : ''}`))
				if (!mounted) return
				if (res.ok){
					const data = await res.json()
					setItems(Array.isArray(data.items) ? data.items : [])
					setTotalProducts(typeof data.total === 'number' ? data.total : 0)
				} else {
					console.error('Failed to load page', res.status)
					setProductsError('상품 목록을 불러오지 못했습니다.')
				}
			} catch(err){
				console.error('load page error', err)
				setProductsError('네트워크 오류로 상품을 불러올 수 없습니다.')
			} finally {
				if (mounted) setLoadingProducts(false)
			}
		}
		loadPage()
		return ()=>{ mounted = false }
	}, [page])

	async function handleDelete(id){
		if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return
		try{
			const res = await fetch(api(`/items/${id}`), { method: 'DELETE' })
			if (res.ok){
				setItems(prev => prev.filter(i => String(i._id || i.sku) !== String(id)))
				setTotalProducts(tp => Math.max(0, tp - 1))
			} else {
				const data = await res.json().catch(()=>null)
				alert((data && data.message) ? data.message : '삭제에 실패했습니다')
			}
		} catch(err){
			console.error('delete error', err)
			alert('삭제 중 오류가 발생했습니다')
		}
	}

	if (view === 'create'){
		return <div className="admin-dashboard"><AdminProductForm onCancel={()=>setView('home')} onCreated={handleCreated} /></div>
	}

	// show admin auth state
	if (adminLoading) return <div style={{padding:40}}>관리자 인증 확인 중...</div>
	if (adminError) return (
		<div style={{padding:40}}>
			<div style={{color:'red',marginBottom:12}}>{adminError}</div>
			<button className="btn-primary" onClick={()=>{ window.location.href = '/'; }}>메인으로</button>
		</div>
	)

	if (view === 'products'){
		const pageItems = items
		const pages = Math.max(1, Math.ceil(totalProducts / perPage))
		return (
			<div className="admin-dashboard">
				<div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
					<h2>상품 관리 페이지</h2>
					<div style={{display:'flex',gap:8}}>
						<input placeholder="상품명 또는 SKU로 검색" value={search} onChange={e=>setSearch(e.target.value)} style={{padding:10,borderRadius:8,border:'1px solid #eee',width:320}} />
						<button className="btn-primary" onClick={()=>setView('create')}>상품 등록하기</button>
					</div>
				</div>

				<div className="card-panel" style={{overflowX:'auto'}}>
					{/* header row */}
					<div style={{display:'flex',padding:'8px 16px',alignItems:'center',borderBottom:'1px solid #eee',fontSize:13,color:'#6b7280'}}>
						<div style={{width:80}}>이미지</div>
						<div style={{flex:1}}>상품 정보</div>
						<div style={{width:120}}>카테고리</div>
						<div style={{width:140,textAlign:'right'}}>가격</div>
						<div style={{width:80,textAlign:'right'}}>액션</div>
					</div>

					{/* list rows */}
					<div>
						{pageItems.map(it => (
							<div key={it._id || it.sku} style={{display:'flex',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #f3f4f6',cursor:'pointer'}} onClick={(e)=>{ if (e.target.closest('button')) return; const id = it._id || it.sku; if (typeof onOpenProduct === 'function') { onOpenProduct(id); } else { openLocalDetail(id); } }} onKeyDown={(e)=>{ if (e.key === 'Enter') { const id = it._id || it.sku; if (typeof onOpenProduct === 'function') { onOpenProduct(id); } else { openLocalDetail(id); } } }} tabIndex={0} role="button">
								<div style={{width:80,display:'flex',justifyContent:'center'}}>
									{it.image ? (
										<img src={it.image} alt="thumb" style={{width:64,height:64,objectFit:'cover',borderRadius:8}} />
									) : (
										<div style={{width:64,height:64,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af'}}>no image</div>
									)}
								</div>
								<div style={{flex:1,padding:'0 12px'}}>
									<div style={{fontSize:16,fontWeight:700,color:'#111827'}}>{it.name}</div>
									<div style={{fontSize:13,color:'#6b7280',marginTop:6}}>SKU: {it.sku}</div>
									{it.description ? <div style={{marginTop:8,color:'#6b7280',fontSize:13,maxWidth:600}}>{it.description}</div> : null}
								</div>
								<div style={{width:120,color:'#6b7280'}}>{it.category}</div>
								<div style={{width:140,textAlign:'right',fontWeight:800,fontSize:16}}>{formatPrice(it.price)}</div>
								<div style={{width:80,display:'flex',justifyContent:'flex-end',gap:8}}>
									<button className="btn-light" title="수정" onClick={(e)=>{ e.stopPropagation(); /* TODO: open edit */ }}>✏️</button>
									<button className="btn-light" title="삭제" onClick={(e)=>{ e.stopPropagation(); handleDelete(it._id || it.sku) }}>🗑️</button>
								</div>
							</div>
						))}
					</div>
				</div>

				<div style={{display:'flex',justifyContent:'center',marginTop:12,gap:8,alignItems:'center'}}>
					<button className="btn-light" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1 || loadingProducts}>{'<'}</button>
					<div style={{padding:'8px 12px',background:'#fff',borderRadius:8}}>{page} / {pages}</div>
					<button className="btn-light" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page>=pages || loadingProducts}>{'>'}</button>
				</div>

				{/* Detail modal fallback */}
				{detailId && (
					<div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60}} onClick={()=>{ setDetailId(null); setDetailItem(null); setDetailError(null) }}>
						<div className="modal" style={{background:'#fff',borderRadius:12,width:'90%',maxWidth:980,padding:20}} onClick={(e)=>e.stopPropagation()}>
							<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
								<h3 style={{margin:0}}>{detailItem ? detailItem.name : '상품 상세'}</h3>
								<button className="btn-light" onClick={()=>{ setDetailId(null); setDetailItem(null); setDetailError(null) }}>닫기</button>
							</div>
							{detailLoading ? <div style={{padding:20}}>로딩중...</div> : (
								<div style={{display:'flex',gap:20,marginTop:12}}>
									<div style={{flex:'0 0 320px'}}>
										{detailItem && detailItem.image ? <img src={detailItem.image} alt={detailItem.name} style={{width:'100%',height:280,objectFit:'cover',borderRadius:8}} /> : <div style={{width:'100%',height:280,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af'}}>이미지 없음</div>}
									</div>
									<div style={{flex:1}}>
										<div style={{fontSize:20,fontWeight:800}}>{detailItem ? detailItem.name : ''}</div>
										<div style={{color:'#6b7280',marginTop:6}}>SKU: {detailItem ? detailItem.sku : ''} • {detailItem ? detailItem.category : ''}</div>
										<div style={{marginTop:12,fontSize:18,fontWeight:700}}>₩{detailItem && detailItem.price ? Number(detailItem.price).toLocaleString() : '-'}</div>
										<div style={{marginTop:14,color:'#374151'}}>{detailItem ? detailItem.description : ''}</div>
									</div>
								</div>
							)}
							{detailError && <div style={{color:'red',marginTop:12}}>{detailError}</div>}
						</div>
					</div>
				)}
			</div>
		)
	}

	if (view === 'orders'){
		return <div className="admin-dashboard"><AdminOrders onBack={()=>setView('home')} /></div>
	}

	return (
		<div className="admin-dashboard">
			<div className="admin-header">
				<div>
					<h2>관리자 대시보드</h2>
					<p className="muted">CIDER 쇼핑몰 관리 시스템에 오신 것을 환영합니다.</p>
				</div>
				<div>
					<button className="btn-light" onClick={onBack}>뒤로가기</button>
				</div>
			</div>

			<div className="stats-grid">
				{stats.map(s => (
					<div key={s.id} className="stat-card">
						<div className="stat-label">{s.label}</div>
						<div className="stat-value">{s.value}</div>
						<div className="stat-change">{s.change}</div>
					</div>
				))}
			</div>

			<div className="dashboard-main">
				<div className="quick-actions card-panel">
					<h3>빠른 작업</h3>
					<div className="actions-list">
						{quickActions.map(a => (
							<button key={a.id} className="quick-action" onClick={a.action}>{a.label}</button>
						))}
					</div>
				</div>

				<div className="recent-orders card-panel">
					<div className="panel-header">
						<h3>최근 주문</h3>
						<a className="view-all" href="#">전체보기</a>
					</div>
					<div className="orders-list">
						{recentOrders.map(o => (
							<div key={o.id} className="order-row">
								<div className="order-id">{o.id}</div>
								<div className="order-meta">
									<div className="order-name">{o.name}</div>
									<div className="order-date muted">{o.date}</div>
								</div>
								<div className="order-price">{o.price}</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}