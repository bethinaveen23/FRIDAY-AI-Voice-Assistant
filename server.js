import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Home route (optional, for testing)
app.get("/", (req, res) => {
  res.send("✅ FRIDAY AI backend is running");
});

// Chat API
app.post("/api/chat", async (req, res) => {
  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;

    if (!OPENAI_KEY) {
      return res.json({
        reply: "OPENAI_KEY is not set in Render environment variables."
      });
    }

    const userText = req.body?.message;
    if (!userText) {
      return res.json({ reply: "Please type something." });
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are FRIDAY, a friendly AI assistant. Answer clearly and briefly."
            },
            { role: "user", content: userText }
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content || "No reply from AI.";

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "Something went wrong on the server."
    });
  }
});

// ✅ IMPORTANT: Render requires this
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ FRIDAY backend running on port ${PORT}`);
});
