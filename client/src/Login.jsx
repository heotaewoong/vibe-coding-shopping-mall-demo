
import React, { useState, useEffect } from 'react'
import './login.css'
import Navbar from './Navbar'

import api from './api'

export default function Login({ onCancel, onLogin }) {
  // accept optional props passed from App so Navbar can show consistent state
  // onLogin will be called after successful login
  // props user/loadingUser/onSignup may be provided by App via JSX
  // Using rest params to avoid changing call signature from App
  const props = arguments[0] || {}
  const parentUser = props.user
  const parentLoading = props.loadingUser
  const onSignup = props.onSignup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      // Debug: show outgoing login request details
      console.debug('DEBUG login request', { url: api('/auth/login'), headers: { 'Content-Type': 'application/json' }, payload: { email, password } })
  const res = await fetch(api('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok && data.accessToken) {
        setSuccess(true)
        setEmail('')
        setPassword('')
        // save access token to localStorage for client-side use
        try {
          localStorage.setItem('accessToken', data.accessToken)
        } catch (e) {
          console.warn('Could not save token to localStorage', e)
        }
        // merge guest cart into user cart (if any)
        try{
          const sessionId = (() => { try { return localStorage.getItem('guestSessionId') } catch(e){ return null } })()
          const token = data.accessToken
          if (sessionId){
            // fetch guest cart
            const guestQ = `?sessionId=${encodeURIComponent(sessionId)}`
            const guestRes = await fetch(api(`/cart${guestQ}`))
            if (!guestRes.ok) {
              console.warn('Could not fetch guest cart for merge')
            } else {
              const guestData = await guestRes.json()
              const guestItems = (guestData.cart && Array.isArray(guestData.cart.items)) ? guestData.cart.items : []
              if (guestItems.length > 0){
                // fetch authenticated user's cart to avoid duplicating items
                let userCartItems = []
                try{
                  const userRes = await fetch(api('/cart'), { headers: { Authorization: `Bearer ${token}` } })
                  if (userRes.ok){
                    const userData = await userRes.json()
                    userCartItems = (userData.cart && Array.isArray(userData.cart.items)) ? userData.cart.items : []
                  }
                } catch(e){ /* ignore */ }

                // build map of existing user items by item id or sku
                const userMap = new Map()
                for (const ui of userCartItems){
                  const key = ui.item ? String(ui.item) : (ui.sku || '')
                  userMap.set(key, ui)
                }

                // for each guest item, add only if not present; if present, skip or optionally update quantity
                for (const gi of guestItems){
                  const key = gi.item ? String(gi.item) : (gi.sku || '')
                  if (userMap.has(key)){
                    // item already in user's cart — skip (or could update quantity)
                    continue
                  }
                  try{
                    await fetch(api('/cart'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ items: [{ itemId: gi.item, quantity: gi.quantity }] })
                    })
                  } catch(e){ console.warn('Failed to add guest item to user cart', e) }
                }
                // NOTE: intentionally keep guestSessionId so the guest cart remains if needed
              }
            }
          }
        } catch(e){ console.warn('Could not merge guest cart', e) }

        // redirect to main page
        window.location.href = '/'
        if (onLogin) onLogin(data)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  // If we already have a token, verify it and redirect to main page
  useEffect(()=>{
    let mounted = true
    async function checkToken(){
      try{
        const token = (() => { try { return localStorage.getItem('accessToken') } catch(e){ return null } })()
        if (!token) return
  const res = await fetch(api('/auth/me'), { headers: { Authorization: `Bearer ${token}` } })
        if (!mounted) return
        if (res.ok){
          // already logged in -> go to main page
          window.location.href = '/'
        } else {
          // token invalid -> remove
          localStorage.removeItem('accessToken')
        }
      } catch(e){
        // ignore network errors here
      }
    }
    checkToken()
    return ()=>{ mounted = false }
  }, [])

  return (
    <div className="login-root">
      <Navbar user={parentUser} loadingUser={parentLoading} onLogin={()=>{ if (onLogin) onLogin(); }} onSignup={onSignup} onLogout={()=>{ localStorage.removeItem('accessToken'); if (onLogin) onLogin(null) }} />
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" required disabled={loading} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required disabled={loading} />
          <div className="login-actions">
            <button type="submit" className="btn-signin" disabled={loading}>Sign in</button>
            <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
          </div>
        </form>
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">로그인 성공!</div>}
        <div className="login-or">Or</div>
        <div className="social-login-group">
          <button className="btn-social google" type="button" disabled={loading}>Log in with Google</button>
          <button className="btn-social kakao" type="button" disabled={loading}>카카오로 로그인</button>
          <button className="btn-social naver" type="button" disabled={loading}>네이버로 로그인</button>
        </div>
      </div>
    </div>
  )
}
