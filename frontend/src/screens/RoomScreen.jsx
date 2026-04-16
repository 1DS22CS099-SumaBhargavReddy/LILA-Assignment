import { useState, useRef } from 'react';
import nakamaClient from '../nakama';

export default function RoomScreen({ playerName, onMatchFound, onBack }) {
  // View: 'choose' | 'create' | 'join'
  const [view, setView] = useState('choose');

  // Create room state
  const [customId, setCustomId] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join room state
  const [joinId, setJoinId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // ── Create ──────────────────────────────────────
  const handleCreateRoom = async () => {
    const id = customId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCreating(true);
    setCreateError('');
    try {
      const { matchId, code } = await nakamaClient.createRoomMatch(id || null);
      setGeneratedCode(code);
      setWaiting(true);
      await nakamaClient.joinCreatedRoom(matchId);
      onMatchFound('waiting', code, matchId);
    } catch (e) {
      setCreateError(e.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  // ── Join ────────────────────────────────────────
  const handleJoinRoom = async () => {
    const code = joinId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) { setJoinError('Enter a Room ID'); return; }
    setJoining(true);
    setJoinError('');
    try {
      const { matchId } = await nakamaClient.joinRoomMatch(code);
      onMatchFound('joining', code, matchId);
    } catch (e) {
      setJoinError(e.message || 'Room not found. Double-check the ID.');
    } finally {
      setJoining(false);
    }
  };

  // ── Shared back-to-choose handler ────────────────
  const backToChoose = () => {
    setView('choose');
    setCustomId('');
    setGeneratedCode('');
    setWaiting(false);
    setCreateError('');
    setJoinId('');
    setJoinError('');
  };

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div className="room-screen">
      {/* ── HOME NAV ── always visible */}
      <nav className="room-nav">
        <button className="room-home-btn" onClick={onBack}>
          🏠 Home
        </button>
        {view !== 'choose' && (
          <button className="room-back-pill" onClick={backToChoose}>
            ← Back
          </button>
        )}
      </nav>

      {/* ── CHOOSE VIEW ── */}
      {view === 'choose' && (
        <div className="room-choose animate-fade-in-up">
          <div className="room-choose-header">
            <span className="room-choose-emoji">🔑</span>
            <h2 className="room-choose-title">Private Room</h2>
            <p className="room-choose-sub">Create your own room or join a friend's</p>
          </div>
          <div className="room-choose-cards">
            <button className="room-option-card" onClick={() => setView('create')}>
              <span className="roc-icon">🎮</span>
              <span className="roc-label">Create Room</span>
              <span className="roc-desc">Set your own Game ID and share it</span>
              <span className="roc-arrow">→</span>
            </button>
            <button className="room-option-card roc-join" onClick={() => setView('join')}>
              <span className="roc-icon">🚪</span>
              <span className="roc-label">Join Room</span>
              <span className="roc-desc">Enter a friend's Game ID to join</span>
              <span className="roc-arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CREATE VIEW ── */}
      {view === 'create' && !waiting && (
        <div className="room-panel glass-card animate-fade-in-up">
          <div className="room-panel-icon">🎮</div>
          <h2 className="room-panel-title">Create a Room</h2>
          <p className="room-panel-sub">
            Choose your own Game ID or leave it blank to<br />get a random one
          </p>

          <div className="room-id-input-wrap">
            <label className="room-id-label">Game ID (optional)</label>
            <input
              className="room-id-input"
              type="text"
              placeholder="e.g. MYGAME · leave blank = random"
              value={customId}
              onChange={e => { setCustomId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)); setCreateError(''); }}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={12}
            />
            <div className="room-id-hint">Letters & numbers only · max 12 chars</div>
          </div>

          {createError && <p className="room-error">{createError}</p>}

          <button
            className="btn btn-primary room-action-btn"
            onClick={handleCreateRoom}
            disabled={creating}
          >
            {creating ? (
              <span className="room-loading-row">
                <span className="orbit-mini" />
                Creating…
              </span>
            ) : '🚀 Create Room'}
          </button>
        </div>
      )}

      {/* ── WAITING VIEW (after create) ── */}
      {view === 'create' && waiting && (
        <div className="room-panel glass-card animate-fade-in-up room-waiting-panel">
          <div className="room-panel-icon">⏳</div>
          <h2 className="room-panel-title">Room Created!</h2>
          <p className="room-panel-sub">Share this Game ID with your friend</p>

          <div className="room-code-showcase">
            {generatedCode.split('').map((ch, i) => (
              <span key={i} className="room-code-char">{ch}</span>
            ))}
          </div>

          <div className="room-copy-row">
            <button
              className="btn btn-secondary room-copy-btn"
              onClick={() => navigator.clipboard.writeText(generatedCode)}
            >
              📋 Copy ID
            </button>
          </div>

          <div className="room-waiting-status">
            <span className="room-pulse-dot" />
            <span>Waiting for Player 2 to join…</span>
          </div>

          <p className="room-id-hint" style={{ textAlign: 'center', marginTop: 16 }}>
            Player 2 must type this exact code on the Join screen
          </p>
        </div>
      )}

      {/* ── JOIN VIEW ── */}
      {view === 'join' && (
        <div className="room-panel glass-card animate-fade-in-up">
          <div className="room-panel-icon">🚪</div>
          <h2 className="room-panel-title">Join a Room</h2>
          <p className="room-panel-sub">Enter the Game ID your friend shared</p>

          <div className="room-id-input-wrap">
            <label className="room-id-label">Game ID</label>
            <input
              className="room-id-input"
              type="text"
              placeholder="Paste or type Game ID…"
              value={joinId}
              onChange={e => { setJoinId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)); setJoinError(''); }}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={12}
              onKeyDown={e => e.key === 'Enter' && !joining && handleJoinRoom()}
              autoFocus
            />
          </div>

          {joinError && <p className="room-error">{joinError}</p>}

          <button
            className="btn btn-primary room-action-btn"
            onClick={handleJoinRoom}
            disabled={joining || !joinId.trim()}
          >
            {joining ? (
              <span className="room-loading-row">
                <span className="orbit-mini" />
                Joining…
              </span>
            ) : '→ Enter Game'}
          </button>
        </div>
      )}
    </div>
  );
}
