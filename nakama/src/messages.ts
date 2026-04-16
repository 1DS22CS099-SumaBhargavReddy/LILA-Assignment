/**
 * OpCodes for client-server communication
 */
const OpCode = {
    MOVE: 1,        // Client -> Server: player makes a move
    STATE: 2,       // Server -> Client: broadcast updated game state
    DONE: 3,        // Server -> Client: game over notification
    REJECTED: 4,    // Server -> Client: invalid move rejected
    TIMER: 5,       // Server -> Client: timer sync
    START: 6,       // Server -> Client: game has started
};

/**
 * Board mark types
 */
const enum Mark {
    EMPTY = 0,
    X = 1,
    O = 2,
}

/**
 * Game modes
 */
const enum GameMode {
    CLASSIC = 0,
    TIMED = 1,
    AI = 2,
}

/**
 * Match state maintained on the server
 */
interface MatchState {
    /** 3x3 board represented as a flat array of 9 cells */
    board: Mark[];
    /** Map of user ID -> mark assignment */
    marks: { [userId: string]: Mark };
    /** Map of user ID -> display name */
    names: { [userId: string]: string };
    /** Current active presences in the match */
    presences: { [userId: string]: nkruntime.Presence };
    /** User ID of the player whose turn it is */
    currentTurn: string;
    /** Winner user ID, or empty if no winner yet */
    winner: string;
    /** Whether the game has ended */
    gameOver: boolean;
    /** Whether the game ended in a draw */
    isDraw: boolean;
    /** Winning combination indices */
    winningCombo: number[];
    /** Number of moves made */
    moveCount: number;
    /** Game mode */
    gameMode: GameMode;
    /** Deadline for current move in timed mode (unix timestamp in seconds) */
    deadline: number;
    /** Turn time limit in seconds for timed mode */
    turnTimeLimit: number;
    /** Whether the match is currently playing */
    playing: boolean;
    /** Player order for turn tracking */
    playerOrder: string[];
    /** Next game deadline tick counter */
    nextDeadlineTick: number;
    /** The label for matchmaking */
    label: string;
    /** Next game deadline tick counter for AI */
    aiWaitTick?: number;
}

/**
 * Client move message payload
 */
interface MoveMessage {
    position: number; // 0-8, cell index on the board
}

/**
 * Win condition combinations
 */
const WIN_CONDITIONS: number[][] = [
    [0, 1, 2], // top row
    [3, 4, 5], // middle row
    [6, 7, 8], // bottom row
    [0, 3, 6], // left column
    [1, 4, 7], // middle column
    [2, 5, 8], // right column
    [0, 4, 8], // diagonal top-left to bottom-right
    [2, 4, 6], // diagonal top-right to bottom-left
];
