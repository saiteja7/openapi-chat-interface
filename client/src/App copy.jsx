import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import logo from './assets/logo.svg'; // or .png
import './App.css';

export default function App() {
  const userId = 'user1';
  const [assistantId, setAssistantId] = useState('asst_5Tz05YduXg6JN0Zc4RUOwimY');
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);

  // const assistants = [
  //   { id: 'asst_5Tz05YduXg6JN0Zc4RUOwimY', name: 'Event API assitantt' },
  //   { id: 'asst_TaTsLHAXIhJqZHfl5JkFDJ3B', name: 'Json placeholder Assitant' }
  // ];
  const assitants = {
    "asst_5Tz05YduXg6JN0Zc4RUOwimY":"Event API assitantt",
    'asst_TaTsLHAXIhJqZHfl5JkFDJ3B':'Json placeholder Assitant'
  }

  useEffect(() => {
    const savedThread = localStorage.getItem(`thread-${assistantId}`);
    setThreadId(savedThread);
    setMessages([]);

    if (savedThread) fetchThreadHistory(savedThread);
    fetch(`/api/threads/${userId}/${assistantId}`)
      .then(res => res.json())
      .then(data => setThreads(data.threads || []));
  }, [assistantId]);

  const fetchThreadHistory = async (id) => {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: id }),
    });
    const data = await res.json();
    setMessages(data.messages || []);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const message = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message, threadId, assistantId }),
    });

    const data = await res.json();
    if (data.response) {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      if (!threadId && data.threadId) {
        const key = `thread-${assistantId}`;
        localStorage.setItem(key, data.threadId);
        setThreadId(data.threadId);
      }

      fetch(`/api/threads/${userId}/${assistantId}`)
        .then(res => res.json())
        .then(data => setThreads(data.threads || []));
    }

    setLoading(false);
  };

  const startNewChat = () => {
    localStorage.removeItem(`thread-${assistantId}`);
    setThreadId(null);
    setMessages([]);
  };

  const loadThread = (id) => {
    localStorage.setItem(`thread-${assistantId}`, id);
    setThreadId(id);
    fetchThreadHistory(id);
  };

  return (
    <div className="container">
      <div className="sidebar">
        <img src={logo} alt="AdventHealth" className="logo" />

        <select value={assistantId} onChange={(e) => setAssistantId(e.target.value)}>
          <option value="asst_5Tz05YduXg6JN0Zc4RUOwimY">Event API assitant</option>
          <option value="asst_TaTsLHAXIhJqZHfl5JkFDJ3B">Json placeholder Assitant</option>
        </select>
        <button onClick={startNewChat}>➕ New Chat</button>
        <div className="threadList">
          <h4>Previous Chats</h4>
          {threads.map((t, i) => (
            <button key={i} onClick={() => loadThread(t.threadId)}>
              {t.title || `Chat ${i + 1}`}
            </button>
          ))}
        </div>
      </div>

      <div className="chatArea">
        <h2>Chat with {assitants[assistantId]}</h2>
        <div className="chatBox">
          {messages.length === 0 && !loading && (
            <p className="placeholder">Start a new conversation with the assistant.</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <ReactMarkdown
                components={{
                  code({ node, inline, children, ...props }) {
                    if (inline) {
                      return (
                        <code className="inline-code" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="code-block">
                        <code {...props}>{children}</code>
                      </pre>
                    );
                  },
                  p({ children }) {
                    return <p className="markdown">{children}</p>;
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}
          {loading && <div className="message assistant loading">Assistant is typing...</div>}
        </div>
        <form
          className="inputForm"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
          />
          <button type="submit" disabled={loading}>Send</button>
        </form>
      </div>
    </div>
  );
}
