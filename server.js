const express = require('express');
const fetch = require('node-fetch');
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
  const { characters, situation, style, length } = req.body;
  if (!characters || !situation || !style) {
    return res.status(400).json({ error: '缺少參數' });
  }

  try {
    // 根據長度設定字數
    let wordCount = '';
    switch(length) {
      case 'short':
        wordCount = '約100字';
        break;
      case 'long':
        wordCount = '500字以上';
        break;
      case 'medium':
      default:
        wordCount = '約200-300字';
        break;
    }

    // 組合 prompt
    const prompt = `請用「${style}」風格，以${characters}為角色，描述一個「${situation}」的故事。故事要有趣且完整，長度${wordCount}。`;

    // 呼叫 Gemini（Google AI Studio API）
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2)); // 印出 AI 回傳內容
    const story = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!story) throw new Error('AI 沒有回傳故事內容');

    res.json({ story });
  } catch (err) {
    res.status(500).json({ error: err.message || '生成故事失敗' });
  }
});

// 延續故事
app.post('/api/continue-story', async (req, res) => {
  const { previousStory, characters, style, length, userPrompt } = req.body;
  
  if (!previousStory || !characters || !style) {
    return res.status(400).json({ error: '缺少必要參數' });
  }

  try {
    // 根據長度設定字數
    let wordCount = '';
    switch(length) {
      case 'short':
        wordCount = '約100字';
        break;
      case 'long':
        wordCount = '300-500字';
        break;
      case 'medium':
      default:
        wordCount = '約200-300字';
        break;
    }

    // 組合延續故事的 prompt
    let prompt = `這是一個「${style}」風格的故事，主要角色有${characters}。

之前的故事內容：
${previousStory}

請延續這個故事，保持相同的風格和角色設定。`;

    // 如果使用者有提供延續方向，加入 prompt 中
    if (userPrompt) {
      prompt += `\n\n延續方向：${userPrompt}`;
    }

    prompt += `\n\n請寫出接下來的故事發展，長度${wordCount}。要與前面的情節連貫，並帶來新的發展或轉折。`;

    // 呼叫 Gemini API
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    console.log('Continuation response:', JSON.stringify(data, null, 2));
    
    const continuation = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!continuation) throw new Error('AI 沒有回傳延續內容');

    res.json({ continuation });
  } catch (err) {
    console.error('Continue story error:', err);
    res.status(500).json({ error: err.message || '延續故事失敗' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});