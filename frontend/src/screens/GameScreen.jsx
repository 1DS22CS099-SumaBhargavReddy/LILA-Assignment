import { useMemo } from 'react';
import Board3D from '../components/Board3D';
import PlayerCard from '../components/PlayerCard';
import Timer from '../components/Timer';

export default function GameScreen({
  board,
  currentTurn,
  marks,
  names,
  userId,
  gameMode,
  timerRemaining,
  turnTimeLimit,
  winningCombo,
  onMove,
  disabled,
  onHome,
  matchCode,
}) {
  const myMark = marks?.[userId] || 0;
  const isMyTurn = currentTurn === userId;

  const opponentId = useMemo(() => {
    if (!marks) return null;
    return Object.keys(marks).find((id) => id !== userId) || null;
  }, [marks, userId]);

  const myName = names?.[userId] || 'You';
  const opponentName = opponentId ? (names?.[opponentId] || 'Opponent') : 'Waiting...';
  const myMarkValue = marks?.[userId] || 0;
  const opponentMarkValue = opponentId ? (marks?.[opponentId] || 0) : 0;

  const turnName = isMyTurn ? 'Your' : `${opponentName}'s`;
  const turnMark = currentTurn ? (marks?.[currentTurn] || 0) : 0;

  return (
    <div className="screen screen-enter">
      {/* Header bar */}
      <div className="game-header animate-fade-in">
        <button className="game-home-btn" onClick={onHome} title="Leave and go home">
          🏠 Home
        </button>
        {matchCode && (
          <div className="game-room-badge" title="Share this code with a friend">
            <span className="grb-label">ROOM ID</span>
            <span className="grb-code">{matchCode}</span>
          </div>
        )}
      </div>

      {/* Player Cards */}
      <div className="player-cards animate-fade-in-up">
        <PlayerCard
          name={myName}
          mark={myMarkValue}
          isActive={isMyTurn}
          label="you"
        />
        <div className="vs-badge">VS</div>
        <PlayerCard
          name={opponentName}
          mark={opponentMarkValue}
          isActive={!isMyTurn && currentTurn !== ''}
          label="opp"
        />
      </div>

      {/* Turn Indicator */}
      <div className="turn-indicator animate-fade-in-up delay-100">
        <div className={`turn-dot ${turnMark === 1 ? 'x-turn' : 'o-turn'}`} />
        <span className="turn-text">
          {turnMark === 1 ? 'X' : 'O'} · {turnName} Turn
        </span>
      </div>

      {/* Timer (timed mode) */}
      {gameMode === 1 && timerRemaining > 0 && (
        <div className="animate-fade-in delay-200">
          <Timer remaining={timerRemaining} total={turnTimeLimit || 30} />
        </div>
      )}

      {/* 3D Game Board */}
      <div className="animate-fade-in-up delay-200">
        <Board3D
          board={board}
          onCellClick={onMove}
          disabled={disabled || !isMyTurn}
          winningCombo={winningCombo}
          myMark={myMark}
        />
      </div>

      {/* Status */}
      <div className="status-bar animate-fade-in delay-400">
        <span className="status-dot connected" />
        <span>
          {isMyTurn ? 'Your turn — tap a cell' : 'Waiting for opponent...'}
        </span>
      </div>
    </div>
  );
}
