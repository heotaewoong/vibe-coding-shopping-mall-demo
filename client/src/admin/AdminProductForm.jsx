import React, { useState, useEffect } from 'react'

const CATEGORIES = ['자기계발', '외국어', 'ai']

export default function AdminProductForm({ onCancel, onCreated }){
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [image, setImage] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  useEffect(()=>{
    // Dynamically load Cloudinary widget script if env is present
    if (!CLOUD_NAME || !UPLOAD_PRESET) return
    const existing = document.querySelector("script[data-cloudinary]")
    if (existing) return
    const s = document.createElement('script')
    s.src = 'https://widget.cloudinary.com/v2.0/global/all.js'
    s.setAttribute('data-cloudinary', 'true')
    s.async = true
    document.body.appendChild(s)
    return ()=>{ /* keep script for subsequent opens */ }
  }, [CLOUD_NAME, UPLOAD_PRESET])

  async function submit(e){
    e.preventDefault()
    setError(null)
    if (!sku || !name || typeof price === 'undefined' || !category){
      setError('필수 항목을 모두 입력하세요 (sku, 이름, 가격, 카테고리)')
      return
    }
    setLoading(true)
    try{
      const payload = { sku: sku.trim(), name: name.trim(), price: Number(price), category, image: image.trim() || undefined, description: description.trim() || undefined }
      const res = await fetch('/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data && data.message ? data.message : 'create_failed')
      onCreated && onCreated(data)
    } catch(err){
      console.error('create item failed', err)
      setError(err.message || '상품 등록 실패')
    } finally {
      setLoading(false)
    }
  }

  function openCloudinary(){
    setError(null)
    if (!CLOUD_NAME || !UPLOAD_PRESET){
      setError('Cloudinary 설정이 필요합니다. VITE_CLOUDINARY_CLOUD_NAME 및 VITE_CLOUDINARY_UPLOAD_PRESET를 설정하세요.')
      return
    }
    // global window.cloudinary should be present after script load
    if (!window.cloudinary || !window.cloudinary.createUploadWidget){
      setError('Cloudinary 위젯을 아직 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
      return
    }
    const widget = window.cloudinary.createUploadWidget({
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      sources: ['local','url','camera','image_search','google_drive'],
      multiple: false,
      folder: 'heo_braind_products',
      styles: { palette: { window: '#ffffff', sourceBg: '#f4f4f5', windowBorder: '#90a0b7', tabIcon: '#0b8fe7', inactiveTabIcon: '#69798a', menuIcons: '#0b8fe7', textDark: '#000000', textLight: '#ffffff' } }
    }, (error, result) => {
      if (error) {
        console.error('Cloudinary widget error', error)
        setError('이미지 업로드 중 오류가 발생했습니다')
        return
      }
      if (result && result.event === 'success' && result.info){
        const url = result.info.secure_url || result.info.url
        setImage(url)
      }
    })
    widget.open()
  }

  return (
    <div className="admin-product-form card-panel">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h3>새 상품 등록</h3>
        <div>
          <button className="btn-light" onClick={onCancel}>취소</button>
        </div>
      </div>

      <form onSubmit={submit} className="product-form">
        <div className="row">
          <div className="col">
            <label>SKU (상품 ID)</label>
            <input value={sku} onChange={e=>setSku(e.target.value)} placeholder="예: HB-SEO-001" />

            <label style={{marginTop:12}}>상품 이름</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="상품명을 입력하세요" />

            <div style={{display:'flex', gap:8, marginTop:12}}>
              <div style={{flex:1}}>
                <label>판매가</label>
                <input type="number" value={price} onChange={e=>setPrice(e.target.value)} />
              </div>
              <div style={{flex:1}}>
                <label>카테고리</label>
                <select value={category} onChange={e=>setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <label style={{marginTop:12}}>대표 이미지 (선택)</label>
            <div style={{marginTop:8}}>
              {image ? (
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <img src={image} alt="preview" style={{width:120,height:120,objectFit:'cover',borderRadius:6,border:'1px solid #ddd'}} />
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button type="button" className="btn-light" onClick={()=>setImage('')}>이미지 제거</button>
                    <button type="button" className="btn-light" onClick={openCloudinary}>다시 업로드</button>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input value={image} onChange={e=>setImage(e.target.value)} placeholder="이미지 URL 또는 Cloudinary로 업로드" />
                  <button type="button" className="btn-primary" onClick={openCloudinary}>이미지 업로드</button>
                </div>
              )}
            </div>
          </div>

          <div className="col">
            <label>상품 설명 (선택)</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={10} placeholder="상품에 대한 자세한 설명을 입력하세요" />
            
          </div>
        </div>

        {error && <div className="error" style={{marginTop:12}}>{error}</div>}

        <div style={{display:'flex', gap:12, marginTop:14}}>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? '등록중...' : '상품 등록'}</button>
          <button type="button" className="btn-light" onClick={onCancel}>뒤로</button>
        </div>
      </form>
    </div>
  )
}
