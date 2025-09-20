import { useState, useEffect } from "react";
import { vapi, startAssistant, stopAssistant } from "./ai";
import ActiveCallDetails from "./call/ActiveCallDetails";

function App() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [callId, setCallId] = useState("");
  const [callResult, setCallResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    vapi
      .on("call-start", () => {
        setLoading(false);
        setStarted(true);
      })
      .on("call-end", () => {
        setStarted(false);
        setLoading(false);
      })
      .on("speech-start", () => {
        setAssistantIsSpeaking(true);
      })
      .on("speech-end", () => {
        setAssistantIsSpeaking(false);
      })
      .on("volume-level", (level) => {
        setVolumeLevel(level);
      });
  }, []);

  const handleInputChange = (setter) => (event) => {
    setter(event.target.value);
  };

  const handleStart = async () => {
    setLoading(true);
    const data = await startAssistant("User", "Name", "Done", 12398123);
    setCallId(data.id);
  };

  const handleStop = () => {
    stopAssistant();
    // fetch final call details with safe polling
    const controller = new AbortController();
    (async () => {
      const result = await pollCallDetails(callId, { signal: controller.signal });
      if (result) setCallResult(result);
      setLoadingResult(false);
    })();

    getCallDetails()
  };

  const getCallDetails = (interval = 3000) => {
    setLoadingResult(true);
    fetch("/call-details?call_id=" + callId).then((response) => response.json()).then((data) => {
      if(data.analysis && data.summary){
        console.log(data)
        setCallResult(data)
        setLoadingResult(false)
      }else{
        setTimeout(() => getCallDetails(interval), interval);
      }
    }).catch((error) => alert(error));

  }

  // Safe polling helper: abortable, capped attempts, and interval wait.
  const pollCallDetails = async (
    callIdToPoll,
    { interval = 3000, maxAttempts = 20, signal } = {}
  ) => {
    if (!callIdToPoll) return null;
    setLoadingResult(true);
    let attempts = 0;
    while (attempts < maxAttempts && !(signal && signal.aborted)) {
      attempts++;
      try {
        const res = await fetch(`/call-details?call_id=${callIdToPoll}`, {
          signal,
        });
        const data = await res.json();
        if (data && data.analysis && data.summary) {
          return data;
        }
      } catch (err) {
        // network or abort error -- log and stop polling on non-recoverable errors
        if (err.name === 'AbortError') {
          console.log('poll aborted');
          break;
        }
        console.error('polling error', err);
        // for other errors, break to avoid tight-loop retries
        break;
      }
      // wait before retrying
      await new Promise((r) => setTimeout(r, interval));
    }
    return null;
  };

  const showForm = !loading && !started && !loadingResult && !callResult;

  return (
    <div className="app-container">
      {showForm && (
        <>
          {!started && (
            <button
              onClick={handleStart}
              disabled={false}
              className="button"
            >
              Start Application Call
            </button>
          )}
        </>
      )}
      {loadingResult && <p>Loading call details... please Wait</p>}
      {!loadingResult && callResult && <div className="call-result">
        <p>Qualified: {callResult.analysis.structuredData.Task_Score}</p>
        <p>{callResult.summary}</p>
        </div>}
      {(loading || loadingResult) && <div className="loading"></div>}
      {started && (
        <ActiveCallDetails
          assistantIsSpeaking={assistantIsSpeaking}
          volumeLevel={volumeLevel}
          endCallCallback={handleStop}
        />
      )}
    </div>
  );
}

export default App;