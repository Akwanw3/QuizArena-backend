"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = exports.getGameHistory = exports.getGameResults = exports.submitAnswer = exports.startGame = void 0;
const Room_1 = __importDefault(require("../models/Room"));
const Game_1 = __importDefault(require("../models/Game"));
const User_1 = __importDefault(require("../models/User"));
const ErrorHandler_1 = require("../middleware/ErrorHandler");
const server_1 = require("../server");
const TriviaAPI_1 = require("../utils/TriviaAPI");
const NotificationController_1 = require("./NotificationController");
const activeGames = new Map();
/**
 * Start a game (host only)
 * POST /api/games/:roomCode/start
 * Protected route
 */
exports.startGame = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { roomCode } = req.params;
    console.log('🎮 Starting game for room:', roomCode);
    // Step 1: Find room
    const room = await Room_1.default.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) {
        throw new ErrorHandler_1.AppError('Room not found', 404);
    }
    // Step 2: Check if requester is host
    if (!room.isHost(req.user?.userId)) {
        throw new ErrorHandler_1.AppError('Only host can start the game', 403);
    }
    // Step 3: Check if game already started
    if (room.status !== 'waiting') {
        throw new ErrorHandler_1.AppError('Game already started', 400);
    }
    // Step 4: Check if at least 2 players (or allow 1 for testing)
    if (room.players.length < 1) {
        throw new ErrorHandler_1.AppError('Need at least 1 player to start', 400);
    }
    // Step 5: Check if all players are ready (except host can start without being ready)
    const allReady = room.players.every((p) => p.isReady || p.userId === room.hostId);
    if (!allReady) {
        throw new ErrorHandler_1.AppError('All players must be ready', 400);
    }
    // Step 6: Fetch trivia questions from API
    const questions = await (0, TriviaAPI_1.fetchTriviaQuestions)(room.settings.numberOfQuestions, room.settings.category, room.settings.difficulty);
    // Step 7: Prepare questions (shuffle answers)
    const preparedQuestions = questions.map(TriviaAPI_1.prepareQuestion);
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
    server_1.io.to(roomCode.toUpperCase()).emit('game:started', {
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
});
/**
 * Send current question to all players
 * Called internally, not an API endpoint
 */
const sendQuestion = async (roomCode) => {
    console.log('📤 Sending question for room:', roomCode);
    const game = activeGames.get(roomCode);
    const room = await Room_1.default.findOne({ roomCode });
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
    server_1.io.to(roomCode).emit('game:question', {
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
        server_1.io.to(roomCode).emit('game:answer-reveal', {
            correctAnswer: question.correctAnswer,
            explanation: `The correct answer was: ${question.correctAnswer}`
        });
        console.log('📢 Emitting game:question to room:', roomCode);
        server_1.io.to(roomCode).emit('game:question', {
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
exports.submitAnswer = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { roomCode } = req.params;
    const { answer } = req.body;
    // Step 1: Validate input
    if (!answer) {
        throw new ErrorHandler_1.AppError('Answer is required', 400);
    }
    // Step 2: Get active game
    const game = activeGames.get(roomCode.toUpperCase());
    if (!game) {
        throw new ErrorHandler_1.AppError('Game not found or not started', 404);
    }
    // Step 3: Get player state
    const playerState = game.players.get(req.user?.userId);
    if (!playerState) {
        throw new ErrorHandler_1.AppError('You are not in this game', 400);
    }
    // Step 4: Check if player already answered this question
    const currentQuestionIndex = game.currentQuestionIndex;
    const alreadyAnswered = playerState.answers.some((a) => a.questionIndex === currentQuestionIndex);
    if (alreadyAnswered) {
        throw new ErrorHandler_1.AppError('You already answered this question', 400);
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
        const room = await Room_1.default.findOne({ roomCode: roomCode.toUpperCase() });
        if (room) {
            pointsEarned = (0, TriviaAPI_1.calculatePoints)(timeToAnswer, room.settings.timePerQuestion, room.settings.difficulty);
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
    const room = await Room_1.default.findOne({ roomCode: roomCode.toUpperCase() });
    if (room) {
        const player = room.players.find((p) => p.userId === req.user?.userId);
        if (player) {
            player.answers = playerState.answers;
            player.score = playerState.score;
            await room.save();
        }
    }
    // Step 11: Notify other players that someone answered
    server_1.io.to(roomCode.toUpperCase()).emit('player:answered', {
        userId: req.user?.userId,
        questionNumber: currentQuestionIndex + 1
    });
    // Step 12: Check if all players answered
    const allAnswered = Array.from(game.players.values()).every((p) => p.answers.length > currentQuestionIndex);
    if (allAnswered && game.questionTimer) {
        // All players answered, skip to next question early
        clearTimeout(game.questionTimer);
        // Reveal answer
        server_1.io.to(roomCode.toUpperCase()).emit('game:answer-reveal', {
            correctAnswer: currentQuestion.correctAnswer,
            explanation: `The correct answer was: ${currentQuestion.correctAnswer}`
        });
        // Update scores
        const scores = await getCurrentScores(roomCode.toUpperCase());
        server_1.io.to(roomCode.toUpperCase()).emit('game:scores', scores);
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
});
/**
 * Get current scores during game
 * Helper function (not an API endpoint)
 */
const getCurrentScores = async (roomCode) => {
    const room = await Room_1.default.findOne({ roomCode });
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
const endGame = async (roomCode) => {
    const game = activeGames.get(roomCode);
    const room = await Room_1.default.findOne({ roomCode });
    if (!game || !room) {
        return;
    }
    // Clear any timers
    if (game.questionTimer) {
        clearTimeout(game.questionTimer);
    }
    // Calculate final results
    const results = [];
    for (const player of room.players) {
        const playerState = game.players.get(player.userId);
        if (!playerState)
            continue;
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
    const savedGame = await Game_1.default.create({
        roomId: room._Id.toString(),
        players: results,
        winner: winner.userId,
        settings: room.settings,
        questions: game.questions.map((q, index) => ({
            category: q.category,
            type: 'multiple',
            difficulty: q.difficulty,
            question: q.question,
            correct_answer: q.correctAnswer,
            incorrect_answers: q.answers.filter((a) => a !== q.correctAnswer)
        })),
        startedAt: new Date(Date.now() - (game.questions.length * room.settings.timePerQuestion * 1000)),
        finishedAt: new Date(),
        duration: game.questions.length * room.settings.timePerQuestion
    });
    // Update user statistics
    // Update user statistics and check achievements
    for (const result of results) {
        const user = await User_1.default.findById(result.userId);
        if (user) {
            // Basic stats
            user.stats.gamesPlayed += 1;
            const isWin = result.rank === 1;
            if (isWin) {
                user.stats.wins += 1;
                // Update current streak
                user.stats.currentStreak = (user.stats.currentStreak || 0) + 1;
                // Update longest streak if current is higher
                if (user.stats.currentStreak > user.stats.longestStreak) {
                    user.stats.longestStreak = user.stats.currentStreak;
                }
            }
            else {
                // Reset current streak on loss
                user.stats.currentStreak = 0;
            }
            user.stats.totalPoints += result.finalScore;
            // Update highest score
            if (result.finalScore > (user.stats.highestScore || 0)) {
                user.stats.highestScore = result.finalScore;
            }
            // Check if perfect game (100% accuracy)
            if (result.accuracy === 100 && isWin) {
                user.stats.perfectGames = (user.stats.perfectGames || 0) + 1;
            }
            // Update fastest win if applicable
            if (isWin) {
                const gameDuration = savedGame.duration;
                if (user.stats.fastestWin === 0 || gameDuration < user.stats.fastestWin) {
                    user.stats.fastestWin = gameDuration;
                }
            }
            await user.save();
            // Check and unlock achievements
            const { checkAndUnlockAchievements } = await Promise.resolve().then(() => __importStar(require('../utils/achievement')));
            const newAchievements = await checkAndUnlockAchievements(result.userId);
            // If achievements unlocked, emit to user
            if (newAchievements.length > 0) {
                server_1.io.to(result.userId).emit('achievements:unlocked', {
                    achievements: newAchievements
                });
            }
            if (newAchievements.length > 0) {
                server_1.io.to(result.userId).emit('achievements:unlocked', {
                    achievements: newAchievements
                });
                // Send notification for each achievement
                for (const achievement of newAchievements) {
                    await (0, NotificationController_1.sendNotification)(result.userId, 'achievement', '🏆 Achievement Unlocked!', `You've unlocked: ${achievement.title}`, { achievementId: achievement.achievementId });
                }
            }
            // After game ends, notify winner
            if (result.rank === 1) {
                await (0, NotificationController_1.sendNotification)(result.userId, 'leaderboard', '🥇 Victory!', `You won the game with ${result.finalScore} points!`, { gameId: savedGame._id, score: result.finalScore });
            }
            // Create activity for game played
            const { default: Activity } = await Promise.resolve().then(() => __importStar(require('../models/Activity')));
            await Activity.createActivity(result.userId, result.username, isWin ? 'game_won' : 'game_played', isWin
                ? `Won a game with ${result.finalScore} points!`
                : `Played a game and scored ${result.finalScore} points`, { gameId: savedGame._id, score: result.finalScore }, user.avatar || 'default-avatar');
            // Create high score activity if applicable
            if (result.finalScore > 500) {
                await Activity.createActivity(result.userId, result.username, 'high_score', `Achieved a high score of ${result.finalScore} points!`, { gameId: savedGame._id, score: result.finalScore }, user.avatar || 'default-avatar');
            }
        }
    }
    // Update room status
    room.status = 'finished';
    await room.save();
    // Send results to all players
    server_1.io.to(roomCode).emit('game:ended', {
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
exports.getGameResults = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { gameId } = req.params;
    // Find game by ID
    const game = await Game_1.default.findById(gameId);
    if (!game) {
        throw new ErrorHandler_1.AppError('Game not found', 404);
    }
    res.status(200).json({
        success: true,
        data: {
            game
        }
    });
});
/**
 * Get user's game history
 * GET /api/games/history
 * Protected route
 */
exports.getGameHistory = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    // Use static method from Game model
    const games = await Game_1.default.getUserHistory(req.user?.userId, limit);
    res.status(200).json({
        success: true,
        data: {
            games,
            count: games.length
        }
    });
});
/**
 * Get global leaderboard
 * GET /api/games/leaderboard
 * Public route
 */
exports.getLeaderboard = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    // Use static method from Game model
    const leaderboard = await Game_1.default.getGlobalLeaderboard(limit);
    res.status(200).json({
        success: true,
        data: {
            leaderboard
        }
    });
});
