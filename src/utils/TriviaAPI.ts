// Import axios for HTTP requests (we need to install it first!)
import axios from 'axios';
import { IQuestion } from '../types/Index';


// --- TYPE DEFINITIONS ---
// These interfaces define the shape of the data coming from the external API,
// so they correctly belong in this utility file.

// 1. Define the structure of a raw question returned by the API
interface IOpenTriviaResponseResult {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string; // Contains HTML entities
  correct_answer: string; // Contains HTML entities
  incorrect_answers: string[]; // Contains HTML entities
}

// 2. Define the structure of the overall API response wrapper
interface IOpenTriviaResponse {
  response_code: number;
  results: IOpenTriviaResponseResult[];
}

// --- END TYPE DEFINITIONS ---

// Base URL for Open Trivia Database API
const TRIVIA_API_BASE_URL = 'https://opentdb.com/api.php';

// Category mapping (Open Trivia DB uses numbers for categories)
export const CATEGORY_MAP: { [key: string]: number } = {
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

// Difficulty type
type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Fetch trivia questions from Open Trivia Database API
 * @param amount - Number of questions to fetch
 * @param category - Question category
 * @param difficulty - Question difficulty
 * @returns Array of questions
 */
export const fetchTriviaQuestions = async (
  amount: number,
  category: string = 'any',
  difficulty: Difficulty = 'medium'
): Promise<IQuestion[]> => {
  try {
    // Build API URL with parameters
    const categoryId = CATEGORY_MAP[category] || 0;
    
    const params: any = {
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
    const response = await axios.get<IOpenTriviaResponse>(TRIVIA_API_BASE_URL, { params });
    
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
    const questions: IQuestion[] = response.data.results.map((q: any) => ({
      category: decodeHTML(q.category),
      type: q.type,
      difficulty: q.difficulty,
      question: decodeHTML(q.question),
      correct_answer: decodeHTML(q.correct_answer),
      incorrect_answers: q.incorrect_answers.map(decodeHTML)
    }));
    
    return questions;
    
  } catch (error) {
    console.error('Error fetching trivia questions:', error);
    throw new Error('Failed to fetch trivia questions');
  }
};

/**
 * Shuffle array (Fisher-Yates algorithm)
 * Used to mix correct answer with incorrect answers
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]; // Create copy
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate random index
    const j = Math.floor(Math.random() * (i + 1));
    
    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Prepare question with shuffled answers
 * Mixes correct answer with incorrect answers and shuffles them
 * @param question - Question object from API
 * @returns Question with all answers shuffled
 */
export const prepareQuestion = (question: IQuestion) => {
  // Combine correct and incorrect answers
  const allAnswers = [
    question.correct_answer,
    ...question.incorrect_answers
  ];
  
  // Shuffle answers
  const shuffledAnswers = shuffleArray(allAnswers);
  
  return {
    category: question.category,
    difficulty: question.difficulty,
    question: question.question,
    answers: shuffledAnswers, // Shuffled array of all answers
    correctAnswer: question.correct_answer // Keep track of correct one
  };
};

/**
 * Decode HTML entities
 * The API returns text with HTML entities like &quot; &#039; &amp;
 * This function converts them to normal characters
 * @param text - Text with HTML entities
 * @returns Decoded text
 */
const decodeHTML = (text: string): string => {
  const entities: { [key: string]: string } = {
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
export const calculatePoints = (
  timeToAnswer: number,
  timePerQuestion: number,
  difficulty: Difficulty
): number => {
  // Base points by difficulty
  const basePoints: { [key in Difficulty]: number } = {
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