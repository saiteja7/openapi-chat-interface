require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
// app.use(express.static(path.join(__dirname, "public")));
// Serve static files from React




const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log(OPENAI_API_KEY);

const HEADERS = {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  "OpenAI-Beta": "assistants=v2",
  "Content-Type": "application/json"
};

// In-memory: key = userId + assistantId → thread info
const threadHistory = {};

app.post("/api/ask", async (req, res) => {
  const { userId, message, threadId: clientThreadId, assistantId } = req.body;
  if (!userId || !message || !assistantId) {
    return res.status(400).send("Missing userId, message or assistantId");
  }

  try {
    let threadId = clientThreadId;
    const threadKey = `${userId}_${assistantId}`;

    if (!threadId) {
      const threadRes = await axios.post("https://api.openai.com/v1/threads", {}, { headers: HEADERS });
      threadId = threadRes.data.id;

      if (!threadHistory[threadKey]) threadHistory[threadKey] = [];
      threadHistory[threadKey].push({
        threadId,
        title: message.slice(0, 30),
        createdAt: new Date()
      });
    }

    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: "user", content: message },
      { headers: HEADERS }
    );

    const runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: assistantId },
      { headers: HEADERS }
    );

    const runId = runRes.data.id;
    let status = "queued";
    let runStatus;

    while (status !== "completed" && status !== "failed") {
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers: HEADERS }
      );
      status = runStatus.data.status;
    }

    if (status === "failed") return res.status(500).send("Assistant run failed");

    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: HEADERS }
    );

    const assistantReply = messagesRes.data.data.find((msg) => msg.role === "assistant");
    const content = assistantReply?.content?.[0]?.text?.value;

    return res.json({ response: content, threadId });
  } catch (error) {
    console.error("Error:", error?.response?.data || error.message);
    return res.status(500).send("Internal error");
  }
});

app.post("/api/history", async (req, res) => {
  const { threadId } = req.body;
  if (!threadId) return res.status(400).send("Missing threadId");

  try {
    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: HEADERS }
    );

    const messages = messagesRes.data.data
      .slice()
      .reverse()
      .map((msg) => ({
        role: msg.role,
        content: msg.content[0]?.text?.value || ""
      }));

    res.json({ messages });
  } catch (error) {
    console.error("History error:", error?.response?.data || error.message);
    res.status(500).send("Failed to retrieve history");
  }
});

app.get("/api/threads/:userId/:assistantId", (req, res) => {
  const { userId, assistantId } = req.params;
  const key = `${userId}_${assistantId}`;
  res.json({ threads: threadHistory[key] || [] });
});

// Catch-all for frontend routing
// app.use(express.static(path.join(__dirname, 'client/dist')));
// app.get(/^\/(?!api).*/, (req, res) => {
//   res.sendFile(path.join(__dirname, 'client/dist/index.html'));
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
