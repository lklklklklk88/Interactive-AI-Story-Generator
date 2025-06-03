const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 回應 /api/config 狀態
app.get('/api/config', (req, res) => {
  res.json({ hasApiKey: !!process.env.GEMINI_API_KEY });
});

// 產生故事
app.post('/api/generate-story', async (req, res) => {
  const { characters, situation, style } = req.body;
  if (!characters || !situation || !style) {
    return res.status(400).json({ error: '缺少參數' });
  }

  try {
    // 組合 prompt
    const prompt = `請用「${style}」風格，以${characters}為角色，描述一個「${situation}」的故事。`;

    // 呼叫 Gemini（Google AI Studio API）
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    const story = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!story) throw new Error('AI 沒有回傳故事內容');

    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: err.message || '生成故事失敗' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
