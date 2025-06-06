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
  const { characters, situation, style, length, perspective, ending } = req.body;
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

    // 建構更詳細的 prompt
    let prompt = `請用「${style}」風格，以${characters}為角色，描述一個「${situation}」的故事。`;
    
    // 根據風格添加特定指示
    const styleInstructions = {
      '搞笑': '故事要充滿笑點和幽默感，可以有誇張的情節和反差萌。',
      '感人': '故事要觸動人心，展現人性的美好或生命的感動。',
      '勵志': '故事要充滿正能量，展現克服困難和成長的過程。',
      '厭世': '故事要帶有諷刺和無奈，展現生活的荒謬和現實。',
      '腦洞': '故事要有意想不到的發展，充滿創意和驚喜。',
      '懸疑推理': '故事要有謎團和線索，營造緊張氛圍，最後揭曉真相。',
      '科幻未來': '故事要有科技元素和未來設定，展現想像力。',
      '奇幻冒險': '故事要有魔法或超自然元素，充滿冒險精神。',
      '恐怖驚悚': '故事要營造恐怖氛圍，但不要過於血腥暴力。',
      '愛情浪漫': '故事要展現愛情的美好，可以是甜蜜或酸澀。',
      '歷史穿越': '故事要有歷史背景，展現古今對比或改變歷史。',
      '童話寓言': '故事要有童話色彩，包含寓意和教育意義。',
      '武俠江湖': '故事要有武功和江湖恩怨，展現俠義精神。',
      '日常溫馨': '故事要貼近生活，展現平凡中的溫暖。',
      '黑色幽默': '故事要有諷刺和荒誕，在黑暗中找到笑點。',
      '諷刺社會': '故事要反映社會現象，帶有批判性思考。',
      '靈異神秘': '故事要有超自然元素，營造神秘氛圍。'
    };
    
    if (styleInstructions[style]) {
      prompt += styleInstructions[style];
    }
    
    // 添加敘事視角
    if (perspective && perspective !== 'default') {
      const perspectiveMap = {
        'first': '使用第一人稱「我」來敘述。',
        'third': '使用第三人稱來敘述。',
        'omniscient': '使用全知視角，可以描述所有角色的內心想法。'
      };
      prompt += perspectiveMap[perspective] || '';
    }
    
    // 添加結局類型
    if (ending && ending !== 'default') {
      const endingMap = {
        'happy': '故事要有圓滿的結局。',
        'open': '故事結局要保持開放，給讀者想像空間。',
        'twist': '故事結局要有意想不到的反轉。',
        'tragic': '故事要有悲劇性的結局。'
      };
      prompt += endingMap[ending] || '';
    }
    
    prompt += `故事要有趣且完整，長度${wordCount}。請直接開始講故事，不要有前言或標題。`;

    // 呼叫 Gemini（Google AI Studio API）
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: length === 'long' ? 2048 : (length === 'short' ? 512 : 1024)
        }
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
  const { previousStory, characters, style, originalStyle, styleChange, length, userPrompt } = req.body;
  
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
    let prompt = `這是一個故事，主要角色有${characters}。\n\n`;
    
    // 如果有風格轉換
    if (styleChange && originalStyle !== style) {
      prompt += `原本的故事是「${originalStyle}」風格，現在要轉變為「${style}」風格。請在延續故事時巧妙地進行風格轉換，讓轉變自然合理。\n\n`;
    } else {
      prompt += `這是一個「${style}」風格的故事。\n\n`;
    }

    prompt += `之前的故事內容：\n${previousStory}\n\n`;

    // 如果使用者有提供延續方向，加入 prompt 中
    if (userPrompt) {
      prompt += `延續方向：${userPrompt}\n\n`;
    }

    // 根據風格添加特定指示
    const styleInstructions = {
      '搞笑': '請用幽默搞笑的方式延續，加入更多笑點。',
      '感人': '請用感人肺腑的方式延續，深化情感描寫。',
      '勵志': '請用積極正面的方式延續，展現更多成長和突破。',
      '厭世': '請用諷刺現實的方式延續，展現更多無奈和荒謬。',
      '腦洞': '請用意想不到的方式延續，加入更多創意轉折。',
      '懸疑推理': '請深化謎團或揭露部分真相，保持懸疑感。',
      '科幻未來': '請加入更多科技元素和未來設定。',
      '奇幻冒險': '請加入更多魔法元素和冒險情節。',
      '恐怖驚悚': '請提升恐怖氛圍，但避免過度血腥。',
      '愛情浪漫': '請深化感情描寫，展現愛情的複雜性。',
      '歷史穿越': '請加強歷史背景描寫或時空對比。',
      '童話寓言': '請保持童話色彩，深化故事寓意。',
      '武俠江湖': '請加入更多武打場面或江湖恩怨。',
      '日常溫馨': '請繼續描寫生活細節，保持溫暖基調。',
      '黑色幽默': '請在黑暗中尋找更多荒誕笑點。',
      '諷刺社會': '請深化社會批判，但保持故事性。',
      '靈異神秘': '請增強神秘氛圍，加入更多超自然元素。',
      '反轉劇情': '請準備一個出人意料的劇情反轉。'
    };
    
    if (styleInstructions[style]) {
      prompt += styleInstructions[style];
    }

    prompt += `\n\n請寫出接下來的故事發展，長度${wordCount}。要與前面的情節連貫，並帶來新的發展或轉折。直接延續故事，不要有前言或總結。`;

    // 呼叫 Gemini API
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: length === 'long' ? 2048 : (length === 'short' ? 512 : 1024)
        }
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