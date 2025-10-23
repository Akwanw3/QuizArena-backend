// This file contains all our custom TypeScript types/interfaces

// What a User looks like in our system
export interface IUser {
  _Id?: string; // MongoDB ID (optional because it's auto-generated)
  username: string; // Player's username
  email: string; // Player's email
  password: string; // Encrypted password
  avatar?: string; // Profile picture URL (optional)
  stats: {
    gamesPlayed: number; // Total games played
    wins: number; // Total wins
    totalPoints: number; // Lifetime points
    winRate: number; // Percentage of games won
  };
  createdAt?: Date; // When account was created
  updatedAt?: Date; // Last update time
}

// What a Game Room looks like
export interface IRoom {
  _Id: string;
  roomCode: string; // Unique 6-character code to join
  hostId: string; // User ID of the room creator
  players: IPlayer[]; // Array of players in the room
  settings: {
    category: string; // Quiz category (e.g., "Science", "History")
    difficulty: 'easy' | 'medium' | 'hard'; // Question difficulty
    numberOfQuestions: number; // How many questions in the game
    timePerQuestion: number; // Seconds per question
  };
  status: 'waiting' | 'playing' | 'finished'; // Current room status
  currentQuestion?: number; // Which question we're on (0-indexed)
  isPublic: boolean; // Can anyone join or invite-only?
  createdAt?: Date;
}

// What a Player in a room looks like (different from User)
export interface IPlayer {
  userId: string; // Reference to User
  username: string;
  avatar?: string;
  score: number; // Current score in this game
  answers: IAnswer[]; // Their answers so far
  isReady: boolean; // Ready to start?
  isConnected: boolean; // Still in the game?
}

// What an Answer looks like
export interface IAnswer {
  questionIndex: number; // Which question (0, 1, 2...)
  selectedAnswer: string; // Their chosen answer
  isCorrect: boolean; // Was it right?
  timeToAnswer: number; // How many seconds it took
  pointsEarned: number; // Points for this question
}

// What a Question looks like (from API or our database)
export interface IQuestion {
  category: string;
  type: string; // "multiple" or "boolean"
  difficulty: string;
  question: string; // The actual question text
  correct_answer: string; // The right answer
  incorrect_answers: string[]; // Wrong answers (we'll mix these with correct)
}

// What a Game (completed game record) looks like
export interface IGame {
  _Id?: string;
  roomId: string; // Which room this game was in
  players: IGamePlayer[]; // Final player standings
  winner: string; // User ID of the winner
  settings: IRoom['settings']; // Copy of game settings
  questions: IQuestion[]; // The questions that were asked
  startedAt: Date; // When game started
  finishedAt: Date; // When game ended
  duration: number; // Total time in seconds
}

// Player data for completed game
export interface IGamePlayer {
  userId: string;
  username: string;
  finalScore: number;
  accuracy: number; // Percentage of correct answers
  averageTimeToAnswer: number; // Average response time
  fastestAnswer: number; // Their fastest answer time
  rank: number; // 1st, 2nd, 3rd place, etc.
}

// Socket.io event types (what events can be sent/received)
export interface ISocketEvents {
  // Client -> Server events
  'room:create': (settings: IRoom['settings']) => void;
  'room:join': (roomCode: string) => void;
  'room:leave': () => void;
  'game:start': () => void;
  'game:answer': (answer: string) => void;
  'player:ready': () => void;
  
  // Server -> Client events
  'room:created': (room: IRoom) => void;
  'room:joined': (room: IRoom) => void;
  'room:updated': (room: IRoom) => void;
  'room:error': (message: string) => void;
  'game:question': (question: IQuestion, questionNumber: number) => void;
  'game:scores': (players: IPlayer[]) => void;
  'game:ended': (results: IGamePlayer[]) => void;
  'player:answered': (userId: string) => void;
}

// JWT Token payload (what's inside our authentication token)
export interface IJWTPayload {
  userId: string;
  email: string;
  iat?: number; // Issued at (timestamp)
  exp?: number; // Expires at (timestamp)
}