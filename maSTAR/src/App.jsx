import { useState, useEffect} from 'react'
import { vapi, startAssistant, stopAssistant } from './ai'
import './App.css'

function App() {
  useEffect(() => {
    startAssistant()
  },[])

  return (
    <></>
  )
}

export default App
