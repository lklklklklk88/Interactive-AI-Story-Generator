from flask import Flask, render_template, jsonify, request
import os
import requests
import json

app = Flask(__name__)

# 從環境變數獲取 API Key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

@app.route('/')
def index():
    """渲染主頁"""
    return render_template('index.html')

@app.route('/api/config')
def get_config():
    """返回配置資訊（不直接暴露 API Key）"""
    return jsonify({
        'hasApiKey': bool(GEMINI_API_KEY)
    })

@app.route('/api/generate-story', methods=['POST'])
def generate_story():
    """生成故事的 API 端點"""
    try:
        # 檢查 API Key
        if not GEMINI_API_KEY:
            return jsonify({'error': 'API Key 未設定'}), 500
        
        # 獲取請求資料
        data = request.json
        characters = data.get('characters', '')
        situation = data.get('situation', '')
        style = data.get('style', '搞笑')
        
        # 驗證輸入
        if not characters or not situation:
            return jsonify({'error': '請填寫角色名稱和情境描述'}), 400
        
        # 構建 prompt
        prompt = f"""請創作一個{style}風格的短篇故事，字數控制在150-300字之間。

角色：{characters}
情境：{situation}
風格：{style}

要求：
1. 故事要符合{style}風格的特點
2. 突出角色性格，情節生動有趣
3. 有明確的開頭、發展和結尾
4. 使用繁體中文
5. 不要加標題，直接開始故事內容"""
        
        # 呼叫 Gemini API
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
        
        gemini_data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.9,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }
        
        response = requests.post(gemini_url, json=gemini_data)
        response.raise_for_status()
        
        result = response.json()
        
        # 提取故事內容
        if result.get('candidates') and result['candidates'][0].get('content'):
            story = result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'story': story})
        else:
            return jsonify({'error': '無法生成故事'}), 500
            
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            return jsonify({'error': 'API Key 無效或已過期'}), 403
        elif e.response.status_code == 429:
            return jsonify({'error': 'API 使用次數已達上限，請稍後再試'}), 429
        else:
            return jsonify({'error': f'API 請求失敗: {e.response.status_code}'}), 500
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': '生成故事時發生錯誤'}), 500

@app.route('/health')
def health_check():
    """健康檢查端點"""
    return jsonify({'status': 'healthy', 'hasApiKey': bool(GEMINI_API_KEY)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)