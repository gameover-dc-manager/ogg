
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

// Initialize Gemini API
function initializeGemini() {
    try {
        // Use environment variable for API key, fallback to hardcoded for testing
        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCCOM9TCtXx7eUa71isECDljdB-y4plskA';
        
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY environment variable is not set and no hardcoded key provided.');
            return false;
        }
        
        if (apiKey.length < 20) {
            console.error('❌ GEMINI_API_KEY appears to be invalid or too short.');
            return false;
        }

        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log('✅ Gemini API initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Gemini API:', error.message);
        return false;
    }
}

// Initialize on module load
initializeGemini();

async function callGemini(prompt, maxTokens = 150) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        console.error('❌ Invalid prompt provided to callGemini');
        return "Invalid prompt provided. Please try again with a valid question.";
    }

    let retries = 3;
    
    while (retries > 0) {
        try {
            if (!model) {
                console.warn('⚠️ Gemini model not initialized, attempting to reinitialize...');
                if (!initializeGemini()) {
                    throw new Error('Failed to initialize Gemini API - check your GEMINI_API_KEY');
                }
            }

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt.trim() }] }],
                generationConfig: {
                    maxOutputTokens: Math.max(50, Math.min(2048, maxTokens)), // Validate token range
                    temperature: 0.7,
                    topP: 0.8,
                }
            });

            if (!result || !result.response) {
                throw new Error('Invalid response structure from Gemini API');
            }

            const response = await result.response;
            const text = response.text();
            
            if (!text || text.trim().length === 0) {
                throw new Error('Empty response from Gemini API');
            }
            
            return text.trim();

        } catch (error) {
            retries--;
            console.error(`❌ Gemini API error (${3 - retries}/3):`, error.message);
            
            // Handle specific error types
            if (error.message.includes('API_KEY')) {
                console.error('❌ API Key issue detected. Please check your GEMINI_API_KEY environment variable.');
                return "API configuration error. Please contact an administrator.";
            }
            
            if (error.message.includes('QUOTA') || error.message.includes('quota')) {
                console.error('❌ API quota exceeded.');
                return "API quota exceeded. Please try again later.";
            }
            
            if (retries === 0) {
                // Return a fallback response instead of throwing
                return "I'm having trouble connecting to my AI services right now. Please try again in a moment! 🤖";
            }
            
            // Progressive backoff: wait longer between retries
            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
    }
}

async function analyzeSentiment(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.error('❌ Invalid text provided to analyzeSentiment');
        return { rating: 3, confidence: 0.5 };
    }

    try {
        const cleanText = text.substring(0, 500).trim(); // Limit and clean input
        const prompt = `Analyze the sentiment of this text and respond with ONLY a JSON object in this exact format:
{"rating": 3, "confidence": 0.8}

Rating scale: 1 (very negative) to 5 (very positive)
Confidence: 0.0 to 1.0

Text: "${cleanText}"`;

        if (!model) {
            console.warn('⚠️ Gemini model not initialized, attempting to reinitialize...');
            if (!initializeGemini()) {
                throw new Error('Failed to initialize Gemini API');
            }
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.3,
            }
        });
        
        if (!result || !result.response) {
            throw new Error('Invalid response structure from Gemini API');
        }
        
        const rawResponse = result.response.text();

        if (!rawResponse) {
            throw new Error('Empty response from Gemini API');
        }

        // Try to extract JSON from response with better error handling
        let jsonMatch = rawResponse.match(/\{[^{}]*"rating"[^{}]*"confidence"[^{}]*\}/);
        
        if (!jsonMatch) {
            // Try alternative JSON extraction patterns
            jsonMatch = rawResponse.match(/\{[^{}]*\}/);
        }
        
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Validate parsed data
                const rating = typeof parsed.rating === 'number' ? 
                    Math.max(1, Math.min(5, Math.round(parsed.rating))) : 3;
                const confidence = typeof parsed.confidence === 'number' ? 
                    Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
                
                return { rating, confidence };
            } catch (parseError) {
                console.error('❌ JSON parsing error:', parseError.message);
            }
        }
        
        // Enhanced fallback with basic keyword analysis
        const positiveWords = ['good', 'great', 'awesome', 'love', 'excellent', 'amazing', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disgusting', 'worst'];
        
        const lowerText = cleanText.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
        
        let fallbackRating = 3;
        if (positiveCount > negativeCount) fallbackRating = 4;
        else if (negativeCount > positiveCount) fallbackRating = 2;
        
        return { rating: fallbackRating, confidence: 0.3 };
        
    } catch (error) {
        console.error('❌ Sentiment analysis error:', error.message);
        
        // Handle specific error types for sentiment analysis
        if (error.message.includes('API_KEY')) {
            console.error('❌ API Key issue in sentiment analysis.');
        } else if (error.message.includes('QUOTA')) {
            console.error('❌ API quota exceeded in sentiment analysis.');
        }
        
        return { rating: 3, confidence: 0.5 };
    }
}

// Health check function
async function checkGeminiHealth() {
    try {
        const testResponse = await callGemini("Hello", 50);
        return testResponse && !testResponse.includes("having trouble connecting");
    } catch (error) {
        console.error('❌ Gemini health check failed:', error.message);
        return false;
    }
}

module.exports = {
    callGemini,
    analyzeSentiment,
    checkGeminiHealth,
    initializeGemini
};
