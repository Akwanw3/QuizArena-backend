// Import required modules
import { Request, Response } from 'express';
import Room from '../models/Room';
import Game from '../models/Game';
import User from '../models/User';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';
import { io } from '../server';
import {
  fetchTriviaQuestions,
  prepareQuestion,
  calculatePoints
} from '../utils/TriviaAPI';
import { IQuestion, IGamePlayer } from '../types/Index';
import { sendNotification } from './NotificationController';

// Store active games in memory (for real-time gameplay)
// Key: roomCode, Value: game state
interface ActiveGame {
  roomCode: string;
  questions: any[]; // Prepared questions with shuffled answers
  currentQuestionIndex: number;
  questionStartTime: number;
  questionTimer: NodeJS.Timeout | null;
  players: Map<string, { answers: any[], score: number }>;
}

const activeGames = new Map<string, ActiveGame>();

/**
 * Start a game (host only)
 * POST /api/games/:roomCode/start
 * Protected route
 */
export const startGame = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    console.log('🎮 Starting game for room:', roomCode);
    
    // Step 1: Find room
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    // Step 2: Check if requester is host
    if (!room.isHost(req.user?.userId!)) {
      throw new AppError('Only host can start the game', 403);
    }
    
    // Step 3: Check if game already started
    if (room.status !== 'waiting') {
      throw new AppError('Game already started', 400);
    }
    
    // Step 4: Check if at least 2 players (or allow 1 for testing)
    if (room.players.length < 1) {
      throw new AppError('Need at least 1 player to start', 400);
    }
    
    // Step 5: Check if all players are ready (except host can start without being ready)
    const allReady = room.players.every((p) => p.isReady || p.userId === room.hostId);
    
    if (!allReady) {
      throw new AppError('All players must be ready', 400);
    }
    
    // Step 6: Fetch trivia questions from API
    const questions = await fetchTriviaQuestions(
      room.settings.numberOfQuestions,
      room.settings.category,
      room.settings.difficulty
    );
    
    // Step 7: Prepare questions (shuffle answers)
    const preparedQuestions = questions.map(prepareQuestion);
    
    // Step 8: Update room status
    room.status = 'playing';
    room.currentQuestion = 0;
    await room.save();
    
    // Step 9: Initialize active game in memory
    const playerStates = new Map();
    room.players.forEach((player) => {
      playerStates.set(player.userId, {
        answers: [],
        score: 0
      });
    });
    
    activeGames.set(roomCode.toUpperCase(), {
      roomCode: roomCode.toUpperCase(),
      questions: preparedQuestions,
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
      questionTimer: null,
      players: playerStates
    });
    
    // Step 10: Emit game started event
    console.log('📢 Emitting game:started to room:', roomCode.toUpperCase());
    io.to(roomCode.toUpperCase()).emit('game:started', {
      message: 'Game is starting!',
      numberOfQuestions: room.settings.numberOfQuestions
    });

     
   
    
    // Step 11: Send first question after 3 seconds countdown
    setTimeout(() => {
      console.log('⏰ Countdown finished, sending first question');
      sendQuestion(roomCode.toUpperCase());
    }, 3000);
    
    res.status(200).json({
      success: true,
      message: 'Game started successfully'
    });
  }
);

/**
 * Send current question to all players
 * Called internally, not an API endpoint
 */
const sendQuestion = async (roomCode: string) => {
    console.log('📤 Sending question for room:', roomCode);
  const game = activeGames.get(roomCode);
  const room = await Room.findOne({ roomCode });
  
  if (!game || !room) {
    return;
  }
  
  // Check if all questions have been sent
  if (game.currentQuestionIndex >= game.questions.length) {
    endGame(roomCode);
    return;
  }
  
  // Get current question
  const question = game.questions[game.currentQuestionIndex];
  
  // Update room's current question
  room.currentQuestion = game.currentQuestionIndex;
  await room.save();
  
  // Record question start time
  game.questionStartTime = Date.now();
  
  // Send question to all players (without correct answer!)
  io.to(roomCode).emit('game:question', {
    questionNumber: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length,
    question: question.question,
    answers: question.answers, // Shuffled answers
    category: question.category,
    difficulty: question.difficulty,
    timeLimit: room.settings.timePerQuestion
  });
  
  // Set timer to auto-advance to next question
  game.questionTimer = setTimeout(() => {
    // Send correct answer
    io.to(roomCode).emit('game:answer-reveal', {
      correctAnswer: question.correctAnswer,
      explanation: `The correct answer was: ${question.correctAnswer}`
    });

console.log('📢 Emitting game:question to room:', roomCode);
  io.to(roomCode).emit('game:question', {
    questionNumber: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length,
    question: question.question,
    answers: question.answers,
    category: question.category,
    difficulty: question.difficulty,
    timeLimit: room.settings.timePerQuestion
  });

    
    // Wait 3 seconds before next question
    setTimeout(() => {
      game.currentQuestionIndex++;
      sendQuestion(roomCode);
    }, 3000);
  }, room.settings.timePerQuestion * 1000);
};

/**
 * Submit an answer
 * POST /api/games/:roomCode/answer
 * Protected route
 */
export const submitAnswer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    const { answer } = req.body;
    
    // Step 1: Validate input
    if (!answer) {
      throw new AppError('Answer is required', 400);
    }
    
    // Step 2: Get active game
    const game = activeGames.get(roomCode.toUpperCase());
    
    if (!game) {
      throw new AppError('Game not found or not started', 404);
    }
    
    // Step 3: Get player state
    const playerState = game.players.get(req.user?.userId!);
    
    if (!playerState) {
      throw new AppError('You are not in this game', 400);
    }
    
    // Step 4: Check if player already answered this question
    const currentQuestionIndex = game.currentQuestionIndex;
    const alreadyAnswered = playerState.answers.some(
      (a) => a.questionIndex === currentQuestionIndex
    );
    
    if (alreadyAnswered) {
      throw new AppError('You already answered this question', 400);
    }
    
    // Step 5: Get current question
    const currentQuestion = game.questions[currentQuestionIndex];
    
    // Step 6: Calculate time taken
    const timeToAnswer = (Date.now() - game.questionStartTime) / 1000; // Convert to seconds
    
    // Step 7: Check if answer is correct
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    // Step 8: Calculate points if correct
    let pointsEarned = 0;
    if (isCorrect) {
      const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
      if (room) {
        pointsEarned = calculatePoints(
          timeToAnswer,
          room.settings.timePerQuestion,
          room.settings.difficulty
        );
        playerState.score += pointsEarned;
      }
    }
    
    // Step 9: Record answer
    playerState.answers.push({
      questionIndex: currentQuestionIndex,
      selectedAnswer: answer,
      isCorrect,
      timeToAnswer,
      pointsEarned
    });
    
    // Step 10: Update room with player's answer
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    if (room) {
      const player = room.players.find((p) => p.userId === req.user?.userId);
      if (player) {
        player.answers = playerState.answers;
        player.score = playerState.score;
        await room.save();
      }
    }
    
    // Step 11: Notify other players that someone answered
    io.to(roomCode.toUpperCase()).emit('player:answered', {
      userId: req.user?.userId,
      questionNumber: currentQuestionIndex + 1
    });
    
    // Step 12: Check if all players answered
    const allAnswered = Array.from(game.players.values()).every(
      (p) => p.answers.length > currentQuestionIndex
    );
    
    if (allAnswered && game.questionTimer) {
      // All players answered, skip to next question early
      clearTimeout(game.questionTimer);
      
      // Reveal answer
      io.to(roomCode.toUpperCase()).emit('game:answer-reveal', {
        correctAnswer: currentQuestion.correctAnswer,
        explanation: `The correct answer was: ${currentQuestion.correctAnswer}`
      });
      
      // Update scores
      const scores = await getCurrentScores(roomCode.toUpperCase());
      io.to(roomCode.toUpperCase()).emit('game:scores', scores);
      
      // Next question after 3 seconds
      setTimeout(() => {
        game.currentQuestionIndex++;
        sendQuestion(roomCode.toUpperCase());
      }, 3000);
    }
    
    res.status(200).json({
      success: true,
      message: 'Answer submitted',
      data: {
        isCorrect,
        pointsEarned,
        currentScore: playerState.score
      }
    });
  }
);






/**
 * Get current scores during game
 * Helper function (not an API endpoint)
 */
const getCurrentScores = async (roomCode: string) => {
  const room = await Room.findOne({ roomCode });
  const game = activeGames.get(roomCode);
  
  if (!room || !game) {
    return [];
  }
  
  // Build scores array
  const scores = room.players.map((player) => {
    const playerState = game.players.get(player.userId);
    return {
      userId: player.userId,
      username: player.username,
      avatar: player.avatar,
      score: playerState?.score || 0,
      answeredCount: playerState?.answers.length || 0
    };
  });
  
  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);
  
  return scores;
};

/**
 * End the game and save results
 * Called internally when all questions answered
 */
const endGame = async (roomCode: string) => {
  const game = activeGames.get(roomCode);
  const room = await Room.findOneAndUpdate(
  { roomCode, status: { $ne: 'finished' } },
  { $set: { status: 'finished' } },
  { new: true }
);

if (!room) {
  console.log(`⚠️ Room ${roomCode} already ended.`);
  return;
}

  if (!game || !room) {
    return;
  }

   if (room.status === 'finished') {
    console.log(`⚠️ Game for room ${roomCode} already ended — skipping duplicate save.`);
    return;
  }

  // Optionally also block in memory to avoid race conditions
  if ((game as any).isEnded) {
    console.log(`⚠️ Game ${roomCode} already processed in memory.`);
    return;
  }
  (game as any).isEnded = true;

  // ✅ Now officially end it
  room.status = 'finished';
  await room.save();
  
  // Clear any timers
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
  }
  
  // Calculate final results
  const results: IGamePlayer[] = [];
  
  for (const player of room.players) {
    const playerState = game.players.get(player.userId);
    
    if (!playerState) continue;
    
    // Calculate statistics
    const totalQuestions = playerState.answers.length;
    const correctAnswers = playerState.answers.filter((a) => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    
    const totalTime = playerState.answers.reduce((sum, a) => sum + a.timeToAnswer, 0);
    const avgTimeToAnswer = totalQuestions > 0 ? totalTime / totalQuestions : 0;
    
    const answerTimes = playerState.answers.map((a) => a.timeToAnswer);
    const fastestAnswer = answerTimes.length > 0 ? Math.min(...answerTimes) : 0;
    
    results.push({
      userId: player.userId,
      username: player.username,
      finalScore: playerState.score,
      accuracy: Math.round(accuracy * 100) / 100,
      averageTimeToAnswer: Math.round(avgTimeToAnswer * 100) / 100,
      fastestAnswer: Math.round(fastestAnswer * 100) / 100,
      rank: 0 // Will be set after sorting
    });
  }
  
  // Sort by score and assign ranks
  results.sort((a, b) => b.finalScore - a.finalScore);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });
  
  // Determine winner
  const winner = results[0];
  
  // Save game to database
  const savedGame = await Game.create({
    roomId: room.id.toString(),
    players: results,
    winner: winner.userId,
    settings: room.settings,
    questions: game.questions.map((q, index) => ({
      category: q.category,
      type: 'multiple',
      difficulty: q.difficulty,
      question: q.question,
      correct_answer: q.correctAnswer,
      incorrect_answers: q.answers.filter((a: string) => a !== q.correctAnswer)
    })),
    startedAt: new Date(Date.now() - (game.questions.length * room.settings.timePerQuestion * 1000)),
    finishedAt: new Date(),
    duration: game.questions.length * room.settings.timePerQuestion
  });
  
  // Update user statistics
 // Update user statistics and check achievements
for (const result of results) {
  const user = await User.findById(result.userId);
  if (user) {
    // Basic stats
    user.stats.gamesPlayed += 1;
    const isWin = result.rank === 1;
    
    if (isWin) {
      user.stats.wins += 1;
      // Update current streak
      (user as any).stats.currentStreak = ((user as any).stats.currentStreak || 0) + 1;
      // Update longest streak if current is higher
      if ((user as any).stats.currentStreak > (user as any).stats.longestStreak) {
        (user as any).stats.longestStreak = (user as any).stats.currentStreak;
      }
    } else {
      // Reset current streak on loss
      (user as any).stats.currentStreak = 0;
    }
    
    user.stats.totalPoints += result.finalScore;
    
    // Update highest score
    if (result.finalScore > ((user as any).stats.highestScore || 0)) {
      (user as any).stats.highestScore = result.finalScore;
    }
    
    // Check if perfect game (100% accuracy)
    if (result.accuracy === 100 && isWin) {
      (user as any).stats.perfectGames = ((user as any).stats.perfectGames || 0) + 1;
    }
    
    // Update fastest win if applicable
    if (isWin) {
      const gameDuration = savedGame.duration;
      if ((user as any).stats.fastestWin === 0 || gameDuration < (user as any).stats.fastestWin) {
        (user as any).stats.fastestWin = gameDuration;
      }
    }
    
    await user.save();
    
    // Check and unlock achievements
    const { checkAndUnlockAchievements } = await import('../utils/achievement');
    const newAchievements = await checkAndUnlockAchievements(result.userId);
    
    // If achievements unlocked, emit to user
    if (newAchievements.length > 0) {
      io.to(result.userId).emit('achievements:unlocked', {
        achievements: newAchievements
      });
    }

    if (newAchievements.length > 0) {
  io.to(result.userId).emit('achievements:unlocked', {
    achievements: newAchievements
  });
  
  // Send notification for each achievement
  for (const achievement of newAchievements) {
    await sendNotification(
      result.userId,
      'achievement',
      '🏆 Achievement Unlocked!',
      `You've unlocked: ${achievement.title}`,
      { achievementId: achievement.achievementId }
    );
  }
}

// After game ends, notify winner
if (result.rank === 1) {
  await sendNotification(
    result.userId,
    'leaderboard',
    '🥇 Victory!',
    `You won the game with ${result.finalScore} points!`,
    { gameId: savedGame._id, score: result.finalScore }
  );
}
    
    // Create activity for game played
    const { default: Activity } = await import('../models/Activity');
    await Activity.createActivity(
      result.userId,
      result.username,
      isWin ? 'game_won' : 'game_played',
      isWin 
        ? `Won a game with ${result.finalScore} points!` 
        : `Played a game and scored ${result.finalScore} points`,
      { gameId: savedGame._id, score: result.finalScore },
      user.avatar || 'default-avatar'
    );
    
    // Create high score activity if applicable
    if (result.finalScore > 500) {
      await Activity.createActivity(
        result.userId,
        result.username,
        'high_score',
        `Achieved a high score of ${result.finalScore} points!`,
        { gameId: savedGame._id, score: result.finalScore },
        user.avatar || 'default-avatar'
      );
    }
  }
}
  
  // Update room status
  room.status = 'finished';
  await room.save();
  
  // Send results to all players
  io.to(roomCode).emit('game:ended', {
    results,
    winner: {
      userId: winner.userId,
      username: winner.username,
      score: winner.finalScore
    },
    gameId: savedGame._id
  });
  
  // Clean up active game from memory
  activeGames.delete(roomCode);
};

/**
 * Get game results
 * GET /api/games/:gameId/results
 * Public route
 */
export const getGameResults = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { gameId } = req.params;
    
    // Find game by ID
    const game = await Game.findById(gameId);
    
    if (!game) {
      throw new AppError('Game not found', 404);
    }
    
    res.status(200).json({
      success: true,
      data: {
        game
      }
    });
  }
);

/**
 * Get user's game history
 * GET /api/games/history
 * Protected route
 */
export const getGameHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Use static method from Game model
    const games = await Game.getUserHistory(req.user?.userId!, limit);
    
    res.status(200).json({
      success: true,
      data: {
        games,
        count: games.length
      }
    });
  }
);

/**
 * Get global leaderboard
 * GET /api/games/leaderboard
 * Public route
 */
export const getLeaderboard = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Use static method from Game model
    const leaderboard = await Game.getGlobalLeaderboard(limit);
    
    res.status(200).json({
      success: true,
      data: {
        leaderboard
      }
    });
  }
);

