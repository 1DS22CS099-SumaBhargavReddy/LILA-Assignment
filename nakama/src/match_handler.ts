/**
 * Server-Authoritative Match Handler for Tic-Tac-Toe
 * 
 * All game logic runs on the server. Clients send move requests,
 * the server validates and applies them, then broadcasts state.
 */

const TICK_RATE = 5; // 5 ticks per second
const TURN_TIME_LIMIT = 30; // 30 seconds per turn in timed mode
const WIN_SCORE = 200;
const DRAW_SCORE = 50;
const LOSS_SCORE = 0;
const LEADERBOARD_ID = "tic_tac_toe_global";

/**
 * Initialize a new match
 */
const matchInit: nkruntime.MatchInitFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    params: { [key: string]: string }
): { state: nkruntime.MatchState; tickRate: number; label: string } {
    
    let gameMode = GameMode.CLASSIC;
    if (params && params["mode"] === "timed") gameMode = GameMode.TIMED;
    else if (params && params["mode"] === "ai") gameMode = GameMode.AI;
    
    const code = params && params["code"] ? params["code"] : "";
    
    const state: MatchState = {
        board: [Mark.EMPTY, Mark.EMPTY, Mark.EMPTY, Mark.EMPTY, Mark.EMPTY, Mark.EMPTY, Mark.EMPTY, Mark.EMPTY, Mark.EMPTY],
        marks: {},
        names: {},
        presences: {},
        currentTurn: "",
        winner: "",
        gameOver: false,
        isDraw: false,
        winningCombo: [],
        moveCount: 0,
        gameMode: gameMode,
        deadline: 0,
        turnTimeLimit: TURN_TIME_LIMIT,
        playing: false,
        playerOrder: [],
        nextDeadlineTick: 0,
        label: JSON.stringify({ 
            mode: params && params["mode"] ? params["mode"] : "classic", 
            open: 1,
            code: code 
        }),
    };

    logger.info("Match initialized. Mode: %s, Code: %s", params && params["mode"] ? params["mode"] : "classic", code);

    return {
        state,
        tickRate: TICK_RATE,
        label: state.label,
    };
};

/**
 * Validate whether a player can join the match
 */
const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presence: nkruntime.Presence,
    metadata: { [key: string]: any }
): { state: nkruntime.MatchState; accept: boolean; rejectMessage?: string } {
    
    const s = state as MatchState;

    // Reject if game already in progress or full
    if (s.playing) {
        return { state: s, accept: false, rejectMessage: "Game already in progress" };
    }

    const playerCount = Object.keys(s.presences).length;
    if (playerCount >= 2) {
        return { state: s, accept: false, rejectMessage: "Match is full" };
    }

    logger.info("Player %s attempting to join", presence.userId);
    return { state: s, accept: true };
};

/**
 * Handle a player joining the match
 */
const matchJoin: nkruntime.MatchJoinFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
    
    const s = state as MatchState;

    for (const presence of presences) {
        s.presences[presence.userId] = presence;

        // Look up account for display name
        let displayName = presence.username || "Player";
        try {
            const account = nk.accountGetId(presence.userId);
            if (account.user && account.user.displayName) {
                displayName = account.user.displayName;
            }
        } catch (e) {
            logger.warn("Could not get account for %s", presence.userId);
        }
        s.names[presence.userId] = displayName;

        // Assign mark
        const existingPlayers = Object.keys(s.marks);
        if (existingPlayers.length === 0) {
            s.marks[presence.userId] = Mark.X;
            s.playerOrder.push(presence.userId);
            logger.info("Player %s (%s) assigned X", displayName, presence.userId);
            
            if (s.gameMode === GameMode.AI) {
                const aiId = "ai_player_id";
                s.marks[aiId] = Mark.O;
                s.playerOrder.push(aiId);
                s.names[aiId] = "Computer";
                logger.info("Player Computer (%s) assigned O", aiId);
            }
        } else if (existingPlayers.length === 1 && s.gameMode !== GameMode.AI) {
            s.marks[presence.userId] = Mark.O;
            s.playerOrder.push(presence.userId);
            logger.info("Player %s (%s) assigned O", displayName, presence.userId);
        }
    }

    // Start the game when 2 players have joined
    const playerCount = Object.keys(s.marks).length;
    if (playerCount === 2 && !s.playing) {
        s.playing = true;
        s.currentTurn = s.playerOrder[0]; // X goes first

        // Set deadline for timed mode
        if (s.gameMode === GameMode.TIMED) {
            s.deadline = Math.floor(Date.now() / 1000) + s.turnTimeLimit;
            s.nextDeadlineTick = tick + (s.turnTimeLimit * TICK_RATE);
        }

        // Update label to closed
        s.label = JSON.stringify({ mode: s.gameMode === GameMode.TIMED ? "timed" : s.gameMode === GameMode.AI ? "ai" : "classic", open: 0 });
        dispatcher.matchLabelUpdate(s.label);

        logger.info("Game starting! %s vs %s", s.names[s.playerOrder[0]], s.names[s.playerOrder[1]]);

        // Broadcast START message to all players
        const startMessage = JSON.stringify({
            board: s.board,
            marks: s.marks,
            names: s.names,
            currentTurn: s.currentTurn,
            gameMode: s.gameMode,
            deadline: s.deadline,
            turnTimeLimit: s.turnTimeLimit,
        });
        dispatcher.broadcastMessage(OpCode.START, startMessage);

        // Also broadcast initial state
        broadcastState(dispatcher, s);
    }

    return { state: s };
};

/**
 * Handle a player leaving the match
 */
const matchLeave: nkruntime.MatchLeaveFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
    
    const s = state as MatchState;

    for (const presence of presences) {
        logger.info("Player %s left the match", presence.userId);
        delete s.presences[presence.userId];

        // If game was in progress and a player leaves, the other wins
        if (s.playing && !s.gameOver) {
            s.gameOver = true;
            // Find the remaining player
            for (const pid of s.playerOrder) {
                if (pid !== presence.userId) {
                    s.winner = pid;
                    break;
                }
            }

            logger.info("Player %s wins by forfeit!", s.winner);

            // Update leaderboard
            updateLeaderboard(nk, logger, s);

            // Broadcast game over
            const doneMessage = JSON.stringify({
                winner: s.winner,
                winnerName: s.names[s.winner] || "Unknown",
                reason: "forfeit",
                board: s.board,
                isDraw: false,
                winningCombo: [],
            });
            dispatcher.broadcastMessage(OpCode.DONE, doneMessage);
        }
    }

    // If no players left, terminate the match
    const remainingCount = Object.keys(s.presences).length;
    if (remainingCount === 0) {
        return null; // Terminate match
    }

    return { state: s };
};

/**
 * Main game loop — runs every tick
 */
const matchLoop: nkruntime.MatchLoopFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    messages: nkruntime.MatchMessage[]
): { state: nkruntime.MatchState } | null {
    
    const s = state as MatchState;

    // If game is over, wait a bit then terminate
    if (s.gameOver) {
        // Keep the match alive for a few seconds so clients receive the DONE message
        if (Object.keys(s.presences).length === 0) {
            return null;
        }
        return { state: s };
    }

    // Don't process if game hasn't started
    if (!s.playing) {
        return { state: s };
    }

    // Check timer in timed mode
    if (s.gameMode === GameMode.TIMED && s.deadline > 0) {
        const now = Math.floor(Date.now() / 1000);
        if (now >= s.deadline) {
            // Time's up! Current player forfeits their turn
            logger.info("Time's up for player %s!", s.names[s.currentTurn]);
            
            s.gameOver = true;
            // The other player wins
            for (const pid of s.playerOrder) {
                if (pid !== s.currentTurn) {
                    s.winner = pid;
                    break;
                }
            }

            updateLeaderboard(nk, logger, s);

            const doneMessage = JSON.stringify({
                winner: s.winner,
                winnerName: s.names[s.winner] || "Unknown",
                reason: "timeout",
                board: s.board,
                isDraw: false,
                winningCombo: [],
            });
            dispatcher.broadcastMessage(OpCode.DONE, doneMessage);
            return { state: s };
        }

        // Broadcast timer sync every second (every TICK_RATE ticks)
        if (tick % TICK_RATE === 0) {
            const remaining = s.deadline - now;
            const timerMessage = JSON.stringify({
                remaining: remaining,
                currentTurn: s.currentTurn,
            });
            dispatcher.broadcastMessage(OpCode.TIMER, timerMessage);
        }
    }

    // Process incoming messages
    for (const message of messages) {
        if (message.opCode === OpCode.MOVE) {
            processMove(logger, nk, dispatcher, s, message);
        }
    }

    // Process AI Turn
    if (s.gameMode === GameMode.AI && s.currentTurn === "ai_player_id" && s.playing && !s.gameOver) {
        if (!s.aiWaitTick) {
            s.aiWaitTick = tick + TICK_RATE; // Wait 1 second
        } else if (tick >= s.aiWaitTick) {
            const aiMark = s.marks["ai_player_id"];
            const playerMark = aiMark === Mark.X ? Mark.O : Mark.X;
            let moveIdx = -1;

            // 1. Can AI win?
            for (let i = 0; i < 9; i++) {
                if (s.board[i] === Mark.EMPTY) {
                   s.board[i] = aiMark;
                   if (checkWin(s.board, aiMark).won) { moveIdx = i; }
                   s.board[i] = Mark.EMPTY;
                   if (moveIdx !== -1) break;
                }
            }

            // 2. Can player win? Block it.
            if (moveIdx === -1) {
                for (let i = 0; i < 9; i++) {
                    if (s.board[i] === Mark.EMPTY) {
                       s.board[i] = playerMark;
                       if (checkWin(s.board, playerMark).won) { moveIdx = i; }
                       s.board[i] = Mark.EMPTY;
                       if (moveIdx !== -1) break;
                    }
                }
            }

            // 3. Take center
            if (moveIdx === -1 && s.board[4] === Mark.EMPTY) {
                moveIdx = 4;
            }

            // 4. Take random
            if (moveIdx === -1) {
                const empty = [];
                for (let i = 0; i < 9; i++) if (s.board[i] === Mark.EMPTY) empty.push(i);
                if (empty.length > 0) {
                    moveIdx = empty[Math.floor(Math.random() * empty.length)];
                }
            }

            if (moveIdx !== -1) {
                s.board[moveIdx] = aiMark;
                s.moveCount++;
                const winResult = checkWin(s.board, aiMark);
                
                if (winResult.won) {
                    s.gameOver = true;
                    s.winner = "ai_player_id";
                    s.winningCombo = winResult.combo;
                    updateLeaderboard(nk, logger, s);
                    broadcastState(dispatcher, s);
                    const doneMessage = JSON.stringify({
                        winner: s.winner, winnerName: s.names[s.winner], reason: "win", board: s.board, isDraw: false, winningCombo: s.winningCombo
                    });
                    dispatcher.broadcastMessage(OpCode.DONE, doneMessage);
                } else if (s.moveCount >= 9) {
                    s.gameOver = true;
                    s.isDraw = true;
                    updateLeaderboard(nk, logger, s);
                    broadcastState(dispatcher, s);
                    const doneMessage = JSON.stringify({
                        winner: "", winnerName: "", reason: "draw", board: s.board, isDraw: true, winningCombo: []
                    });
                    dispatcher.broadcastMessage(OpCode.DONE, doneMessage);
                } else {
                    // Switch turn
                    for (const pid of s.playerOrder) {
                        if (pid !== "ai_player_id") {
                            s.currentTurn = pid;
                            break;
                        }
                    }
                    broadcastState(dispatcher, s);
                }
            }
            s.aiWaitTick = undefined; // reset
        }
    }

    return { state: s };
};

/**
 * Process a move from a player
 */
function processMove(
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    state: MatchState,
    message: nkruntime.MatchMessage
): void {
    const senderId = message.sender.userId;

    // Validate: is it this player's turn?
    if (senderId !== state.currentTurn) {
        const rejectMsg = JSON.stringify({ reason: "Not your turn" });
        dispatcher.broadcastMessage(OpCode.REJECTED, rejectMsg, [message.sender]);
        logger.warn("Player %s tried to move out of turn", senderId);
        return;
    }

    // Parse the move
    let move: MoveMessage;
    try {
        // Decode ArrayBuffer to string
        const dataStr = String.fromCharCode.apply(null, new Uint8Array(message.data) as unknown as number[]);
        move = JSON.parse(dataStr);
    } catch (e) {
        const rejectMsg = JSON.stringify({ reason: "Invalid message format" });
        dispatcher.broadcastMessage(OpCode.REJECTED, rejectMsg, [message.sender]);
        return;
    }

    const position = move.position;

    // Validate: position in range
    if (position < 0 || position > 8) {
        const rejectMsg = JSON.stringify({ reason: "Position out of range" });
        dispatcher.broadcastMessage(OpCode.REJECTED, rejectMsg, [message.sender]);
        logger.warn("Player %s sent invalid position %d", senderId, position);
        return;
    }

    // Validate: cell is empty
    if (state.board[position] !== Mark.EMPTY) {
        const rejectMsg = JSON.stringify({ reason: "Cell already occupied" });
        dispatcher.broadcastMessage(OpCode.REJECTED, rejectMsg, [message.sender]);
        logger.warn("Player %s tried to play on occupied cell %d", senderId, position);
        return;
    }

    // Apply the move
    const playerMark = state.marks[senderId];
    state.board[position] = playerMark;
    state.moveCount++;

    logger.info("Player %s (%s) placed %s at position %d",
        state.names[senderId], senderId,
        playerMark === Mark.X ? "X" : "O",
        position
    );

    // Check for winner
    const winResult = checkWin(state.board, playerMark);
    if (winResult.won) {
        state.gameOver = true;
        state.winner = senderId;
        state.winningCombo = winResult.combo;
        
        logger.info("Player %s wins!", state.names[senderId]);
        
        updateLeaderboard(nk, logger, state);

        broadcastState(dispatcher, state);

        const doneMessage = JSON.stringify({
            winner: state.winner,
            winnerName: state.names[state.winner],
            reason: "win",
            board: state.board,
            isDraw: false,
            winningCombo: state.winningCombo,
        });
        dispatcher.broadcastMessage(OpCode.DONE, doneMessage);
        return;
    }

    // Check for draw
    if (state.moveCount >= 9) {
        state.gameOver = true;
        state.isDraw = true;
        
        logger.info("Game ended in a draw!");

        updateLeaderboard(nk, logger, state);

        broadcastState(dispatcher, state);

        const doneMessage = JSON.stringify({
            winner: "",
            winnerName: "",
            reason: "draw",
            board: state.board,
            isDraw: true,
            winningCombo: [],
        });
        dispatcher.broadcastMessage(OpCode.DONE, doneMessage);
        return;
    }

    // Switch turns
    state.currentTurn = state.playerOrder[0] === senderId ? state.playerOrder[1] : state.playerOrder[0];

    // Reset timer for timed mode
    if (state.gameMode === GameMode.TIMED) {
        state.deadline = Math.floor(Date.now() / 1000) + state.turnTimeLimit;
    }

    // Broadcast updated state
    broadcastState(dispatcher, state);
}

/**
 * Check if a mark has won
 */
function checkWin(board: Mark[], mark: Mark): { won: boolean; combo: number[] } {
    for (const condition of WIN_CONDITIONS) {
        if (board[condition[0]] === mark && board[condition[1]] === mark && board[condition[2]] === mark) {
            return { won: true, combo: condition };
        }
    }
    return { won: false, combo: [] };
}

/**
 * Broadcast the current game state to all players
 */
function broadcastState(dispatcher: nkruntime.MatchDispatcher, state: MatchState): void {
    const stateMessage = JSON.stringify({
        board: state.board,
        currentTurn: state.currentTurn,
        marks: state.marks,
        names: state.names,
        moveCount: state.moveCount,
        deadline: state.deadline,
        gameMode: state.gameMode,
        winningCombo: state.winningCombo,
    });
    dispatcher.broadcastMessage(OpCode.STATE, stateMessage);
}

/**
 * Update the leaderboard after a game ends
 */
function updateLeaderboard(nk: nkruntime.Nakama, logger: nkruntime.Logger, state: MatchState): void {
    try {
        for (const playerId of state.playerOrder) {
            if (playerId === "ai_player_id") continue; // Skip AI player stats

            let score: number;
            let metadata: { [key: string]: any } = {};

            if (state.isDraw) {
                score = DRAW_SCORE;
                metadata["result"] = "draw";
            } else if (playerId === state.winner) {
                score = WIN_SCORE;
                metadata["result"] = "win";
            } else {
                score = LOSS_SCORE;
                metadata["result"] = "loss";
            }

            // Update wins leaderboard
            nk.leaderboardRecordWrite(
                LEADERBOARD_ID,
                playerId,
                state.names[playerId] || "",
                score,
                0,
                metadata
            );

            // Also persist W/L/D in storage for detailed stats
            updatePlayerStats(nk, logger, playerId, state, metadata["result"]);
        }
    } catch (e) {
        logger.error("Failed to update leaderboard: %s", e);
    }
}

/**
 * Update player statistics in storage
 */
function updatePlayerStats(
    nk: nkruntime.Nakama,
    logger: nkruntime.Logger,
    playerId: string,
    state: MatchState,
    result: string
): void {
    try {
        const collection = "player_stats";
        const key = "tictactoe";

        // Read existing stats
        let wins = 0, losses = 0, draws = 0, streak = 0, totalGames = 0;

        const objects = nk.storageRead([{
            collection: collection,
            key: key,
            userId: playerId,
        }]);

        if (objects && objects.length > 0) {
            const existing = objects[0].value as any;
            wins = existing.wins || 0;
            losses = existing.losses || 0;
            draws = existing.draws || 0;
            streak = existing.streak || 0;
            totalGames = existing.totalGames || 0;
        }

        totalGames++;

        if (result === "win") {
            wins++;
            streak = streak >= 0 ? streak + 1 : 1;
        } else if (result === "loss") {
            losses++;
            streak = streak <= 0 ? streak - 1 : -1;
        } else {
            draws++;
            streak = 0;
        }

        const stats = {
            wins: wins,
            losses: losses,
            draws: draws,
            streak: streak,
            totalGames: totalGames,
            lastPlayed: Date.now(),
        };

        nk.storageWrite([{
            collection: collection,
            key: key,
            userId: playerId,
            value: stats,
            permissionRead: 2 as nkruntime.ReadPermissionValues, // Public read
            permissionWrite: 0 as nkruntime.WritePermissionValues, // Only server can write
        }]);

    } catch (e) {
        logger.error("Failed to update player stats for %s: %s", playerId, e);
    }
}

/**
 * Handle match termination
 */
const matchTerminate: nkruntime.MatchTerminateFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    graceSeconds: number
): { state: nkruntime.MatchState } | null {
    
    logger.info("Match terminating");
    return { state };
};

/**
 * Handle external signals
 */
const matchSignal: nkruntime.MatchSignalFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    data: string
): { state: nkruntime.MatchState; data?: string } | null {
    
    logger.info("Match signal received: %s", data);
    return { state, data: "signal_received" };
};
