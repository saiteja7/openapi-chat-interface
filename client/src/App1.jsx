import { useState } from "react";
import "./App1.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fileId, setFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("You are a medical assistant providing first aid instructions.");

  const sendMessage = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, fileId, systemPrompt })
    });

    const data = await res.json();
    setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    setFileId(data.fileId);
  };

  return (
    <div className="container">
      <div className="sidebar">
        <h2>Instructions</h2>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          placeholder="System instructions..."
        />
        <input type="file" onChange={handleUpload} />
        {fileId && <p>📎 File attached</p>}
      </div>

      <div className="chatArea">
        <h2>Medical Assistant</h2>
        <div className="chatBox">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>{m.content}</div>
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
            placeholder="Ask something..."
          />
          <button type="submit" disabled={loading}>Send</button>
        </form>
      </div>
    </div>
  );
}
