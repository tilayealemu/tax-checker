import React, { useState, useEffect } from 'react'
import HomeScreen from './components/HomeScreen'
import SessionScreen from './components/SessionScreen'

export default function App() {
  const [view, setView] = useState({ screen: 'home' })
  const [saveSampleEnabled, setSaveSampleEnabled] = useState(false)

  useEffect(() => {
    window.api.config.saveSampleEnabled().then(setSaveSampleEnabled)
  }, [])

  function openSession(sessionId) {
    setView({ screen: 'session', sessionId })
  }

  function goHome() {
    setView({ screen: 'home' })
  }

  if (view.screen === 'session') {
    return <SessionScreen sessionId={view.sessionId} onBack={goHome} saveSampleEnabled={saveSampleEnabled} />
  }

  return (
    <HomeScreen onOpenSession={openSession} />
  )
}
