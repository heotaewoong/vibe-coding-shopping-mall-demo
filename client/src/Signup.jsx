import React, { useState } from 'react'

import api from './api'

export default function Signup({ apiBase, onCancel, onSigned }){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [userType, setUserType] = useState('customer')
  const [address, setAddress] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  async function submit(e){
    e.preventDefault()
    setError('')
    setSuccess('')
    if(!email || !name || !password || !userType) return setError('필수 항목을 입력하세요')
    if(password !== passwordConfirm) return setError('비밀번호가 일치하지 않습니다')
    setBusy(true)
    try{
      // Use provided apiBase (from App) or relative path so Vite can proxy '/users' to backend during dev
      const base = apiBase !== undefined ? apiBase : ''
      const payload = { email, name, password, user_type: userType, address, agree_terms: agreeTerms, agree_marketing: agreeMarketing }
  // Debug: log the outgoing request details so we can confirm correct URL, headers and body in browser
  console.debug('DEBUG signup request', { url: api('/users'), headers: { 'Content-Type': 'application/json' }, payload })
  const res = await fetch(api('/users'), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(()=>null)
      if(res.ok){
        setSuccess(data && data._id ? `가입이 완료되었습니다. 아이디: ${data._id}` : '가입이 완료되었습니다.')
        setName(''); setEmail(''); setPassword(''); setPasswordConfirm(''); setAddress(''); setAgreeTerms(false); setAgreeMarketing(false)
        if(onSigned) onSigned()
      } else {
        setError((data && data.message) ? data.message : JSON.stringify(data) )
      }
    }catch(err){
      setError(String(err))
    }finally{ setBusy(false) }
  }

  return (
    <div className="signup-card">
      <button className="back" onClick={onCancel}>뒤로가기</button>
      <h2>회원가입</h2>
      <p>새로운 계정을 만들어 소중한 시작하세요</p>

      <form onSubmit={submit} className="signup-form">

        <label htmlFor="name">이름 *</label>
        <input id="name" value={name} onChange={e=>setName(e.target.value)} placeholder="이름" />

        <label htmlFor="email">이메일 *</label>
        <input id="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" />

  <label htmlFor="password">비밀번호 *</label>
  <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" />

  <label htmlFor="passwordConfirm">비밀번호 확인 *</label>
  <input id="passwordConfirm" type="password" value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)} placeholder="비밀번호를 다시 입력하세요" />

        <label htmlFor="userType">유저 타입</label>
        <select id="userType" value={userType} onChange={e=>setUserType(e.target.value)}>
          <option value="customer">customer</option>
          <option value="admin">admin</option>
        </select>

        <label htmlFor="address">주소</label>
        <input id="address" value={address} onChange={e=>setAddress(e.target.value)} placeholder="주소 (선택)" />

        <div className="consents">
          <p>동의 사항</p>
          <div className="consent-item">
            <label>
              <input type="checkbox" checked={agreeTerms} onChange={e=>setAgreeTerms(e.target.checked)} />
              서비스 이용약관 및 개인정보 처리방침에 동의합니다. (필수)
            </label>
          </div>
          <div className="consent-item">
            <label>
              <input type="checkbox" checked={agreeMarketing} onChange={e=>setAgreeMarketing(e.target.checked)} />
              프로모션 및 마케팅 정보 수신에 동의합니다. (선택)
            </label>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-light">취소</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? '처리중...' : '회원가입'}</button>
        </div>
      </form>
    </div>
  )
}
