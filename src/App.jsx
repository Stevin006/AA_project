import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { sendQueryToGemini } from './gemini';

function App() {
  const [text, setText] = useState('');;
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);


  const handleButtonClick = async () => {
    setLoading(true);
    const res = await sendQueryToGemini(text);
    setResponse(res);
    setLoading(false);
  };

  return (
      <div className = "chat-container">
        <div className = "response-box">{loading ? "Loading...":response}</div>
        <div className = "input-container">
          <textarea className = "query-input"
            placeholder='Type your question'
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled = {loading}
          ></textarea>
          <button onClick={handleButtonClick} disabled = {loading}>Submit</button>
        </div>
      </div>
  )
}

export default App
