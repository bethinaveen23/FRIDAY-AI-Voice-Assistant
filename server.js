import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

app.post("/api/chat", async (req, res) => {
  try {
    if (!OPENAI_KEY) {
      return res.json({ reply: "OPENAI_KEY is not set. Set it in your system environment and restart server." });
    }

    const userText = (req.body?.message || "").toString();
    if (!userText.trim()) return res.json({ reply: "Please type something." });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are FRIDAY, a friendly assistant. Keep replies short and helpful." },
          { role: "user", content: userText }
        ],
        temperature: 0.7
      })
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "No reply received.";
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ reply: "AI error occurred on the server." });
  }
});

app.listen(3000, () => console.log("✅ FRIDAY backend running on http://localhost:3000"));
