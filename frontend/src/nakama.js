/**
 * Nakama Client Singleton
 * Handles authentication, socket connection, matchmaking, and game communication.
 */
import { Client } from "@heroiclabs/nakama-js";

// Configure server connection
const NAKAMA_SERVER_KEY = "defaultkey";
const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const NAKAMA_USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";

// OpCodes matching server-side definitions
export const OpCode = {
  MOVE: 1,
  STATE: 2,
  DONE: 3,
  REJECTED: 4,
  TIMER: 5,
  START: 6,
};

class NakamaClient {
  constructor() {
    this.client = new Client(NAKAMA_SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL);
    this.session = null;
    this.socket = null;
    this.matchId = null;
    this.ticketId = null;

    // Event callbacks
    this.onMatchData = null;
    this.onMatchPresence = null;
    this.onMatchmakerMatched = null;
    this.onDisconnect = null;
    this.onError = null;
  }

  /**
   * Get or generate a unique device ID for this browser
   */
  getDeviceId() {
    let deviceId = sessionStorage.getItem("nakama_device_id");
    if (!deviceId) {
      deviceId = "browser_" + crypto.randomUUID();
      sessionStorage.setItem("nakama_device_id", deviceId);
    }
    return deviceId;
  }

  /**
   * Authenticate with Nakama using device ID
   */
  async authenticate(displayName) {
    try {
      const deviceId = this.getDeviceId();
      this.session = await this.client.authenticateDevice(deviceId, true, displayName);

      // Update display name if provided
      if (displayName && displayName !== this.session.username) {
        await this.client.updateAccount(this.session, {
          display_name: displayName,
        });
      }

      console.log("Authenticated:", this.session.user_id, displayName);
      return this.session;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  }

  /**
   * Connect WebSocket for real-time communication
   */
  async connectSocket() {
    if (!this.session) {
      throw new Error("Must authenticate before connecting socket");
    }

    try {
      const trace = false;
      this.socket = this.client.createSocket(NAKAMA_USE_SSL, trace);

      // Set up event handlers before connecting
      this.socket.ondisconnect = (event) => {
        console.log("Socket disconnected:", event);
        if (this.onDisconnect) this.onDisconnect(event);
      };

      this.socket.onerror = (event) => {
        console.error("Socket error:", event);
        if (this.onError) this.onError(event);
      };

      // Connect
      await this.socket.connect(this.session, true);
      console.log("Socket connected successfully");

      // Set up match data handler
      this.socket.onmatchdata = (result) => {
        console.log("[nakama.js] Raw onmatchdata received:", result);
        if (this.onMatchData) {
          try {
            const decoded = new TextDecoder().decode(result.data);
            const data = JSON.parse(decoded);
            this.onMatchData(result.op_code, data, result);
          } catch (e) {
            console.error("[nakama.js] Failed to parse match data:", e, result);
          }
        }
      };

      // Set up match presence handler
      this.socket.onmatchpresence = (result) => {
        if (this.onMatchPresence) {
          this.onMatchPresence(result);
        }
      };

      // Set up matchmaker matched handler
      this.socket.onmatchmakermatched = async (matched) => {
        console.log("Matchmaker found a match:", matched);
        this.ticketId = null;

        // Join the matched match
        const match = await this.socket.joinMatch(matched.match_id, matched.token);
        this.matchId = match.match_id;

        if (this.onMatchmakerMatched) {
          this.onMatchmakerMatched(match, matched);
        }
      };

      return this.socket;
    } catch (error) {
      console.error("Socket connection failed:", error);
      throw error;
    }
  }

  /**
   * Find a match using the matchmaker
   */
  async findMatch(mode = "classic") {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    try {
      const minPlayers = 2;
      const maxPlayers = 2;
      const query = `+properties.mode:${mode}`;
      const stringProperties = { mode: mode };
      const numericProperties = {};

      const ticket = await this.socket.addMatchmaker(
        query,
        minPlayers,
        maxPlayers,
        stringProperties,
        numericProperties
      );

      this.ticketId = ticket.ticket;
      console.log("Matchmaking ticket:", this.ticketId);
      return this.ticketId;
    } catch (error) {
      console.error("Matchmaking failed:", error);
      throw error;
    }
  }

  /**
   * Start an AI match directly
   */
  async startAiMatch() {
    if (!this.client || !this.session || !this.socket) {
      throw new Error("Not authenticated or socket not connected");
    }

    try {
      const result = await this.client.rpc(this.session, "start_ai_match", "{}");
      const data = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
      
      if (data.error) {
        throw new Error(data.error);
      }

      this.ticketId = null;

      // Join the matched match
      const match = await this.socket.joinMatch(data.matchId);
      this.matchId = match.match_id;

      if (this.onMatchmakerMatched) {
        this.onMatchmakerMatched(match, { match_id: match.match_id });
      }
      return match;
    } catch (error) {
      console.error("Start AI match failed:", error);
      throw error;
    }
  }

  /**
   * Cancel matchmaking
   */
  async cancelMatchmaking() {
    if (!this.socket || !this.ticketId) return;

    try {
      await this.socket.removeMatchmaker(this.ticketId);
      this.ticketId = null;
      console.log("Matchmaking cancelled");
    } catch (error) {
      console.error("Cancel matchmaking failed:", error);
    }
  }

  /**
   * Send a move to the server
   */
  async sendMove(position) {
    if (!this.socket || !this.matchId) {
      throw new Error("Not in a match");
    }

    const data = JSON.stringify({ position: position });
    await this.socket.sendMatchState(this.matchId, OpCode.MOVE, data);
    console.log("Sent move:", position);
  }

  /**
   * Leave the current match
   */
  async leaveMatch() {
    if (!this.socket || !this.matchId) return;

    try {
      await this.socket.leaveMatch(this.matchId);
      this.matchId = null;
      console.log("Left match");
    } catch (error) {
      console.error("Leave match failed:", error);
    }
  }

  /**
   * Get leaderboard data via RPC
   */
  async getLeaderboard() {
    if (!this.client || !this.session) {
      throw new Error("Not authenticated");
    }

    try {
      const result = await this.client.rpc(this.session, "get_leaderboard", "{}");
      return JSON.parse(result.payload);
    } catch (error) {
      console.error("Get leaderboard failed:", error);
      return { leaderboard: [] };
    }
  }

  /**
   * Get player stats via RPC
   */
  async getPlayerStats() {
    if (!this.client || !this.session) {
      throw new Error("Not authenticated");
    }

    try {
      const result = await this.client.rpc(this.session, "get_player_stats", "{}");
      return JSON.parse(result.payload);
    } catch (error) {
      console.error("Get player stats failed:", error);
      return {};
    }
  }

  /**
   * Get current user ID
   */
  getUserId() {
    return this.session?.user_id || null;
  }

  /**
   * Get current username
   */
  getUsername() {
    return this.session?.username || null;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket !== null;
  }

  /**
   * Create a private room match
   */
  async createRoomMatch(code = null) {
    if (!this.client || !this.session) throw new Error('Not authenticated');
    const payload = code ? JSON.stringify({ code }) : '{}';
    const result = await this.client.rpc(this.session, 'create_room_match', payload);
    const data = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
    if (data.error) throw new Error(data.error);
    return { matchId: data.matchId, code: data.code };
  }

  /**
   * Join a room match by code (Player 2 flow)
   */
  async joinRoomMatch(code) {
    if (!this.client || !this.session) throw new Error('Not authenticated');
    const result = await this.client.rpc(this.session, 'join_room_match', JSON.stringify({ code }));
    const data = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
    if (data.error) throw new Error(data.error);

    const match = await this.socket.joinMatch(data.matchId);
    this.matchId = match.match_id;
    return { matchId: match.match_id };
  }

  /**
   * Join a created room (Player 1 flow — joins match they created)
   */
  async joinCreatedRoom(matchId) {
    if (!this.socket) throw new Error('Socket not connected');
    const match = await this.socket.joinMatch(matchId);
    this.matchId = match.match_id;
    return match;
  }

  /**
   * Disconnect everything cleanly
   */
  async disconnect() {
    try { if (this.ticketId) await this.cancelMatchmaking(); } catch {}
    try { if (this.matchId) await this.leaveMatch(); } catch {}
    if (this.socket) {
      this.socket.disconnect(false);
      this.socket = null;
    }
    this.session = null;
    this.matchId = null;
  }
}

// Singleton instance
const nakamaClient = new NakamaClient();
export default nakamaClient;
