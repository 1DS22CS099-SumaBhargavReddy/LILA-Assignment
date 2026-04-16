/**
 * RPC Functions for Tic-Tac-Toe
 * Called by clients to fetch leaderboard data and player stats
 */

const LEADERBOARD_RPC_ID = "tic_tac_toe_global";

/**
 * Get global leaderboard with top players
 */
const rpcGetLeaderboard: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        const limit = 20;
        const records = nk.leaderboardRecordsList(LEADERBOARD_RPC_ID, undefined, limit);

        const leaderboard: any[] = [];

        if (records && records.records) {
            for (const record of records.records) {
                // Get player stats from storage
                let stats = { wins: 0, losses: 0, draws: 0, streak: 0, totalGames: 0 };
                try {
                    const stored = nk.storageRead([{
                        collection: "player_stats",
                        key: "tictactoe",
                        userId: record.ownerId,
                    }]);
                    if (stored && stored.length > 0) {
                        stats = stored[0].value as any;
                    }
                } catch(e) {
                    // Use defaults
                }

                leaderboard.push({
                    rank: record.rank,
                    userId: record.ownerId,
                    username: record.username || "Unknown",
                    score: record.score,
                    wins: stats.wins,
                    losses: stats.losses,
                    draws: stats.draws,
                    streak: stats.streak,
                    totalGames: stats.totalGames,
                });
            }
        }

        return JSON.stringify({ leaderboard: leaderboard });
    } catch (e) {
        logger.error("Error fetching leaderboard: %s", e);
        return JSON.stringify({ leaderboard: [], error: "Failed to fetch leaderboard" });
    }
};

/**
 * Get stats for a specific player
 */
const rpcGetPlayerStats: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        const userId = ctx.userId;
        
        if (!userId) {
            return JSON.stringify({ error: "Not authenticated" });
        }

        let stats = { wins: 0, losses: 0, draws: 0, streak: 0, totalGames: 0, lastPlayed: 0 };

        const stored = nk.storageRead([{
            collection: "player_stats",
            key: "tictactoe",
            userId: userId,
        }]);

        if (stored && stored.length > 0) {
            stats = stored[0].value as any;
        }

        // Get leaderboard rank
        let rank = 0;
        let score = 0;
        try {
            const records = nk.leaderboardRecordsList(LEADERBOARD_RPC_ID, [userId], 1);
            if (records && records.ownerRecords && records.ownerRecords.length > 0) {
                rank = records.ownerRecords[0].rank;
                score = records.ownerRecords[0].score;
            }
        } catch(e) {
            // No records yet
        }

        return JSON.stringify({
            userId: userId,
            rank: rank,
            score: score,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            streak: stats.streak,
            totalGames: stats.totalGames,
            lastPlayed: stats.lastPlayed,
        });
    } catch (e) {
        logger.error("Error fetching player stats: %s", e);
        return JSON.stringify({ error: "Failed to fetch stats" });
    }
};

/**
 * Start a single-player match against the AI
 */
const rpcStartAiMatch: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        const matchId = nk.matchCreate("tic-tac-toe", { mode: "ai" });
        return JSON.stringify({ matchId: matchId });
    } catch (e) {
        logger.error("Error creating AI match: %s", e);
        return JSON.stringify({ error: "Failed to create match" });
    }
};

/**
 * Create a private room match with a human-readable code
 */
const rpcCreateRoomMatch: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        let code = "";
        
        // Parse payload (can be string or object depending on source)
        if (payload) {
            try {
                let input = JSON.parse(payload);
                // Handle double-stringified JSON (common in some client-server translations)
                if (typeof input === "string") {
                    input = JSON.parse(input);
                }

                if (input.code && typeof input.code === "string") {
                    code = input.code.toUpperCase().trim();
                } else if (input.custom_id && typeof input.custom_id === "string") {
                    code = input.custom_id.toUpperCase().trim();
                }
            } catch (e) {
                // If parsing fails, payload might be a raw string
                if (payload.length > 0 && payload.indexOf("{") === -1) {
                    code = payload.toUpperCase().trim();
                }
            }
        }

        // Generate a 6-char alphanumeric room code if not provided or empty
        if (!code) {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            for (let i = 0; i < 6; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
        } else {
            // If custom code is provided, check if room already exists
            const limit = 1;
            const query = `+label.mode:room +label.code:${code} +label.open:1`;
            const matchList = nk.matchList(limit, true, null, null, null, query);
            if (matchList && matchList.length > 0) {
                return JSON.stringify({ error: "Room with this ID already exists. Try another." });
            }
        }

        const matchId = nk.matchCreate("tic-tac-toe", { mode: "room", code: code });
        logger.info("Created room match %s with code %s", matchId, code);
        return JSON.stringify({ matchId: matchId, code: code });
    } catch (e) {
        logger.error("Error creating room match: %s", e);
        return JSON.stringify({ error: "Failed to create room" });
    }
};

/**
 * Join a room match by code
 */
const rpcJoinRoomMatch: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        let input = JSON.parse(payload);
        if (typeof input === "string") {
            input = JSON.parse(input);
        }
        
        const code = ((input as any).code || "").toUpperCase().trim();

        if (!code || code.length < 3 || code.length > 12) {
            return JSON.stringify({ error: "Invalid room code. IDs must be 3-12 characters." });
        }

        // Search for open rooms — scan running matches with matching label
        const limit = 50;
        const query = `+label.mode:room +label.code:${code} +label.open:1`;
        const matchList = nk.matchList(limit, true, null, null, null, query);

        if (!matchList || matchList.length === 0) {
            return JSON.stringify({ error: "Room not found. Check the code and try again." });
        }

        const match = matchList[0];
        logger.info("Found room match %s for code %s", match.matchId, code);
        return JSON.stringify({ matchId: match.matchId });
    } catch (e) {
        logger.error("Error joining room match: %s", e);
        return JSON.stringify({ error: "Failed to join room" });
    }
};

