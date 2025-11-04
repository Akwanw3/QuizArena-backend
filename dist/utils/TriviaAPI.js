"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePoints = exports.prepareQuestion = exports.shuffleArray = exports.fetchTriviaQuestions = exports.CATEGORY_MAP = void 0;
// Import axios for HTTP requests (we need to install it first!)
const axios_1 = __importDefault(require("axios"));
// --- END TYPE DEFINITIONS ---
// Base URL for Open Trivia Database API
const TRIVIA_API_BASE_URL = 'https://opentdb.com/api.php';
// Category mapping (Open Trivia DB uses numbers for categories)
exports.CATEGORY_MAP = {
    any: 0, // Random category
    general_knowledge: 9,
    science: 17,
    history: 23,
    geography: 22,
    sports: 21,
    entertainment: 11,
    arts: 25,
    animals: 27
};
/**
 * Fetch trivia questions from Open Trivia Database API
 * @param amount - Number of questions to fetch
 * @param category - Question category
 * @param difficulty - Question difficulty
 * @returns Array of questions
 */
const fetchTriviaQuestions = async (amount, category = 'any', difficulty = 'medium') => {
    try {
        // Build API URL with parameters
        const categoryId = exports.CATEGORY_MAP[category] || 0;
        const params = {
            amount,
            type: 'multiple' // Only multiple choice questions
        };
        // Add category if not "any"
        if (categoryId !== 0) {
            params.category = categoryId;
        }
        // Add difficulty
        params.difficulty = difficulty;
        // Make API request
        const response = await axios_1.default.get(TRIVIA_API_BASE_URL, { params });
        // Check response code
        // 0 = Success
        // 1 = No Results
        // 2 = Invalid Parameter
        // 3 = Token Not Found
        // 4 = Token Empty
        if (response.data.response_code !== 0) {
            throw new Error('Failed to fetch trivia questions from API');
            console.log(`failed to fetch`);
        }
        // Decode HTML entities in questions and answers
        const questions = response.data.results.map((q) => ({
            category: decodeHTML(q.category),
            type: q.type,
            difficulty: q.difficulty,
            question: decodeHTML(q.question),
            correct_answer: decodeHTML(q.correct_answer),
            incorrect_answers: q.incorrect_answers.map(decodeHTML)
        }));
        return questions;
    }
    catch (error) {
        console.error('Error fetching trivia questions:', error);
        throw new Error('Failed to fetch trivia questions');
    }
};
exports.fetchTriviaQuestions = fetchTriviaQuestions;
/**
 * Shuffle array (Fisher-Yates algorithm)
 * Used to mix correct answer with incorrect answers
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
const shuffleArray = (array) => {
    const shuffled = [...array]; // Create copy
    for (let i = shuffled.length - 1; i > 0; i--) {
        // Generate random index
        const j = Math.floor(Math.random() * (i + 1));
        // Swap elements
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
exports.shuffleArray = shuffleArray;
/**
 * Prepare question with shuffled answers
 * Mixes correct answer with incorrect answers and shuffles them
 * @param question - Question object from API
 * @returns Question with all answers shuffled
 */
const prepareQuestion = (question) => {
    // Combine correct and incorrect answers
    const allAnswers = [
        question.correct_answer,
        ...question.incorrect_answers
    ];
    // Shuffle answers
    const shuffledAnswers = (0, exports.shuffleArray)(allAnswers);
    return {
        category: question.category,
        difficulty: question.difficulty,
        question: question.question,
        answers: shuffledAnswers, // Shuffled array of all answers
        correctAnswer: question.correct_answer // Keep track of correct one
    };
};
exports.prepareQuestion = prepareQuestion;
/**
 * Decode HTML entities
 * The API returns text with HTML entities like &quot; &#039; &amp;
 * This function converts them to normal characters
 * @param text - Text with HTML entities
 * @returns Decoded text
 */
const decodeHTML = (text) => {
    const entities = {
        '&quot;': '"',
        '&#039;': "'",
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&rsquo;': "'",
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&ndash;': '–',
        '&mdash;': '—',
        '&hellip;': '…',
        '&nbsp;': ' '
    };
    let decoded = text;
    // Replace all HTML entities
    for (const [entity, char] of Object.entries(entities)) {
        decoded = decoded.split(entity).join(char);
    }
    // Handle numeric entities (like &#39;)
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(dec);
    });
    return decoded;
};
/**
 * Calculate points for a correct answer
 * Formula: Base points + Time bonus + Difficulty multiplier
 * @param timeToAnswer - Seconds taken to answer
 * @param timePerQuestion - Total time allowed
 * @param difficulty - Question difficulty
 * @returns Points earned
 */
const calculatePoints = (timeToAnswer, timePerQuestion, difficulty) => {
    // Base points by difficulty
    const basePoints = {
        easy: 100,
        medium: 200,
        hard: 300
    };
    const base = basePoints[difficulty];
    // Time bonus (faster answer = more points)
    // Calculate percentage of time remaining
    const timeRemaining = timePerQuestion - timeToAnswer;
    const timeBonus = Math.floor((timeRemaining / timePerQuestion) * base * 0.5);
    // Total points (minimum 50% of base points)
    const totalPoints = Math.max(base + timeBonus, base * 0.5);
    return Math.floor(totalPoints);
};
exports.calculatePoints = calculatePoints;
