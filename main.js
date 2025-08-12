async function recognize(base64, lang, options) {
    // 从 options 中获取配置和工具函数
    const { config, utils } = options;
    const { tauriFetch } = utils;
    // 从 config 中获取 apikey 和用户选择的 model
    let { apikey, model } = config;

    // 1. 检查 API Key 是否存在
    if (!apikey) {
        throw "Gemini API Key not found. Please set it in the plugin configuration.";
    }
    
    // 2. 如果用户没有选择模型，提供一个默认值
    if (!model) {
        model = "gemini-2.5-flash"; // 默认使用 Flash 模型
    }

    // 3. 在函数内部创建一个简单的语言代码 -> 名称映射表
    const langCodeToName = {
        "auto": "英文",
        "zh_cn": "简体中文",
        "zh_tw": "繁體中文",
        "en": "英文",
        "ja": "日文",
        "ko": "韩文",
        "fr": "法文",
        "es": "西班牙文",
        "ru": "俄文",
        "de": "德文"
    };
    
    // 使用我们自己定义的映射表
    const targetLanguage = langCodeToName[lang] || lang;

    // 4. 构建请求 Gemini API 的 URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apikey}`;

    // 5. 构建请求体 (Request Body)
    const geminiPayload = {
        contents: [
            {
                parts: [
                    {
                        text: `请精确识别图中的所有文字，然后将它们翻译成“${targetLanguage}”。为了便于用户理解你可以提供一些说明信息，请不要输出markdown格式的文本。请注意，图像中的文字可能包含多种语言，请确保翻译准确。`
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: base64
                        }
                    }
                ]
            }
        ]
    };

    // 6. 发送 HTTP POST 请求
    const res = await tauriFetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        // --- 错误修复部分 ---
        // 按照 tauriFetch 的要求，将 body 构造成特定格式的对象
        body: {
            type: 'Json',       // 明确告诉 tauriFetch 我们要发送 JSON
            payload: geminiPayload // 将我们准备好的数据作为 payload
        }
        // --- 修复结束 ---
    });

    // 7. 处理返回结果
    if (res.ok) {
        const data = res.data;
        if (data.candidates && data.candidates.length > 0) {
            const part = data.candidates[0].content.parts[0];
            if (part && part.text) {
                return part.text.trim();
            }
        }
        if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
            throw "Request was blocked for safety reasons.";
        }
        throw "Failed to parse Gemini's response. Response data: " + JSON.stringify(data);

    } else {
        const errorDetails = res.data ? JSON.stringify(res.data) : `HTTP status ${res.status}`;
        throw `Error calling Gemini API: ${errorDetails}`;
    }
}