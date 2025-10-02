import React from 'react'

export default function OrderDetail({ order, onBack, sessionId }){
  if (!order) return (<div style={{padding:28,fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}}>주문 정보를 찾을 수 없습니다.</div>)

  const paid = order.status === 'paid'
  const accent = paid ? '#16a34a' : '#ef4444'

  return (
    <div style={{fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',maxWidth:1100,margin:'36px auto',padding:'0 20px'}}>
      {/* Hero */}
      <header style={{textAlign:'center',padding:'36px 20px 8px'}}>
        <div style={{display:'inline-block',width:110,height:110,borderRadius:60,background: paid ? 'rgba(16,163,74,0.08)' : 'rgba(239,68,68,0.06)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18}}>
          {paid ? (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v4" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 17v.01" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <h1 style={{margin:0,fontSize:30,fontWeight:800,color:'#0f172a'}}>{paid ? '주문이 성공적으로 완료되었습니다!' : '주문 처리에 문제가 발생했습니다'}</h1>
        <p style={{marginTop:10,color:'#475569',fontSize:15}}>{paid ? '결제가 정상적으로 완료되었습니다. 주문 확인 이메일을 곧 받으실 수 있습니다.' : '결제가 실패했거나 확인이 필요합니다. 결제 상태를 확인하거나 재시도해주세요.'}</p>
      </header>

      {/* Card */}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 12px 30px rgba(2,6,23,0.06)',overflow:'hidden',marginTop:20}}>
        <div style={{display:'flex',gap:0,minHeight:200}}>
          {/* Left: items */}
          <section style={{flex:1,padding:22,borderRight:'1px solid #f1f5f9'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:56,height:56,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,fontWeight:700,color:'#0f172a'}}>📄</div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>주문 정보</div>
                  <div style={{fontSize:13,color:'#6b7280',marginTop:6}}>주문번호: <span style={{fontWeight:700,color:'#0f172a'}}>{order.orderNumber || order._id}</span></div>
                </div>
              </div>
              <div style={{textAlign:'right',color:'#6b7280'}}>
                <div style={{fontSize:13}}>주문 날짜</div>
                <div style={{fontWeight:700,color:'#0f172a',marginTop:6}}>{new Date(order.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div style={{borderRadius:10,overflow:'hidden',border:'1px solid #f1f5f9'}}>
              {Array.isArray(order.items) && order.items.length > 0 ? order.items.map((it, idx) => (
                <div key={idx} style={{display:'flex',alignItems:'center',gap:14,padding:14,background: idx%2===0 ? '#fff' : '#fbfdff'}}>
                  <div style={{width:84,height:84,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#0f172a'}}>{it.sku || 'PDF'}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,color:'#0f172a'}}>{it.title || it.name || (it.sku || 'PDF 상품')}</div>
                    <div style={{fontSize:13,color:'#6b7280',marginTop:6}}>수량 {it.quantity}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:800}}>{it.price ? '₩' + Number(it.price).toLocaleString() : '-'}</div>
                    {paid ? (
                      <a href={`/items/${it.item}/download${order.user ? '' : `?sessionId=${encodeURIComponent(order.sessionId||sessionId||'')}`}`} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:8,padding:'8px 12px',background:'#111827',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13}}>다운로드</a>
                    ) : (
                      <div style={{marginTop:8,fontSize:13,color:'#6b7280'}}>결제 후 다운로드 가능</div>
                    )}
                  </div>
                </div>
              )) : (<div style={{padding:18,color:'#6b7280'}}>주문된 항목이 없습니다.</div>)}
            </div>
          </section>

          {/* Right: summary */}
          <aside style={{width:360,padding:22,display:'flex',flexDirection:'column',gap:16}}>
            <div style={{background:'#fff',padding:14,borderRadius:10,border:'1px solid #f1f5f9'}}>
              <div style={{fontSize:13,color:'#6b7280'}}>결제 상태</div>
              <div style={{marginTop:8,display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:12,height:12,borderRadius:6,background: paid ? '#16a34a' : '#ef4444'}}></div>
                <div style={{fontWeight:800,color:'#0f172a'}}>{paid ? '결제 완료' : (order.status || '미결제')}</div>
              </div>
            </div>

            <div style={{background:'#fff',padding:14,borderRadius:10,border:'1px solid #f1f5f9'}}>
              <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280'}}><div>상품 합계</div><div style={{fontWeight:800}}>{order.total ? '₩' + Number(order.total).toLocaleString() : '₩0'}</div></div>
              <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280',marginTop:8}}><div>세금</div><div style={{fontWeight:800}}>₩{order.tax || 0}</div></div>
              <div style={{borderTop:'1px solid #f1f5f9',marginTop:12,paddingTop:12,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}> <div>총 결제금액</div> <div style={{color:accent}}>{order.total ? '₩' + Number(order.total).toLocaleString() : '₩0'}</div> </div>
            </div>

            <div style={{marginTop:8}}>
              {paid ? (
                <div style={{display:'flex',gap:8}}>
                  <a href={`/orders/${order._id}`} style={{flex:1,display:'block',textAlign:'center',padding:'12px 14px',background:'#0f172a',color:'#fff',borderRadius:10,textDecoration:'none',fontWeight:800}}>주문 상세 보기</a>
                  <button onClick={()=> window.dispatchEvent(new CustomEvent('navigate-to-orders'))} style={{padding:'12px 14px',borderRadius:10,border:'1px solid #e6e9ee',background:'#fff',cursor:'pointer'}}>주문 목록 보기</button>
                </div>
              ) : (
                <button onClick={onBack} style={{width:'100%',padding:'12px 14px',borderRadius:10,background:'#fff',border:'1px solid #e6e9ee',cursor:'pointer'}}>결제 재시도</button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
import React from 'react'

export default function OrderDetail({ order, onBack }){
  if (!order) return (<div style={{padding:28,fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}}>주문 정보를 찾을 수 없습니다.</div>)

  const paid = order.status === 'paid'
  const accent = paid ? '#16a34a' : '#ef4444'

  return (
    <div style={{fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',maxWidth:1100,margin:'36px auto',padding:'0 20px'}}>
      <header style={{textAlign:'center',padding:'36px 20px 8px'}}>
        <div style={{display:'inline-block',width:110,height:110,borderRadius:60,background: paid ? 'rgba(16,163,74,0.08)' : 'rgba(239,68,68,0.06)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18}}>
          {paid ? (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v4" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 17v.01" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <h1 style={{margin:0,fontSize:30,fontWeight:800,color:'#0f172a'}}>{paid ? '주문이 성공적으로 완료되었습니다!' : '주문 처리에 문제가 발생했습니다'}</h1>
        <p style={{marginTop:10,color:'#475569',fontSize:15}}>{paid ? '결제가 정상적으로 완료되었습니다. 주문 확인 이메일을 곧 받으실 수 있습니다.' : '결제가 실패했거나 확인이 필요합니다. 결제 상태를 확인하거나 재시도해주세요.'}</p>
      </header>

      <main style={{background:'#fff',borderRadius:12,boxShadow:'0 12px 30px rgba(2,6,23,0.06)',overflow:'hidden',marginTop:20}}>
        <div style={{display:'flex',gap:0,minHeight:200}}>
          <section style={{flex:1,padding:22,borderRight:'1px solid #f1f5f9'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:56,height:56,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,fontWeight:700,color:'#0f172a'}}>📄</div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>주문 정보</div>
                  <div style={{fontSize:13,color:'#6b7280',marginTop:6}}>주문번호: <span style={{fontWeight:700,color:'#0f172a'}}>{order.orderNumber || order._id}</span></div>
                </div>
              </div>
              <div style={{textAlign:'right',color:'#6b7280'}}>
                <div style={{fontSize:13}}>주문 날짜</div>
                <div style={{fontWeight:700,color:'#0f172a',marginTop:6}}>{new Date(order.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div style={{borderRadius:10,overflow:'hidden',border:'1px solid #f1f5f9'}}>
              {Array.isArray(order.items) && order.items.length ? order.items.map((it, idx) => (
                <div key={idx} style={{display:'flex',alignItems:'center',gap:14,padding:14,background: idx%2===0 ? '#fff' : '#fbfdff'}}>
                  <div style={{width:84,height:84,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#0f172a'}}>{it.sku || 'PDF'}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,color:'#0f172a'}}>{it.title || it.name || (it.sku || 'PDF 상품')}</div>
                    <div style={{fontSize:13,color:'#6b7280',marginTop:6}}>수량 {it.quantity || 1}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:800}}>{it.price ? '₩' + Number(it.price).toLocaleString() : '-'}</div>
                    {paid ? (
                      <a href={`/items/${it.item}/download`} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:8,padding:'8px 12px',background:'#111827',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13}}>다운로드</a>
                    ) : (
                      <div style={{marginTop:8,fontSize:13,color:'#6b7280'}}>결제 후 다운로드 가능</div>
                    )}
                  </div>
                </div>
              )) : (
                <div style={{padding:18,color:'#6b7280'}}>주문된 항목이 없습니다.</div>
              )}
            </div>
          </section>

          <aside style={{width:360,padding:22,display:'flex',flexDirection:'column',gap:16}}>
            <div style={{background:'#fff',padding:14,borderRadius:10,border:'1px solid #f1f5f9'}}>
              <div style={{fontSize:13,color:'#6b7280'}}>결제 상태</div>
              <div style={{marginTop:8,display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:12,height:12,borderRadius:6,background: paid ? '#16a34a' : '#ef4444'}}></div>
                <div style={{fontWeight:800,color:'#0f172a'}}>{paid ? '결제 완료' : (order.status || '미결제')}</div>
              </div>
            </div>

            <div style={{background:'#fff',padding:14,borderRadius:10,border:'1px solid #f1f5f9'}}>
              <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280'}}><div>상품 합계</div><div style={{fontWeight:800}}>{order.total ? '₩' + Number(order.total).toLocaleString() : '₩0'}</div></div>
              <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280',marginTop:8}}><div>세금</div><div style={{fontWeight:800}}>₩{order.tax || 0}</div></div>
              <div style={{borderTop:'1px solid #f1f5f9',marginTop:12,paddingTop:12,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}> <div>총 결제금액</div> <div style={{color:accent}}>{order.total ? '₩' + Number(order.total).toLocaleString() : '₩0'}</div> </div>
            </div>

            <div style={{marginTop:8}}>
              {paid ? (
                <div style={{display:'flex',gap:8}}>
                  <a href={`/orders/${order._id}`} style={{flex:1,display:'block',textAlign:'center',padding:'12px 14px',background:'#0f172a',color:'#fff',borderRadius:10,textDecoration:'none',fontWeight:800}}>주문 상세 보기</a>
                  <button onClick={()=> window.dispatchEvent(new CustomEvent('navigate-to-orders'))} style={{padding:'12px 14px',borderRadius:10,border:'1px solid #e6e9ee',background:'#fff',cursor:'pointer'}}>주문 목록 보기</button>
                </div>
              ) : (
                <button onClick={onBack} style={{width:'100%',padding:'12px 14px',borderRadius:10,background:'#fff',border:'1px solid #e6e9ee',cursor:'pointer'}}>결제 재시도</button>
              )}
            </div>
          </aside>
        import React from 'react'

        export default function OrderDetail({ order, onBack, sessionId }){
          if (!order) return (<div style={{padding:28,fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}}>주문 정보를 찾을 수 없습니다.</div>)

          const paid = order.status === 'paid'
          const accent = paid ? '#16a34a' : '#ef4444'

          return (
            <div style={{fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',maxWidth:1100,margin:'36px auto',padding:'0 20px'}}>
              {/* Hero */}
              <header style={{textAlign:'center',padding:'36px 20px 8px'}}>
                <div style={{display:'inline-block',width:110,height:110,borderRadius:60,background: paid ? 'rgba(16,163,74,0.08)' : 'rgba(239,68,68,0.06)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18}}>
                  {paid ? (
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17l-5-5" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 9v4" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 17v.01" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <h1 style={{margin:0,fontSize:30,fontWeight:800,color:'#0f172a'}}>{paid ? '주문이 성공적으로 완료되었습니다!' : '주문 처리에 문제가 발생했습니다'}</h1>
                <p style={{marginTop:10,color:'#475569',fontSize:15}}>{paid ? '결제가 정상적으로 완료되었습니다. 주문 확인 이메일을 곧 받으실 수 있습니다.' : '결제가 실패했거나 확인이 필요합니다. 결제 상태를 확인하거나 재시도해주세요.'}</p>
              </header>

              {/* Card */}
              <div style={{background:'#fff',borderRadius:12,boxShadow:'0 12px 30px rgba(2,6,23,0.06)',overflow:'hidden',marginTop:20}}>
                <div style={{display:'flex',gap:0,minHeight:200}}>
                  {/* Left: items */}
                  <section style={{flex:1,padding:22,borderRight:'1px solid #f1f5f9'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <div style={{width:56,height:56,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,fontWeight:700,color:'#0f172a'}}>📄</div>
                        <div>
                          <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>주문 정보</div>
                          <div style={{fontSize:13,color:'#6b7280',marginTop:6}}>주문번호: <span style={{fontWeight:700,color:'#0f172a'}}>{order.orderNumber || order._id}</span></div>
                        </div>
                      </div>
                      <div style={{textAlign:'right',color:'#6b7280'}}>
                        <div style={{fontSize:13}}>주문 날짜</div>
                        <div style={{fontWeight:700,color:'#0f172a',marginTop:6}}>{new Date(order.createdAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={{borderRadius:10,overflow:'hidden',border:'1px solid #f1f5f9'}}>
                      {order.items && order.items.length > 0 ? order.items.map((it, idx) => (
                        <div key={idx} style={{display:'flex',alignItems:'center',gap:14,padding:14,background: idx%2===0 ? '#fff' : '#fbfdff'}}>
                          <div style={{width:84,height:84,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#0f172a'}}>{it.sku || 'PDF'}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,color:'#0f172a'}}>{it.title || it.name || (it.sku || 'PDF 상품')}</div>
                            <div style={{fontSize:13,color:'#6b7280',marginTop:6}}>수량 {it.quantity}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontWeight:800}}>{it.price ? '₩' + Number(it.price).toLocaleString() : '-'}</div>
                            {paid ? (
                              <a href={`/items/${it.item}/download${order.user ? '' : `?sessionId=${encodeURIComponent(order.sessionId||sessionId||'')}`}`} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:8,padding:'8px 12px',background:'#111827',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13}}>다운로드</a>
                            ) : (
                              <div style={{marginTop:8,fontSize:13,color:'#6b7280'}}>결제 후 다운로드 가능</div>
                            )}
                          </div>
                        </div>
                      )) : (<div style={{padding:18,color:'#6b7280'}}>주문된 항목이 없습니다.</div>)}
                    </div>
                  </section>

                  {/* Right: summary */}
                  <aside style={{width:360,padding:22,display:'flex',flexDirection:'column',gap:16}}>
                    <div style={{background:'#fff',padding:14,borderRadius:10,border:'1px solid #f1f5f9'}}>
                      <div style={{fontSize:13,color:'#6b7280'}}>결제 상태</div>
                      <div style={{marginTop:8,display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:12,height:12,borderRadius:6,background: paid ? '#16a34a' : '#ef4444'}}></div>
                        <div style={{fontWeight:800,color:'#0f172a'}}>{paid ? '결제 완료' : (order.status || '미결제')}</div>
                      </div>
                    </div>

                    <div style={{background:'#fff',padding:14,borderRadius:10,border:'1px solid #f1f5f9'}}>
                      <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280'}}><div>상품 합계</div><div style={{fontWeight:800}}>{order.total ? '₩' + Number(order.total).toLocaleString() : '₩0'}</div></div>
                      <div style={{display:'flex',justifyContent:'space-between',color:'#6b7280',marginTop:8}}><div>세금</div><div style={{fontWeight:800}}>₩{order.tax || 0}</div></div>
                      <div style={{borderTop:'1px solid #f1f5f9',marginTop:12,paddingTop:12,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18}}> <div>총 결제금액</div> <div style={{color:accent}}>{order.total ? '₩' + Number(order.total).toLocaleString() : '₩0'}</div> </div>
                    </div>

                    <div style={{marginTop:8}}>
                      {paid ? (
                        <div style={{display:'flex',gap:8}}>
                          <a href={`/orders/${order._id}`} style={{flex:1,display:'block',textAlign:'center',padding:'12px 14px',background:'#0f172a',color:'#fff',borderRadius:10,textDecoration:'none',fontWeight:800}}>주문 상세 보기</a>
                          <button onClick={()=> window.dispatchEvent(new CustomEvent('navigate-to-orders'))} style={{padding:'12px 14px',borderRadius:10,border:'1px solid #e6e9ee',background:'#fff',cursor:'pointer'}}>주문 목록 보기</button>
                        </div>
                      ) : (
                        <button onClick={onBack} style={{width:'100%',padding:'12px 14px',borderRadius:10,background:'#fff',border:'1px solid #e6e9ee',cursor:'pointer'}}>결제 재시도</button>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          )
        }
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
                          ) : (
                            <button onClick={onBack} style={{width:'100%',padding:'12px 14px',borderRadius:10,background:'#fff',border:'1px solid #e6e9ee',cursor:'pointer'}}>결제 재시도</button>
                          )}
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              )
            }

                {order.status === 'paid' ? (
                  <a href={`/items/${it.item}/download${order.user ? '' : `?sessionId=${encodeURIComponent(order.sessionId||sessionId||'')}`}`} target="_blank" rel="noreferrer" className="btn-light">다운로드</a>
                ) : (
                  <span style={{color:'#6b7280'}}>결제 완료 후 다운로드 가능</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
