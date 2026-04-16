export default function Leaderboard({ data = [], currentUserId }) {
  if (!data || data.length === 0) {
    return (
      <div className="leaderboard">
        <div className="leaderboard-header">
          <span className="leaderboard-icon">🏆</span>
          <span className="heading-md">Leaderboard</span>
        </div>
        <p className="text-sm text-center" style={{ padding: '16px 0' }}>
          No games played yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span className="leaderboard-icon">🏆</span>
        <span className="heading-md">Leaderboard</span>
      </div>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>W/L/D</th>
            <th>🔥</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, index) => (
            <tr
              key={player.userId || index}
              className={player.userId === currentUserId ? 'self-row' : ''}
            >
              <td className="rank-cell">{player.rank || index + 1}</td>
              <td className="name-cell">
                {player.username || 'Unknown'}
                {player.userId === currentUserId && (
                  <span style={{ color: 'var(--accent-teal)', fontSize: '0.7rem' }}> (you)</span>
                )}
              </td>
              <td className="stats-cell">
                <span style={{ color: 'var(--accent-teal)' }}>{player.wins || 0}</span>
                /
                <span style={{ color: 'var(--accent-red)' }}>{player.losses || 0}</span>
                /
                <span style={{ color: 'var(--accent-amber)' }}>{player.draws || 0}</span>
              </td>
              <td className="stats-cell">
                {(player.streak || 0) > 0 ? `${player.streak}` : '-'}
              </td>
              <td className="score-cell">{player.score || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
