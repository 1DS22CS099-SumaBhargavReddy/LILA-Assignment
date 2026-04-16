/**
 * Main entry point for the Nakama TypeScript server module.
 * Registers match handlers, RPCs, and creates leaderboards.
 */

const InitModule: nkruntime.InitModule = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    initializer: nkruntime.Initializer
): void {
    logger.info("=== Tic-Tac-Toe Module Loading ===");

    // Create the global leaderboard
    try {
        nk.leaderboardCreate(
            "tic_tac_toe_global",   // ID
            false,                    // Not authoritative (we write from server anyway)
            nkruntime.SortOrder.DESCENDING,
            nkruntime.Operator.INCREMENTAL,
            undefined,               // No reset schedule
            undefined                // No metadata
        );
        logger.info("Leaderboard 'tic_tac_toe_global' created/verified.");
    } catch (e) {
        logger.error("Error creating leaderboard: %s", e);
    }

    // Register the match handler
    initializer.registerMatch("tic-tac-toe", {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal,
    });
    logger.info("Match handler 'tic-tac-toe' registered.");

    // Register RPC functions
    initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
    initializer.registerRpc("get_player_stats", rpcGetPlayerStats);
    initializer.registerRpc("start_ai_match", rpcStartAiMatch);
    initializer.registerRpc("create_room_match", rpcCreateRoomMatch);
    initializer.registerRpc("join_room_match", rpcJoinRoomMatch);
    logger.info("RPC functions registered.");

    // Register matchmaker matched hook to create authoritative matches
    initializer.registerMatchmakerMatched(matchmakerMatched);
    logger.info("Matchmaker hook registered.");

    logger.info("=== Tic-Tac-Toe Module Loaded Successfully ===");
};

/**
 * Called when the matchmaker finds compatible players.
 * Creates an authoritative match for them to join.
 */
const matchmakerMatched: nkruntime.MatchmakerMatchedFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    matches: nkruntime.MatchmakerResult[]
): string | void {
    // Determine game mode from the first match's properties
    let mode = "classic";
    if (matches.length > 0 && matches[0].properties) {
        const stringProps = matches[0].properties.stringProperties;
        if (stringProps && (stringProps as any)["mode"]) {
            mode = (stringProps as any)["mode"];
        }
    }

    logger.info("Matchmaker found %d players. Creating %s match.", matches.length, mode);

    // Create an authoritative match
    const matchId = nk.matchCreate("tic-tac-toe", { mode: mode });
    logger.info("Created match: %s", matchId);

    return matchId;
};
