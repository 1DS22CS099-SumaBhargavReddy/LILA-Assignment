import { useEffect, useState } from 'react';
import XMark from '../components/XMark';
import OMark from '../components/OMark';
import Leaderboard from '../components/Leaderboard';
import Confetti from '../components/Confetti';
import nakamaClient from '../nakama';

export default function ResultScreen({
  winner,
  winnerName,
  reason,
  isDraw,
  userId,
  names,
  marks,
  onPlayAgain,
  onHome,
}) {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLb, setLoadingLb] = useState(true);

  const isWinner = winner === userId;
  const winnerMark = winner && marks ? marks[winner] : 0;

  // Compute points
  const points = isDraw ? '+50 pts' : isWinner ? '+200 pts' : '+0 pts';

  // Reason text
  let reasonText = '';
  if (reason === 'forfeit') reasonText = ' (opponent left)';
  else if (reason === 'timeout') reasonText = ' (timeout)';

  // Fetch leaderboard
  useEffect(() => {
    const fetchLb = async () => {
      try {
        const result = await nakamaClient.getLeaderboard();
        setLeaderboardData(result.leaderboard || []);
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
      } finally {
        setLoadingLb(false);
      }
    };
    fetchLb();
  }, []);

  return (
    <div className="screen screen-enter">
      {/* Confetti for winner */}
      <Confetti active={isWinner && !isDraw} />

      <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', padding: '32px', width: 'min(420px, 90vw)' }}>
        {/* Winner/Draw Mark */}
        <div className="result-mark">
          {isDraw ? (
            <span style={{ fontSize: '4rem' }}>🤝</span>
          ) : winnerMark === 1 ? (
            <div style={{ width: '80px', height: '80px', margin: '0 auto' }}>
              <XMark animate={false} />
            </div>
          ) : (
            <div style={{ width: '80px', height: '80px', margin: '0 auto' }}>
              <OMark animate={false} />
            </div>
          )}
        </div>

        {/* Result Title */}
        <h2 className={`result-title ${isDraw ? 'result-draw' : isWinner ? 'result-win' : 'result-loss'}`}>
          {isDraw ? 'DRAW!' : isWinner ? 'WINNER!' : 'YOU LOST'}
        </h2>

        {/* Points */}
        <p className="result-score animate-fade-in delay-200">
          {points}{reasonText}
        </p>

        {/* Leaderboard */}
        <div style={{ marginTop: '24px' }} className="animate-fade-in-up delay-300">
          {loadingLb ? (
            <p className="text-sm">Loading leaderboard...</p>
          ) : (
            <Leaderboard data={leaderboardData} currentUserId={userId} />
          )}
        </div>

        {/* Actions */}
        <div className="result-actions animate-fade-in-up delay-400">
          <button
            id="play-again-btn"
            className="btn btn-primary"
            onClick={onPlayAgain}
          >
            Play Again
          </button>
          <button
            className="btn btn-secondary"
            onClick={onHome}
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}
