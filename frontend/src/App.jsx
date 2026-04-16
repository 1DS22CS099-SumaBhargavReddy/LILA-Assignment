import { useState, useCallback, useEffect, useRef } from 'react';
import ParticleBackground from './components/ParticleBackground';
import LoginScreen from './screens/LoginScreen';
import ModeSelectScreen from './screens/ModeSelectScreen';
import RoomScreen from './screens/RoomScreen';
import LocalGameScreen from './screens/LocalGameScreen';
import MatchmakingScreen from './screens/MatchmakingScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import nakamaClient, { OpCode } from './nakama';

const SCREEN = {
  LOGIN: 'login',
  MODE_SELECT: 'mode_select',
  ROOM: 'room',
  LOCAL_SETUP: 'local_setup',
  LOCAL_GAME: 'local_game',
  MATCHMAKING: 'matchmaking',
  GAME: 'game',
  RESULT: 'result',
};

export default function App() {
  const [screen, setScreen] = useState(SCREEN.LOGIN);
  const [playerName, setPlayerName] = useState('');
  const [gameMode, setGameMode] = useState('classic');

  // Local 2P state
  const [localP1, setLocalP1] = useState('');
  const [localP2, setLocalP2] = useState('');
  const [localSetupStep, setLocalSetupStep] = useState(0); // 0=p1 name, 1=p2 name
  const [localSetupP1, setLocalSetupP1] = useState('');
  const [localSetupP2, setLocalSetupP2] = useState('');

  // Online game state
  const [board, setBoard] = useState([0,0,0,0,0,0,0,0,0]);
  const [currentTurn, setCurrentTurn] = useState('');
  const [marks, setMarks] = useState({});
  const [names, setNames] = useState({});
  const [winningCombo, setWinningCombo] = useState([]);
  const [gameModeInt, setGameModeInt] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [turnTimeLimit, setTurnTimeLimit] = useState(30);
  const [resultData, setResultData] = useState(null);
  const [matchCode, setMatchCode] = useState('');

  const timerIntervalRef = useRef(null);
  const deadlineRef = useRef(0);

  const stopLocalTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startLocalTimer = useCallback((deadline) => {
    stopLocalTimer();
    deadlineRef.current = deadline;
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      setTimerRemaining(Math.max(0, deadlineRef.current - now));
    };
    update();
    timerIntervalRef.current = setInterval(update, 1000);
  }, [stopLocalTimer]);

  // ── Handle incoming match data from server ──
  const handleMatchData = useCallback((opCode, data) => {
    console.log(`[App.jsx] Received Match Data: opCode=${opCode}`, data);
    switch (opCode) {
      case OpCode.START:
        console.log('[App.jsx] Handling START event -> Transitioning to GAME screen');
        setBoard(data.board || [0,0,0,0,0,0,0,0,0]);
        setCurrentTurn(data.currentTurn || '');
        setMarks(data.marks || {});
        setNames(data.names || {});
        setGameModeInt(data.gameMode || 0);
        setTurnTimeLimit(data.turnTimeLimit || 30);
        setWinningCombo([]);
        setResultData(null);
        if (data.gameMode === 1 && data.deadline) startLocalTimer(data.deadline);
        setScreen(SCREEN.GAME);
        break;
      case OpCode.STATE:
        setBoard(data.board || [0,0,0,0,0,0,0,0,0]);
        setCurrentTurn(data.currentTurn || '');
        setMarks(data.marks || {});
        setNames(data.names || {});
        setWinningCombo(data.winningCombo || []);
        if (data.gameMode === 1 && data.deadline) startLocalTimer(data.deadline);
        break;
      case OpCode.TIMER:
        if (data.remaining !== undefined) setTimerRemaining(data.remaining);
        break;
      case OpCode.DONE:
        setBoard(data.board || [0,0,0,0,0,0,0,0,0]);
        setWinningCombo(data.winningCombo || []);
        stopLocalTimer();
        setTimeout(() => { setResultData(data); setScreen(SCREEN.RESULT); }, 1500);
        break;
      case OpCode.REJECTED:
        console.warn('Move rejected:', data.reason);
        break;
    }
  }, [board, startLocalTimer, stopLocalTimer]);

  // ── Handle Login: authenticate only, then go to mode select ──
  const handleLogin = useCallback(async (nickname) => {
    setPlayerName(nickname);
    await nakamaClient.authenticate(nickname);
    await nakamaClient.connectSocket();
    setScreen(SCREEN.MODE_SELECT);
  }, []);

  // ── Handle mode selection ──
  const handleModeSelect = useCallback(async (mode) => {
    setGameMode(mode);

    if (mode === 'local') {
      setScreen(SCREEN.LOCAL_SETUP);
      return;
    }
    if (mode === 'room') {
      setScreen(SCREEN.ROOM);
      return;
    }
    if (mode === 'ai') {
      await nakamaClient.startAiMatch();
      setScreen(SCREEN.GAME);
      return;
    }
    // Online matchmaking (classic/timed)
    await nakamaClient.findMatch(mode);
    setScreen(SCREEN.MATCHMAKING);
  }, []);

  const handleRoomMatchFound = useCallback(async (action, code, matchId) => {
    console.log(`[App.jsx] handleRoomMatchFound: action=${action}, code=${code}, matchId=${matchId}`);
    setMatchCode(code);
    if (action === 'joining') {
      // Player 2: join
      await nakamaClient.joinCreatedRoom(matchId);
      console.log(`[App.jsx] Player 2 joined successfully. Setting screen to GAME.`);
      setScreen(SCREEN.GAME);
    } else {
      // Player 1: creator. Stay on SCREEN.ROOM to show the "Waiting for P2" UI.
      console.log(`[App.jsx] Player 1 waiting in room for P2. ID: ${matchId}`);
    }
  }, []);

  const handleMove = useCallback(async (position) => {
    try { await nakamaClient.sendMove(position); } catch (e) { console.error(e); }
  }, []);


  const handleCancelMatchmaking = useCallback(async () => {
    await nakamaClient.cancelMatchmaking();
    setScreen(SCREEN.MODE_SELECT);
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setBoard([0,0,0,0,0,0,0,0,0]);
    setCurrentTurn(''); setMarks({}); setNames({});
    setWinningCombo([]); setResultData(null); setTimerRemaining(0);
    stopLocalTimer();
    await nakamaClient.leaveMatch();
    if (gameMode === 'ai') {
      await nakamaClient.startAiMatch();
      setScreen(SCREEN.GAME);
    } else if (gameMode === 'room') {
      setScreen(SCREEN.ROOM);
    } else {
      await nakamaClient.findMatch(gameMode);
      setScreen(SCREEN.MATCHMAKING);
    }
  }, [gameMode, handleMatchData, stopLocalTimer]);

  const handleGoHome = useCallback(async () => {
    stopLocalTimer();
    try { await nakamaClient.leaveMatch(); } catch (e) {}
    setBoard([0,0,0,0,0,0,0,0,0]);
    setCurrentTurn('');
    setMarks({});
    setNames({});
    setWinningCombo([]);
    setResultData(null);
    setTimerRemaining(0);
    setScreen(SCREEN.MODE_SELECT);
  }, [stopLocalTimer]);

  useEffect(() => {
    // Keep event listeners always bound to the freshest state
    nakamaClient.onMatchData = (opCode, data) => handleMatchData(opCode, data);
    nakamaClient.onMatchmakerMatched = (match) => setScreen(SCREEN.GAME);
    nakamaClient.onDisconnect = () => console.log('Disconnected');
  }, [handleMatchData]);

  useEffect(() => () => { stopLocalTimer(); nakamaClient.disconnect(); }, [stopLocalTimer]);

  const userId = nakamaClient.getUserId();

  // ── Local Setup UI ──
  const renderLocalSetup = () => (
    <div className="screen local-setup-screen">
      <div className="glass-card animate-fade-in-up" style={{ width: 'min(400px, 90vw)', textAlign: 'center' }}>
        <div className="local-setup-icon">{localSetupStep === 0 ? '✕' : '○'}</div>
        <h2 className="heading-md" style={{ marginBottom: 8 }}>
          {localSetupStep === 0 ? 'Player 1 Name' : 'Player 2 Name'}
        </h2>
        <p className="text-sm" style={{ marginBottom: 24 }}>
          {localSetupStep === 0
            ? 'You play as ✕ (purple)'
            : 'You play as ○ (orange)'}
        </p>
        <input
          className="input-field"
          type="text"
          placeholder={localSetupStep === 0 ? 'Enter Player 1 name…' : 'Enter Player 2 name…'}
          value={localSetupStep === 0 ? localSetupP1 : localSetupP2}
          onChange={e => localSetupStep === 0
            ? setLocalSetupP1(e.target.value)
            : setLocalSetupP2(e.target.value)}
          autoFocus
          maxLength={16}
          onKeyDown={e => e.key === 'Enter' && handleLocalSetupNext()}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {localSetupStep === 1 && (
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setLocalSetupStep(0)}>← Back</button>
          )}
          {localSetupStep === 0 && (
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setScreen(SCREEN.MODE_SELECT)}>← Menu</button>
          )}
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleLocalSetupNext}
            disabled={localSetupStep === 0 ? !localSetupP1.trim() : !localSetupP2.trim()}
          >
            {localSetupStep === 0 ? 'Next →' : '▶ Start Game'}
          </button>
        </div>
      </div>
    </div>
  );

  const handleLocalSetupNext = () => {
    if (localSetupStep === 0) {
      if (!localSetupP1.trim()) return;
      setLocalSetupStep(1);
    } else {
      if (!localSetupP2.trim()) return;
      setLocalP1(localSetupP1.trim() || 'Player 1');
      setLocalP2(localSetupP2.trim() || 'Player 2');
      setScreen(SCREEN.LOCAL_GAME);
    }
  };

  return (
    <>
      <ParticleBackground />

      {screen === SCREEN.LOGIN && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {screen === SCREEN.MODE_SELECT && (
        <ModeSelectScreen playerName={playerName} onModeSelect={handleModeSelect} />
      )}

      {screen === SCREEN.ROOM && (
        <RoomScreen
          playerName={playerName}
          onMatchFound={handleRoomMatchFound}
          onBack={() => setScreen(SCREEN.MODE_SELECT)}
        />
      )}

      {screen === SCREEN.LOCAL_SETUP && renderLocalSetup()}

      {screen === SCREEN.LOCAL_GAME && (
        <LocalGameScreen
          player1={localP1}
          player2={localP2}
          onResult={() => {}}
          onBack={() => { setLocalSetupStep(0); setLocalSetupP1(''); setLocalSetupP2(''); setScreen(SCREEN.MODE_SELECT); }}
        />
      )}

      {screen === SCREEN.MATCHMAKING && (
        <MatchmakingScreen onCancel={handleCancelMatchmaking} playerName={playerName} />
      )}

      {screen === SCREEN.GAME && (
        <GameScreen
          board={board}
          currentTurn={currentTurn}
          marks={marks}
          names={names}
          userId={userId}
          gameMode={gameModeInt}
          timerRemaining={timerRemaining}
          turnTimeLimit={turnTimeLimit}
          winningCombo={winningCombo}
          onMove={handleMove}
          disabled={winningCombo.length > 0}
          onHome={handleGoHome}
          matchCode={matchCode}
        />
      )}

      {screen === SCREEN.RESULT && resultData && (
        <ResultScreen
          winner={resultData.winner}
          winnerName={resultData.winnerName}
          reason={resultData.reason}
          isDraw={resultData.isDraw}
          userId={userId}
          names={names}
          marks={marks}
          onPlayAgain={handlePlayAgain}
          onHome={handleGoHome}
        />
      )}
    </>
  );
}
