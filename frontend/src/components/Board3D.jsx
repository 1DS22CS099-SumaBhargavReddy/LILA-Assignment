import XMark from './XMark';
import OMark from './OMark';

export default function Board3D({ board, onCellClick, disabled, winningCombo = [], myMark }) {
  return (
    <div className="board-container">
      <div className="board-3d">
        {board.map((cell, index) => {
          const isWinning = winningCombo.includes(index);
          const isOccupied = cell !== 0;
          const isDisabled = disabled || isOccupied;

          return (
            <div
              key={index}
              className={`cell-3d ${isOccupied ? 'cell-occupied' : ''} ${isDisabled ? 'cell-disabled' : ''} ${isWinning ? 'cell-winning' : ''}`}
              onClick={() => !isDisabled && onCellClick(index)}
              id={`cell-${index}`}
              role="button"
              aria-label={`Cell ${index}: ${cell === 0 ? 'empty' : cell === 1 ? 'X' : 'O'}`}
            >
              {cell === 1 && <XMark />}
              {cell === 2 && <OMark />}
              {!isOccupied && !disabled && (
                <div className="cell-hover-hint" style={{
                  opacity: 0.15,
                  transition: 'opacity 0.2s',
                  width: '60%',
                  height: '60%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
