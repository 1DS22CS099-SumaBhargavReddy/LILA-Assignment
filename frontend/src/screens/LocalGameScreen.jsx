import { useState, useEffect, useCallback } from 'react';
import Confetti from '../components/Confetti';

const WIN_CONDITIONS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board) {
  for (const [a,b,c] of WIN_CONDITIONS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo: [a,b,c] };
    }
  }
  if (board.every(cell => cell !== 0)) return { winner: 'draw', combo: [] };
  return null;
}

function Cell({ value, index, onClick, winning, disabled, current }) {
  return (
    <div
      className={`cell-3d local-cell ${value ? 'cell-occupied' : ''} ${winning ? 'cell-winning' : ''} ${disabled ? 'cell-disabled' : ''}`}
      onClick={() => !disabled && !value && onClick(index)}
      style={{
        '--cell-color': value === 1 ? '#a855f7' : value === 2 ? '#f97316' : 'transparent',
      }}
    >
      {value === 1 && (
        <svg viewBox="0 0 100 100" className="local-x">
          <line x1="20" y1="20" x2="80" y2="80" />
          <line x1="80" y1="20" x2="20" y2="80" />
        </svg>
      )}
      {value === 2 && (
        <svg viewBox="0 0 100 100" className="local-o">
          <circle cx="50" cy="50" r="32" />
        </svg>
      )}
    </div>
  );
}

export default function LocalGameScreen({ player1, player2, onResult, onBack }) {
  const [board, setBoard] = useState(Array(9).fill(0));
  const [turn, setTurn] = useState(1); // 1 = P1 (purple X), 2 = P2 (orange O)
  const [result, setResult] = useState(null);
  const [winCombo, setWinCombo] = useState([]);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [showResult, setShowResult] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const handleMove = useCallback((idx) => {
    if (result || board[idx]) return;
    const next = [...board];
    next[idx] = turn;
    const newMoveCount = moveCount + 1;
    const check = checkWinner(next);
    setBoard(next);
    setMoveCount(newMoveCount);

    if (check) {
      setResult(check);
      setWinCombo(check.combo);
      if (check.winner !== 'draw') {
        setScores(s => ({ ...s, [check.winner]: s[check.winner] + 1 }));
      }
      setTimeout(() => setShowResult(true), 900);
    } else {
      setTurn(t => t === 1 ? 2 : 1);
    }
  }, [board, turn, result, moveCount]);

  const resetRound = () => {
    setBoard(Array(9).fill(0));
    setTurn(result?.winner === 1 ? 2 : 1); // loser goes first next
    setResult(null);
    setWinCombo([]);
    setShowResult(false);
    setMoveCount(0);
  };

  const p1Name = player1 || 'Player 1';
  const p2Name = player2 || 'Player 2';
  const currentName = turn === 1 ? p1Name : p2Name;

  return (
    <div className="screen local-game-screen">
      <Confetti active={result && result.winner !== 'draw'} />

      {/* Header row */}
      <div className="local-header animate-fade-in-up">
        <button className="local-back-btn" onClick={onBack}>←</button>
        <span className="local-title">Local Battle</span>
        <div className="local-scores">
          <span className="local-score p1-score">{scores[1]}</span>
          <span className="local-score-sep">:</span>
          <span className="local-score p2-score">{scores[2]}</span>
        </div>
      </div>

      {/* Player cards */}
      <div className="local-players animate-fade-in-up delay-100">
        <div className={`local-player-card p1-card ${turn === 1 && !result ? 'lp-active' : ''}`}>
          <span className="lp-mark">✕</span>
          <span className="lp-name">{p1Name}</span>
          <span className="lp-label">Player 1</span>
        </div>
        <div className="local-vs-badge">VS</div>
        <div className={`local-player-card p2-card ${turn === 2 && !result ? 'lp-active' : ''}`}>
          <span className="lp-mark lp-o">○</span>
          <span className="lp-name">{p2Name}</span>
          <span className="lp-label">Player 2</span>
        </div>
      </div>

      {/* Turn indicator */}
      <div className={`local-turn-bar animate-fade-in delay-200 ${turn === 1 ? 'p1-turn' : 'p2-turn'}`}>
        <div className="local-turn-dot" />
        <span>{currentName}'s Turn</span>
      </div>

      {/* Board */}
      <div className="board-container animate-fade-in-up delay-200">
        <div className="board-3d local-board">
          {board.map((v, i) => (
            <Cell
              key={i}
              value={v}
              index={i}
              onClick={handleMove}
              winning={winCombo.includes(i)}
              disabled={!!result}
              current={turn}
            />
          ))}
        </div>
      </div>

      {/* In-game result overlay */}
      {showResult && (
        <div className="local-result-overlay animate-fade-in">
          <div className="local-result-card glass-card">
            {result.winner === 'draw' ? (
              <>
                <div className="local-result-icon">🤝</div>
                <h2 className="local-result-title draw-color">It's a Draw!</h2>
              </>
            ) : (
              <>
                <div className="local-result-icon">{result.winner === 1 ? '✕' : '○'}</div>
                <h2 className={`local-result-title ${result.winner === 1 ? 'p1-color' : 'p2-color'}`}>
                  {result.winner === 1 ? p1Name : p2Name} Wins! 🎉
                </h2>
              </>
            )}
            <div className="local-result-scores">
              <span className="p1-color">{p1Name}: {scores[1]}</span>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="p2-color">{p2Name}: {scores[2]}</span>
            </div>
            <div className="local-result-btns">
              <button className="btn btn-primary" onClick={resetRound}>▶ Next Round</button>
              <button className="btn btn-secondary" onClick={onBack}>🏠 Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
