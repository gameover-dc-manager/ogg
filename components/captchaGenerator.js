
let Canvas;
try {
    Canvas = require('canvas');
    console.log('✅ Enhanced Canvas library loaded successfully');
} catch (error) {
    console.error('❌ Canvas library not available. Enhanced captcha generation will use math fallback.');
    console.error('To enable image captcha, run: npm install canvas');
    Canvas = null;
}
const crypto = require('crypto');

/**
 * Generate an enhanced captcha image with advanced distortion and security
 * @param {string} difficulty - Difficulty level ('easy', 'medium', 'hard', 'expert')
 * @returns {Object} - Contains answer and image buffer
 */
async function generateCaptcha(difficulty = 'medium') {
    if (!Canvas) {
        console.log('🧮 Canvas unavailable, using enhanced math captcha fallback');
        return generateMathCaptcha('enhanced');
    }

    try {
        const settings = getCaptchaSettings(difficulty);
        const canvas = Canvas.createCanvas(settings.width, settings.height);
        const ctx = canvas.getContext('2d');

        // Generate secure random text
        const text = generateSecureText(settings.length, settings.charset);

        // Create enhanced background with gradient
        createEnhancedBackground(ctx, settings);

        // Add advanced noise patterns
        addAdvancedNoise(ctx, settings);

        // Draw text with enhanced distortion
        drawDistortedText(ctx, text, settings);

        // Add security watermark
        addSecurityWatermark(ctx, settings);

        // Apply final effects
        applyFinalEffects(ctx, settings);

        return {
            buffer: canvas.toBuffer('image/png'),
            answer: text.toLowerCase(),
            type: 'image',
            difficulty: difficulty,
            timestamp: Date.now()
        };

    } catch (error) {
        console.error('❌ Enhanced canvas captcha failed:', error);
        return generateMathCaptcha('enhanced');
    }
}

/**
 * Generate enhanced math captcha with varied question types
 * @param {string} mode - 'simple', 'enhanced', or 'expert'
 * @returns {Object} - Contains question, answer, and metadata
 */
function generateMathCaptcha(mode = 'enhanced') {
    const questionTypes = mode === 'expert' ? 
        ['arithmetic', 'sequence', 'logic', 'word_math'] :
        mode === 'enhanced' ? 
        ['arithmetic', 'sequence', 'comparison'] :
        ['arithmetic'];

    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    switch (questionType) {
        case 'arithmetic':
            return generateArithmeticCaptcha(mode);
        case 'sequence':
            return generateSequenceCaptcha();
        case 'logic':
            return generateLogicCaptcha();
        case 'comparison':
            return generateComparisonCaptcha();
        case 'word_math':
            return generateWordMathCaptcha();
        default:
            return generateArithmeticCaptcha(mode);
    }
}

/**
 * Generate arithmetic-based captcha
 */
function generateArithmeticCaptcha(mode) {
    const operations = mode === 'expert' ? 
        ['+', '-', '*', '/', '%', '^'] :
        ['+', '-', '*'];
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, answer, question;

    switch (operation) {
        case '+':
            num1 = Math.floor(Math.random() * (mode === 'expert' ? 100 : 50)) + 1;
            num2 = Math.floor(Math.random() * (mode === 'expert' ? 100 : 50)) + 1;
            answer = num1 + num2;
            question = `${num1} + ${num2} = ?`;
            break;
        case '-':
            num1 = Math.floor(Math.random() * (mode === 'expert' ? 100 : 50)) + 25;
            num2 = Math.floor(Math.random() * (num1 > 50 ? 50 : 25)) + 1;
            answer = num1 - num2;
            question = `${num1} - ${num2} = ?`;
            break;
        case '*':
            num1 = Math.floor(Math.random() * (mode === 'expert' ? 15 : 10)) + 1;
            num2 = Math.floor(Math.random() * (mode === 'expert' ? 15 : 10)) + 1;
            answer = num1 * num2;
            question = `${num1} × ${num2} = ?`;
            break;
        case '/':
            num2 = Math.floor(Math.random() * 10) + 2;
            answer = Math.floor(Math.random() * 15) + 1;
            num1 = num2 * answer;
            question = `${num1} ÷ ${num2} = ?`;
            break;
        case '%':
            num1 = Math.floor(Math.random() * 50) + 10;
            num2 = Math.floor(Math.random() * 8) + 2;
            answer = num1 % num2;
            question = `${num1} mod ${num2} = ?`;
            break;
        case '^':
            num1 = Math.floor(Math.random() * 5) + 2;
            num2 = Math.floor(Math.random() * 3) + 1;
            answer = Math.pow(num1, num2);
            question = `${num1}^${num2} = ?`;
            break;
    }

    return {
        question: question,
        answer: answer.toString(),
        type: 'arithmetic',
        difficulty: mode,
        buffer: null,
        timestamp: Date.now()
    };
}

/**
 * Generate sequence-based captcha
 */
function generateSequenceCaptcha() {
    const sequences = [
        { pattern: 'arithmetic', name: 'Arithmetic Sequence' },
        { pattern: 'fibonacci', name: 'Fibonacci Sequence' },
        { pattern: 'square', name: 'Square Numbers' },
        { pattern: 'prime', name: 'Prime Numbers' }
    ];

    const sequence = sequences[Math.floor(Math.random() * sequences.length)];
    let numbers, answer, question;

    switch (sequence.pattern) {
        case 'arithmetic':
            const start = Math.floor(Math.random() * 10) + 1;
            const step = Math.floor(Math.random() * 5) + 2;
            numbers = [start, start + step, start + 2 * step, start + 3 * step];
            answer = start + 4 * step;
            question = `Complete the sequence: ${numbers.join(', ')}, ?`;
            break;
        case 'fibonacci':
            numbers = [1, 1, 2, 3, 5];
            answer = 8;
            question = `Complete the Fibonacci sequence: ${numbers.join(', ')}, ?`;
            break;
        case 'square':
            numbers = [1, 4, 9, 16];
            answer = 25;
            question = `Complete the sequence of squares: ${numbers.join(', ')}, ?`;
            break;
        case 'prime':
            numbers = [2, 3, 5, 7];
            answer = 11;
            question = `Complete the prime sequence: ${numbers.join(', ')}, ?`;
            break;
    }

    return {
        question: question,
        answer: answer.toString(),
        type: 'sequence',
        difficulty: 'enhanced',
        buffer: null,
        timestamp: Date.now()
    };
}

/**
 * Generate logic-based captcha
 */
function generateLogicCaptcha() {
    const logicTypes = [
        { type: 'greatest', question: 'Which number is greatest?', options: generateRandomNumbers(4) },
        { type: 'smallest', question: 'Which number is smallest?', options: generateRandomNumbers(4) },
        { type: 'even', question: 'Which number is even?', options: generateMixedNumbers() }
    ];

    const logic = logicTypes[Math.floor(Math.random() * logicTypes.length)];
    let answer;

    switch (logic.type) {
        case 'greatest':
            answer = Math.max(...logic.options);
            break;
        case 'smallest':
            answer = Math.min(...logic.options);
            break;
        case 'even':
            answer = logic.options.find(n => n % 2 === 0);
            break;
    }

    return {
        question: `${logic.question} Options: ${logic.options.join(', ')}`,
        answer: answer.toString(),
        type: 'logic',
        difficulty: 'expert',
        buffer: null,
        timestamp: Date.now()
    };
}

/**
 * Generate comparison captcha
 */
function generateComparisonCaptcha() {
    const num1 = Math.floor(Math.random() * 50) + 10;
    const num2 = Math.floor(Math.random() * 50) + 10;
    
    const operators = ['>', '<', '='];
    const correctOp = num1 > num2 ? '>' : num1 < num2 ? '<' : '=';
    
    return {
        question: `Which operator makes this true: ${num1} ? ${num2}`,
        answer: correctOp,
        type: 'comparison',
        difficulty: 'enhanced',
        buffer: null,
        timestamp: Date.now()
    };
}

/**
 * Generate word-based math captcha
 */
function generateWordMathCaptcha() {
    const scenarios = [
        {
            question: "If you have 5 apples and buy 3 more, how many apples do you have?",
            answer: 8
        },
        {
            question: "A store has 20 items. If 7 are sold, how many remain?",
            answer: 13
        },
        {
            question: "You see 4 groups of 3 birds each. How many birds in total?",
            answer: 12
        }
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    return {
        question: scenario.question,
        answer: scenario.answer.toString(),
        type: 'word_math',
        difficulty: 'expert',
        buffer: null,
        timestamp: Date.now()
    };
}

/**
 * Get captcha settings based on difficulty
 */
function getCaptchaSettings(difficulty) {
    const baseSettings = {
        easy: {
            width: 180, height: 70, length: 4,
            charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            noiseLevel: 'low', distortion: 'minimal'
        },
        medium: {
            width: 200, height: 80, length: 5,
            charset: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
            noiseLevel: 'medium', distortion: 'moderate'
        },
        hard: {
            width: 220, height: 90, length: 6,
            charset: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*',
            noiseLevel: 'high', distortion: 'heavy'
        },
        expert: {
            width: 240, height: 100, length: 7,
            charset: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()_+-=',
            noiseLevel: 'extreme', distortion: 'maximum'
        }
    };

    return baseSettings[difficulty] || baseSettings.medium;
}

/**
 * Generate cryptographically secure text
 */
function generateSecureText(length, charset) {
    let result = '';
    const bytes = crypto.randomBytes(length * 2);
    
    for (let i = 0; i < length; i++) {
        const randomIndex = bytes[i] % charset.length;
        result += charset.charAt(randomIndex);
    }
    
    return result;
}

/**
 * Create enhanced background with gradient and patterns
 */
function createEnhancedBackground(ctx, settings) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, settings.width, settings.height);
    gradient.addColorStop(0, `hsl(${Math.random() * 60 + 200}, 30%, 95%)`);
    gradient.addColorStop(1, `hsl(${Math.random() * 60 + 200}, 30%, 90%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, settings.width, settings.height);

    // Add subtle pattern
    if (settings.noiseLevel !== 'low') {
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 70%)`;
            ctx.fillRect(
                Math.random() * settings.width,
                Math.random() * settings.height,
                Math.random() * 30 + 10,
                Math.random() * 30 + 10
            );
        }
        ctx.globalAlpha = 1;
    }
}

/**
 * Add advanced noise patterns
 */
function addAdvancedNoise(ctx, settings) {
    const noiseIntensity = {
        low: 30, medium: 60, high: 100, extreme: 150
    }[settings.noiseLevel] || 60;

    // Line noise
    for (let i = 0; i < noiseIntensity / 10; i++) {
        ctx.strokeStyle = `hsla(${Math.random() * 360}, 50%, 50%, 0.3)`;
        ctx.lineWidth = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.moveTo(Math.random() * settings.width, Math.random() * settings.height);
        ctx.bezierCurveTo(
            Math.random() * settings.width, Math.random() * settings.height,
            Math.random() * settings.width, Math.random() * settings.height,
            Math.random() * settings.width, Math.random() * settings.height
        );
        ctx.stroke();
    }

    // Dot noise
    for (let i = 0; i < noiseIntensity; i++) {
        ctx.fillStyle = `hsla(${Math.random() * 360}, 70%, 40%, ${Math.random() * 0.5 + 0.1})`;
        const size = Math.random() * 4 + 1;
        ctx.fillRect(
            Math.random() * settings.width,
            Math.random() * settings.height,
            size, size
        );
    }
}

/**
 * Draw text with enhanced distortion effects
 */
function drawDistortedText(ctx, text, settings) {
    const fontSize = settings.height * 0.4;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const spacing = settings.width / (text.length + 1);

    for (let i = 0; i < text.length; i++) {
        ctx.save();
        
        const x = spacing * (i + 1) + (Math.random() - 0.5) * 20;
        const y = settings.height / 2 + (Math.random() - 0.5) * 15;
        
        // Enhanced transformations
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.6);
        ctx.scale(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
        
        // Color variation with better contrast
        const hue = Math.random() * 60 + 15; // Warmer colors
        const saturation = Math.random() * 50 + 50;
        const lightness = Math.random() * 30 + 20;
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Add text shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillText(text[i], 0, 0);
        
        ctx.restore();
    }
}

/**
 * Add security watermark
 */
function addSecurityWatermark(ctx, settings) {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.font = '10px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText('SECURE', settings.width - 40, settings.height - 5);
    ctx.restore();
}

/**
 * Apply final visual effects
 */
function applyFinalEffects(ctx, settings) {
    // Add slight blur effect for harder difficulties
    if (settings.distortion === 'heavy' || settings.distortion === 'maximum') {
        // This would require additional canvas manipulation
        // For now, just add more noise
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
            ctx.fillRect(Math.random() * settings.width, Math.random() * settings.height, 2, 2);
        }
        ctx.globalAlpha = 1;
    }
}

/**
 * Helper functions for math captchas
 */
function generateRandomNumbers(count) {
    const numbers = [];
    for (let i = 0; i < count; i++) {
        numbers.push(Math.floor(Math.random() * 50) + 10);
    }
    return numbers;
}

function generateMixedNumbers() {
    const numbers = [];
    // Ensure at least one even number
    numbers.push((Math.floor(Math.random() * 10) + 1) * 2);
    // Add odd numbers
    for (let i = 0; i < 3; i++) {
        numbers.push((Math.floor(Math.random() * 10) + 1) * 2 - 1);
    }
    // Shuffle array
    return numbers.sort(() => Math.random() - 0.5);
}

/**
 * Validate captcha answer with enhanced checking
 */
function validateCaptchaAnswer(userAnswer, correctAnswer, captchaType) {
    if (!userAnswer || !correctAnswer) return false;
    
    const cleanUser = userAnswer.toString().toLowerCase().trim();
    const cleanCorrect = correctAnswer.toString().toLowerCase().trim();
    
    // Exact match for math captchas
    if (captchaType !== 'image') {
        return cleanUser === cleanCorrect;
    }
    
    // Fuzzy matching for image captchas (allow minor typos)
    if (cleanUser === cleanCorrect) return true;
    
    // Allow single character difference for image captchas
    if (Math.abs(cleanUser.length - cleanCorrect.length) <= 1) {
        let differences = 0;
        const maxLen = Math.max(cleanUser.length, cleanCorrect.length);
        
        for (let i = 0; i < maxLen; i++) {
            if (cleanUser[i] !== cleanCorrect[i]) {
                differences++;
                if (differences > 1) break;
            }
        }
        
        return differences <= 1;
    }
    
    return false;
}

module.exports = {
    generateCaptcha,
    generateMathCaptcha,
    validateCaptchaAnswer,
    getCaptchaSettings,
    generateSecureText
};
