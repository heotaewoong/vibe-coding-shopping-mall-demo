import React from 'react'

export default function OrderDetail({ order, onBack, sessionId }) {
  if (!order) return (
    <div style={{ padding: 28, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}>
      주문 정보를 찾을 수 없습니다.
    </div>
  )

  const paid = String(order.status || '').toLowerCase() === 'paid'
  const accent = paid ? '#16a34a' : '#ef4444'
  const formatPrice = (v) => v ? '₩' + Number(v).toLocaleString() : '₩0'

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', maxWidth: 1100, margin: '36px auto', padding: '0 20px' }}>
      <header style={{ textAlign: 'center', padding: '36px 20px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>{paid ? '주문 완료' : '주문 정보'}</h1>
        <p style={{ color: '#6b7280' }}>{paid ? '결제가 완료되었습니다.' : '결제 상태를 확인하세요.'}</p>
      </header>

      <main style={{ background: '#fff', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h3>주문번호: {order.orderNumber || order._id}</h3>
            <div>주문일: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>

            <div style={{ marginTop: 12 }}>
              {(order.items || []).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>{it.title || it.name || it.sku}</div>
                  <div>{it.quantity || 1} × {it.price ? '₩' + Number(it.price).toLocaleString() : '₩0'}</div>
                </div>
              ))}
            </div>
          </div>

          <aside style={{ width: 280 }}>
            <div style={{ padding: 12, border: '1px solid #e6e9ee', borderRadius: 8 }}>
              <div style={{ marginBottom: 8 }}>결제 상태</div>
              <div style={{ fontWeight: 700, color: accent }}>{paid ? '결제 완료' : (order.status || '미결제')}</div>

              <div style={{ marginTop: 12 }}>
                <div>총계</div>
                <div style={{ fontWeight: 800 }}>{formatPrice(order.total)}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                {paid ? (
                  <a href={`/orders/${order._id}`} style={{ display: 'inline-block', padding: '8px 12px', background: '#111827', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>주문 상세 보기</a>
                ) : (
                  <button onClick={onBack} style={{ padding: '8px 12px' }}>결제 재시도</button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
