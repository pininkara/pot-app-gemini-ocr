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
        model = "gemini-1.5-flash-latest"; // 默认使用 Flash 模型
    }

    // 3. 获取目标语言名称
    const targetLanguage = options.langMap[lang] || '简体中文';

    // 4. 构建请求 Gemini API 的 URL，现在是动态的
    //    使用用户选择的 model 变量来构建 URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apikey}`;

    // 5. 构建请求体 (Request Body)
    const body = {
        contents: [
            {
                parts: [
                    {
                        text: `请精确识别图中的所有文字，然后将它们翻译成“${targetLanguage}”。为了便于用户理解你可以提供一些说明信息，请不要输出markdown格式的文本。请注意，图像中的文字可能包含多种语言，请确保翻译准确。`,
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
        body: JSON.stringify(body)
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