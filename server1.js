require("dotenv").config();
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "client/dist")));

const upload = multer({ dest: "uploads/" });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HEADERS = {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  "Content-Type": "application/json"
};

// Upload endpoint
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);

    const formData = new FormData();
    formData.append("file", fileStream, req.file.originalname);
    formData.append("purpose", "assistants");

    const uploadRes = await axios.post("https://api.openai.com/v1/files", formData, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders()
      }
    });

    fs.unlinkSync(filePath); // Clean up
    res.json({ fileId: uploadRes.data.id });
  } catch (err) {
    console.error("Upload error:", err?.response?.data || err.message);
    res.status(500).send("File upload failed");
  }
});

// Chat message endpoint
app.post("/api/respond", async (req, res) => {
  const { message, fileId, systemPrompt } = req.body;

  if (!message) return res.status(400).send("Missing message");

  try {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt || "You are a helpful assistant." },
        { role: "user", content: message }
      ],
      ...(fileId && {
        tool_choice: "file_search",
        tool_resources: { file_search: { vector_store_ids: [fileId] } }
      })
    };

    const response = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: HEADERS
    });

    const reply = response.data.choices?.[0]?.message?.content || "No reply.";
    res.json({ reply });
  } catch (err) {
    console.error("Respond error:", err?.response?.data || err.message);
    res.status(500).send("Response failed");
  }
});

// Fallback
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "client/dist/index.html"));
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
