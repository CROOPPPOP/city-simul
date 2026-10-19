import React, { useState, useEffect, useRef } from 'react';
import type { GameState, Gender, ActionChoice, TimeSpeed, NarrativeLog } from './types/game';
import { CoreEngine } from './engine/coreEngine';
import { DISTRICTS_DATA } from './engine/districtsData';
import { AINarrativeDirector } from './engine/aiNarrative';
import { TimeKeeper } from './engine/timeKeeper';
import { DynamicChoiceGenerator } from './engine/dynamicChoiceGenerator';
import { EncounterDirector } from './engine/encounterDirector';
import {
  Skull,
  Shield,
  Heart,
  Brain,
  Coins,
  Home,
  Flame,
  User,
  MapPin,
  Key,
  Compass,
  AlertTriangle,
  Send,
  Zap,
  Play,
  Pause,
  FastForward,
  Clock,
  Hourglass,
  RotateCcw,
} from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const [showExitTitleModal, setShowExitTitleModal] = useState(false);
  const [charName, setCharName] = useState('');
  const [charGender, setCharGender] = useState<Gender>('male');
  const [selectedBirthDistrict, setSelectedBirthDistrict] = useState<number | 'RANDOM'>('RANDOM');
  const [activeRightTab, setActiveRightTab] = useState<'relationships' | 'district' | 'taboo'>('relationships');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(AINarrativeDirector.getSavedApiKey());
  const [customActionText, setCustomActionText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const timeKeeperRef = useRef<TimeKeeper>(new TimeKeeper());
  const lastEncounterDayRef = useRef<number>(1);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.logs, gameState?.activeEncounter]);

  // 전역 스페이스바(Space) 일시정지 / 재개 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 인풋창 포커스 중일 때는 스페이스바 타이핑 허용
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setGameState((prev) => {
          if (!prev || prev.isGameOver) return prev;
          if (prev.timeSpeed === 'PAUSED') {
            const resumeSpeed = prev.previousTimeSpeed || '1X';
            return { ...prev, timeSpeed: resumeSpeed, isAutoPaused: false };
          } else {
            return {
              ...prev,
              previousTimeSpeed: prev.timeSpeed,
              timeSpeed: 'PAUSED',
              isAutoPaused: false,
            };
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 캐릭터 생성
  const handleStartGame = () => {
    const newState = CoreEngine.createCharacter(charName, charGender);

    // 유저가 특정 출생 구역을 지정했을 경우 (예: 20구 T사 테스트)
    if (selectedBirthDistrict !== 'RANDOM') {
      const distId = selectedBirthDistrict;
      const isTCorp = distId === 20;
      newState.player.birthDistrictId = distId;
      newState.player.currentDistrictId = distId;
      newState.player.timeBalanceHours = isTCorp ? 48 : undefined;
      newState.player.timeTaxDueDays = isTCorp ? 14 : undefined;
      newState.player.isTimeFrozen = false;

      const dist = DISTRICTS_DATA[distId];
      newState.logs[0].text = `당신은 ${dist.wingName} 관할 ${dist.id}구 뒷골목에서 눈을 떴습니다. ${dist.backstreetCulture}${
        isTCorp ? '\n[T사 고유 규칙] 잔여 개인 시간: 48시간. 시간세 납부 기한: 14일.' : ''
      }`;
    }

    lastEncounterDayRef.current = 1;
    timeKeeperRef.current.reset(0);
    setGameState(newState);
    setIsCreating(false);
  };

  // 실시간 틱 루프 (1분 = 1달, 2초 = 1일)
  useEffect(() => {
    if (!gameState || isCreating || gameState.isGameOver) return;
    if (gameState.timeSpeed === 'PAUSED' || gameState.pendingSituation || gameState.activeEncounter) return;

    let lastTime = performance.now();
    const interval = setInterval(async () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      const tickResult = timeKeeperRef.current.tick(
        delta,
        gameState.timeSpeed,
        gameState.year,
        gameState.month,
        gameState.day,
        gameState.timeOfDay
      );

      // 80% 진행 시 다음 달 서사/선택지 사전 요청 (Prefetch)
      if (tickResult.shouldPrefetchNextMonth) {
        DynamicChoiceGenerator.prefetchNextMonth(gameState, geminiApiKey);
      }

      // 월 전환 시 자동 일시정지 및 월간 주요 사건 모달 팝업
      if (tickResult.monthPassed) {
        const situation = await DynamicChoiceGenerator.getSituationForMonth(
          gameState,
          tickResult.newYear,
          tickResult.newMonth,
          geminiApiKey
        );

        setGameState((prev) => {
          if (!prev) return null;
          const updated = CoreEngine.processTimeTick(prev, tickResult);
          return CoreEngine.openMonthlySituation(updated, situation);
        });
        return;
      }

      // 하루 경과 또는 시간대 전환 시 상태 갱신 + 일상 서사 문장 피드 스트리밍
      if (tickResult.dayPassed || tickResult.timeOfDayChanged) {
        setGameState((prev) => {
          if (!prev) return null;
          let updated = CoreEngine.processTimeTick(prev, tickResult);

          // 인카운터가 없을 때 시간대별 도시 일상 묘사 문장 추가
          if (!updated.activeEncounter && !updated.pendingSituation) {
            const ambient = EncounterDirector.generateAmbientLog(updated);
            const ambientLog: NarrativeLog = {
              id: `ambient_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              year: updated.year,
              month: updated.month,
              day: updated.day,
              timeOfDay: updated.timeOfDay,
              districtId: updated.player.currentDistrictId,
              text: ambient.text,
              internalMonologue: ambient.monologue,
            };
            updated = {
              ...updated,
              logs: [...updated.logs, ambientLog].slice(-100),
            };
          }
          return updated;
        });

        // 돌발 인카운터 발생 조건 판정
        if (EncounterDirector.shouldTriggerEncounter(gameState, lastEncounterDayRef.current)) {
          lastEncounterDayRef.current = tickResult.newDay;
          const encounter = await EncounterDirector.generateRandomEncounter(gameState, geminiApiKey);
          setGameState((prev) => (prev ? CoreEngine.triggerEncounter(prev, encounter) : null));
          return;
        }
      } else {
        // 프로그레스 바 갱신
        setGameState((prev) => (prev ? { ...prev, monthProgress: tickResult.monthProgress } : null));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    gameState?.timeSpeed,
    gameState?.month,
    gameState?.day,
    gameState?.timeOfDay,
    gameState?.isGameOver,
    gameState?.pendingSituation,
    gameState?.activeEncounter,
    isCreating,
    geminiApiKey,
  ]);

  // 배속 설정 변경
  const handleSetSpeed = (newSpeed: TimeSpeed) => {
    if (!gameState) return;
    setGameState({
      ...gameState,
      previousTimeSpeed: gameState.timeSpeed !== 'PAUSED' ? gameState.timeSpeed : prevSpeedFallback(gameState.previousTimeSpeed),
      timeSpeed: newSpeed,
      isAutoPaused: newSpeed === 'PAUSED',
    });
  };

  const prevSpeedFallback = (s?: TimeSpeed): TimeSpeed => {
    return s && s !== 'PAUSED' ? s : '1X';
  };

  // 행동 실행 (엔진 룰 판정 + AI 서사 가공)
  const handleSelectChoice = async (choice: ActionChoice) => {
    if (!gameState || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. 엔진의 결정론적 상태 전이
      const updatedState = CoreEngine.executeAction(gameState, choice);

      // 2. AI를 통한 서사 강화 (API Key가 설정되어 있을 경우)
      if (geminiApiKey.trim()) {
        const latestIdx = updatedState.logs.length - 1;
        const latestLog = updatedState.logs[latestIdx];
        const aiResult = await AINarrativeDirector.generateNarrativeWithAI(
          gameState,
          choice,
          latestLog,
          { apiKey: geminiApiKey, model: 'gemini-1.5-flash' }
        );

        updatedState.logs[latestIdx] = {
          ...latestLog,
          text: aiResult.narrative,
          internalMonologue: aiResult.internalMonologue,
          carmenWhisper: aiResult.carmenWhisper || latestLog.carmenWhisper,
        };
      }

      setGameState(updatedState);
    } catch (err) {
      console.error('Action execution error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 자유 텍스트 행동 입력
  const handleCustomActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customActionText.trim() || !gameState || isProcessing) return;

    const customChoice: ActionChoice = {
      id: `custom_${Date.now()}`,
      text: customActionText.trim(),
      actionType: 'CUSTOM',
      dangerLevel: 'MEDIUM',
      customPrompt: customActionText.trim(),
    };

    setCustomActionText('');
    handleSelectChoice(customChoice);
  };

  // 신(心) 활성화 토글
  const handleToggleShin = () => {
    if (!gameState || !gameState.player.hasShin) return;
    setGameState({
      ...gameState,
      player: {
        ...gameState.player,
        shinActive: !gameState.player.shinActive,
      },
    });
  };

  // API Key 저장
  const handleSaveApiKey = () => {
    AINarrativeDirector.saveApiKey(geminiApiKey);
    setApiKeyModalOpen(false);
  };

  // API Key 삭제/초기화
  const handleClearApiKey = () => {
    setGeminiApiKey('');
    AINarrativeDirector.saveApiKey('');
    setApiKeyModalOpen(false);
  };

  // 캐릭터 생성 모달
  if (isCreating || !gameState) {
    return (
      <div className="creation-overlay">
        <div className="creation-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className="brand-title" style={{ fontSize: '1.8rem', color: 'var(--pm-crimson)' }}>
              PROJECT MOON
            </h1>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginTop: '0.4rem', fontFamily: 'var(--font-serif)' }}>
              도시의 생존자 (Stranger in the City)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              현실 1분 = 도시의 1달. 시간은 끊임없이 흐르며, 거리에서 마주치는 수많은 인카운터 속에서 당신의 인연과 서사를 개척하십시오.
            </p>
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              이름 (생략 시 자동 부여)
            </label>
            <input
              type="text"
              className="custom-input"
              style={{ width: '100%' }}
              placeholder="예: 카엘, 엘레나, 로웰"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              성별 선택
            </label>
            <div className="gender-select-grid">
              <button
                type="button"
                className={`gender-btn ${charGender === 'male' ? 'selected' : ''}`}
                onClick={() => setCharGender('male')}
              >
                남성 (Male)
              </button>
              <button
                type="button"
                className={`gender-btn ${charGender === 'female' ? 'selected' : ''}`}
                onClick={() => setCharGender('female')}
              >
                여성 (Female)
              </button>
              <button
                type="button"
                className={`gender-btn ${charGender === 'other' ? 'selected' : ''}`}
                onClick={() => setCharGender('other')}
              >
                의체 중성 (Cyborg)
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              출생 구역 선택 (체험 및 테스트)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                type="button"
                className={`gender-btn ${selectedBirthDistrict === 'RANDOM' ? 'selected' : ''}`}
                onClick={() => setSelectedBirthDistrict('RANDOM')}
              >
                무작위 출생 (운명)
              </button>
              <button
                type="button"
                className={`gender-btn ${selectedBirthDistrict === 20 ? 'selected' : ''}`}
                onClick={() => setSelectedBirthDistrict(20)}
                style={{ borderColor: selectedBirthDistrict === 20 ? '#d4a373' : undefined }}
              >
                ⏳ 20구 T사 (시간세 특화)
              </button>
              <button
                type="button"
                className={`gender-btn ${selectedBirthDistrict === 11 ? 'selected' : ''}`}
                onClick={() => setSelectedBirthDistrict(11)}
              >
                🧪 11구 K사 (나노 앰플)
              </button>
              <button
                type="button"
                className={`gender-btn ${selectedBirthDistrict === 23 ? 'selected' : ''}`}
                onClick={() => setSelectedBirthDistrict(23)}
              >
                🔪 23구 W사 (맛의 골목)
              </button>
            </div>
          </div>

          {/* Gemini API Key 영구 로컬 저장 입력창 */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Key size={13} color="var(--pm-cyan)" />
                Gemini API Key (선택사항, 브라우저에 자동 영구 저장)
              </label>
              {geminiApiKey ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--pm-cyan)', fontWeight: 'bold' }}>
                  ✓ 로컬 보관 중
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>미입력 (내장 룰 엔진 구동)</span>
              )}
            </div>
            <input
              type="password"
              className="custom-input"
              style={{ width: '100%', borderColor: geminiApiKey ? 'var(--pm-cyan)' : undefined }}
              placeholder="AIzaSy... (한 번 입력하면 다음 접속 시에도 자동 유지됩니다)"
              value={geminiApiKey}
              onChange={(e) => {
                const val = e.target.value;
                setGeminiApiKey(val);
                AINarrativeDirector.saveApiKey(val);
              }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              * 한 번 입력해두면 로컬 스토리지에 영구 보관되어 브라우저를 껐다 켜도 다시 입력할 필요가 없습니다.
            </p>
          </div>

          <div style={{ background: 'rgba(214, 40, 40, 0.08)', border: '1px solid #4a151b', padding: '0.8rem', borderRadius: '6px', fontSize: '0.78rem', color: '#ffb3ba', margin: '1.2rem 0' }}>
            * <strong>인연 시스템:</strong> 시작 시 동료는 없으며, 거리의 돌발 인카운터를 통해 인연을 구출하고 영입합니다.<br />
            * <strong>시간 및 단축키:</strong> 현실 1분 = 1달. <strong>[Space]</strong> 키로 언제든 시간을 일시정지하거나 재개할 수 있습니다.
          </div>

          <button
            type="button"
            className="action-submit-btn"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', background: 'var(--pm-crimson)', borderColor: 'var(--pm-crimson)' }}
            onClick={handleStartGame}
          >
            도시의 문을 열다 (Enter the City)
          </button>
        </div>
      </div>
    );
  }

  const p = gameState.player;
  const currentDistrict = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[20];
  const isTCorp = p.currentDistrictId === 20;

  return (
    <div
      className={p.isTimeFrozen ? 'frozen-monochrome-filter' : ''}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Game Header with Time Controls & Spacebar Hint */}
      <header className="game-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button
            type="button"
            className="title-return-btn"
            onClick={() => setShowExitTitleModal(true)}
            title="타이틀 화면으로 복귀 (캐릭터 새로 생성)"
          >
            <RotateCcw size={12} />
            <span>타이틀</span>
          </button>
          <span className="brand-title">THE CITY</span>
          <div className="time-header-wrapper">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="brand-badge">도시력 {gameState.year}년</span>
              <span className="brand-badge" style={{ borderColor: 'var(--pm-cyan)', color: 'var(--pm-cyan)', background: 'rgba(0,180,216,0.1)' }}>
                {gameState.month}월 {gameState.day}일
              </span>
              <span
                className="brand-badge"
                style={{
                  borderColor: gameState.timeOfDay === 'NIGHT_SWEEPER' ? 'var(--pm-crimson)' : 'var(--pm-gold)',
                  color: gameState.timeOfDay === 'NIGHT_SWEEPER' ? '#ff4d6d' : 'var(--pm-gold)',
                  background: gameState.timeOfDay === 'NIGHT_SWEEPER' ? 'rgba(214,40,40,0.25)' : 'rgba(255,209,102,0.1)',
                  fontWeight: gameState.timeOfDay === 'NIGHT_SWEEPER' ? 'bold' : 'normal',
                }}
              >
                {gameState.timeOfDay === 'MORNING' && '오전 (06:00)'}
                {gameState.timeOfDay === 'AFTERNOON' && '오후 (12:00)'}
                {gameState.timeOfDay === 'EVENING' && '저녁 (18:00)'}
                {gameState.timeOfDay === 'NIGHT_SWEEPER' && '⚠ 뒷골목의 밤 (03:13 ~ 04:34)'}
              </span>
            </div>

            {/* 1분 = 1달 프로그레스 바 */}
            <div className="month-progress-wrapper">
              <div className="month-progress-bar-bg" title="1분 = 1달 경과 게이지">
                <div
                  className="month-progress-bar-fill"
                  style={{ width: `${Math.round(gameState.monthProgress * 100)}%` }}
                />
              </div>
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {Math.round(gameState.monthProgress * 100)}% (1분=1달)
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Speed Buttons & T-Corp Clock Widget */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {/* T사 구역일 때 전용 시간 잔여량 및 시간세 인디케이터 */}
          {isTCorp && (
            <div className={`tcorp-clock-badge ${p.isTimeFrozen || (p.timeBalanceHours ?? 24) <= 12 ? 'tcorp-frozen-warning' : ''}`}>
              <Hourglass size={14} color="#d4a373" />
              <span>
                개인시간: <strong>{p.timeBalanceHours ?? 0}h</strong> | 세금: <strong>D-{p.timeTaxDueDays ?? 0}</strong>
              </span>
              {p.isTimeFrozen && <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>[흑백 정지 중!]</span>}
            </div>
          )}

          {/* 재생/일시정지/배속 컨트롤 + 스페이스바 힌트 */}
          <div className="time-control-group">
            <button
              type="button"
              className={`speed-btn ${gameState.timeSpeed === 'PAUSED' ? 'paused active' : ''}`}
              onClick={() => handleSetSpeed('PAUSED')}
              title="시간 정지 (Space)"
            >
              <Pause size={12} style={{ display: 'inline', marginRight: '2px' }} /> 정지
              <kbd className="space-hotkey-badge">Space</kbd>
            </button>
            <button
              type="button"
              className={`speed-btn ${gameState.timeSpeed === '1X' ? 'active' : ''}`}
              onClick={() => handleSetSpeed('1X')}
              title="1배속 (1분=1달)"
            >
              <Play size={12} style={{ display: 'inline', marginRight: '2px' }} /> 1x
            </button>
            <button
              type="button"
              className={`speed-btn ${gameState.timeSpeed === '2X' ? 'active' : ''}`}
              onClick={() => handleSetSpeed('2X')}
              title="2배속 (30초=1달)"
            >
              <FastForward size={12} style={{ display: 'inline', marginRight: '2px' }} /> 2x
            </button>
            <button
              type="button"
              className={`speed-btn ${gameState.timeSpeed === '4X' ? 'active' : ''}`}
              onClick={() => handleSetSpeed('4X')}
              title="4배속 (15초=1달)"
            >
              <FastForward size={12} style={{ display: 'inline', marginRight: '2px' }} /> 4x
            </button>
          </div>

          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} color="var(--pm-cyan)" />
            {currentDistrict.id}구 ({p.isInsideNest ? '둥지' : '뒷골목'})
          </span>

          <button
            type="button"
            className="action-submit-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 10px' }}
            onClick={() => setApiKeyModalOpen(true)}
          >
            <Key size={12} />
            {geminiApiKey ? 'AI 연동됨' : 'API Key 설정'}
          </button>
        </div>
      </header>

      {/* Main Grid App Container */}
      <div className="app-container">
        {/* Left Column: Player Status & Abilities */}
        <aside className="glass-panel" style={{ overflowY: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{p.name}</h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '의체 중성'} | {p.age}세 | {p.path === 'FIXER' ? `${p.fixerGrade}급 해결사` : '둥지의 깃털'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--pm-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>
              <Coins size={14} />
              <span>{p.ahn.toLocaleString()} 안</span>
            </div>
          </div>

          {/* T사 전용 사이드바 시간 위젯 */}
          {isTCorp && (
            <div className="sidebar-section" style={{ border: '1px solid #d4a373', background: 'rgba(212,163,115,0.06)' }}>
              <div className="section-title" style={{ color: '#d4a373' }}>
                <Clock size={14} />
                T사 시간세 (Time Track)
              </div>
              <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>개인 보유 시간:</span>
                <span style={{ color: (p.timeBalanceHours ?? 24) <= 12 ? '#ff6b6b' : '#faedcd', fontWeight: 'bold' }}>
                  {p.timeBalanceHours ?? 0} 시간
                </span>
              </div>
              <div className="meter-track" style={{ height: '6px', marginBottom: '0.4rem' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, ((p.timeBalanceHours ?? 0) / 72) * 100))}%`,
                    background: (p.timeBalanceHours ?? 24) <= 12 ? 'var(--pm-crimson)' : '#d4a373',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>시간세 감사 기한:</span>
                <span style={{ color: 'var(--pm-gold)' }}>D-{p.timeTaxDueDays ?? 0}일</span>
              </div>
              {p.isTimeFrozen && (
                <div style={{ fontSize: '0.7rem', color: '#ff6b6b', marginTop: '4px', fontWeight: 'bold' }}>
                  * 시간 고갈로 신체 흑백 동결 진행 중! (매일 HP/SP 감소)
                </div>
              )}
            </div>
          )}

          {/* HP Bar */}
          <div className="sidebar-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff4d6d' }}>
                <Heart size={14} /> 체력 (HP)
              </span>
              <span>{p.hp} / {p.maxHp}</span>
            </div>
            <div className="meter-track">
              <div style={{ height: '100%', width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%`, background: 'var(--pm-crimson)' }} />
            </div>
          </div>

          {/* SP Bar */}
          <div className="sidebar-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--pm-cyan)' }}>
                <Brain size={14} /> 정신력 (SP)
              </span>
              <span style={{ color: p.sp < 0 ? '#ff6b6b' : 'var(--pm-cyan)' }}>
                {p.sp > 0 ? `+${p.sp}` : p.sp} / 45
              </span>
            </div>
            <div className="meter-track">
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(0, ((p.sp + 45) / 90) * 100)}%`,
                  background: p.sp < -20 ? 'var(--pm-purple)' : 'var(--pm-cyan)',
                }}
              />
            </div>
          </div>

          {/* Housing Tax Days Left */}
          <div className="sidebar-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                <Home size={14} /> 합법 거주세 잔여
              </span>
              <span style={{ color: p.housingTaxDaysLeft <= 2 ? 'var(--pm-crimson)' : 'var(--text-main)', fontWeight: 'bold' }}>
                {p.housingTaxDaysLeft} 일 남음
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              0일이 되면 청소부의 밤(03:13)에 노출됩니다.
            </div>
          </div>

          {/* Shin and Mang */}
          <div className="sidebar-section">
            <div className="section-title">
              <Zap size={14} color="var(--pm-gold)" />
              이능력 (신과 망)
            </div>

            <div style={{ background: 'rgba(255,209,102,0.06)', border: '1px solid rgba(255,209,102,0.2)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--pm-gold)' }}>
                  신(心) - 정신의 오라
                </span>
                {p.hasShin ? (
                  <button
                    type="button"
                    onClick={handleToggleShin}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      background: p.shinActive ? 'var(--pm-gold)' : 'transparent',
                      color: p.shinActive ? '#000' : 'var(--pm-gold)',
                      border: '1px solid var(--pm-gold)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {p.shinActive ? '활성화 중' : '비활성'}
                  </button>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>미각성</span>
                )}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                {p.hasShin
                  ? p.shinActive
                    ? '달빛 같은 온기가 전신을 감쌉니다. (공방 주사위 +6, 매 턴 SP -4 소모)'
                    : '비활성화 상태. 필요 시 즉시 오라를 전개할 수 있습니다.'
                  : '자신의 죄(Sin)와 공포를 직면하는 극한의 순간에 개화할 수 있습니다.'}
              </p>

              {/* Mang Rings */}
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--pm-gold)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>망(望) - 파괴의 관문</span>
                  <span>{p.mangLevel} 단계</span>
                </div>
                <div className="mang-rings-display">
                  {p.mangLevel === 0 ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>고리 없음 (감정의 집착 필요)</span>
                  ) : (
                    Array.from({ length: p.mangLevel }).map((_, i) => (
                      <div key={i} className="mang-ring" title={`${i + 1}망 고리`}>
                        {i + 1}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body Parts Status */}
          <div className="sidebar-section">
            <div className="section-title">
              <Shield size={14} color="var(--text-muted)" />
              신체 부위 상태
            </div>
            <div className="body-parts-grid">
              <div className="part-tag">
                <span>머리:</span>
                <span className={`part-${p.bodyParts.head}`}>{p.bodyParts.head}</span>
              </div>
              <div className="part-tag">
                <span>몸통:</span>
                <span className={`part-${p.bodyParts.torso}`}>{p.bodyParts.torso}</span>
              </div>
              <div className="part-tag">
                <span>왼팔:</span>
                <span className={`part-${p.bodyParts.leftArm}`}>{p.bodyParts.leftArm}</span>
              </div>
              <div className="part-tag">
                <span>오른팔:</span>
                <span className={`part-${p.bodyParts.rightArm}`}>{p.bodyParts.rightArm}</span>
              </div>
              <div className="part-tag">
                <span>왼다리:</span>
                <span className={`part-${p.bodyParts.leftLeg}`}>{p.bodyParts.leftLeg}</span>
              </div>
              <div className="part-tag">
                <span>오른다리:</span>
                <span className={`part-${p.bodyParts.rightLeg}`}>{p.bodyParts.rightLeg}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
              의체 비율: {p.prostheticsRatio}% (N사 이단심문관 주의)
            </div>
          </div>

          {/* Weapon */}
          <div className="sidebar-section">
            <div className="section-title">
              <Flame size={14} color="var(--pm-crimson)" />
              소지 무기
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
              {p.weapon.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              출처: {p.weapon.workshop} | 위력: {p.weapon.damage}
            </div>
          </div>
        </aside>

        {/* Center Column: Narrative Feed & Dynamic Encounter Choices */}
        <main className="glass-panel center-log-column">
          <div className="logs-container">
            {gameState.logs.map((log) => (
              <div
                key={log.id}
                className={`log-item ${
                  log.eventTag?.includes('위기') ||
                  log.eventTag?.includes('인연') ||
                  log.eventTag?.includes('인카운터') ||
                  log.eventTag?.includes('절단') ||
                  log.eventTag?.includes('청소부') ||
                  log.eventTag?.includes('시간세')
                    ? 'danger-event'
                    : ''
                }`}
              >
                <div className="log-header">
                  <span>
                    {log.year ? `${log.year}년 ` : ''}{log.month ? `${log.month}월 ` : ''}{log.day}일 - {log.timeOfDay}
                  </span>
                  {log.eventTag && <span style={{ color: 'var(--pm-gold)' }}>[{log.eventTag}]</span>}
                </div>
                <div className="log-text">{log.text}</div>
                {log.internalMonologue && (
                  <div className="log-monologue">"{log.internalMonologue}"</div>
                )}
                {log.carmenWhisper && (
                  <div className="carmen-whisper">
                    <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                      [심연에서 들려오는 목소리]
                    </span>
                    {log.carmenWhisper}
                  </div>
                )}
              </div>
            ))}
            {/* 지나간 상황은 위로 밀려 올라가고, 새로운 돌발 인카운터와 선택지는 피드 최하단에 표시 */}
            {gameState.activeEncounter && (
              <div className={`active-encounter-box in-log-feed ${gameState.activeEncounter.category === 'NIGHT_SWEEPER_TERROR' ? 'crisis' : ''}`}>
                <div className="encounter-header">
                  <span className={`encounter-category-badge ${gameState.activeEncounter.category === 'NIGHT_SWEEPER_TERROR' ? 'crisis' : ''}`}>
                    {gameState.activeEncounter.category === 'RELATIONSHIP_DISCOVERY' && '♥ 인연의 조우'}
                    {gameState.activeEncounter.category === 'TCORP_AUDIT' && '⏳ T사 시간세 감사'}
                    {gameState.activeEncounter.category === 'NIGHT_SWEEPER_TERROR' && '⚠ 청소부의 밤 습격'}
                    {gameState.activeEncounter.category === 'FIXER_CONTRACT' && '📜 긴급 해결사 의뢰'}
                    {gameState.activeEncounter.category === 'DISTRICT_SINGULARITY' && '🧪 특이점 암시장'}
                    {gameState.activeEncounter.category === 'STREET_COMBAT' && '⚔ 골목 칼부림'}
                    {gameState.activeEncounter.category === 'SHIN_CRISIS' && '★ 심연의 속삭임'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    [시간 정지됨 - 결단 대기 중]
                  </span>
                </div>

                <div className="encounter-title">{gameState.activeEncounter.title}</div>
                <div className="encounter-desc">{gameState.activeEncounter.description}</div>
                {gameState.activeEncounter.atmosphereQuote && (
                  <div className="encounter-atmosphere">"{gameState.activeEncounter.atmosphereQuote}"</div>
                )}

                <div className="encounter-choices-grid">
                  {gameState.activeEncounter.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={isProcessing}
                      className={`encounter-choice-btn ${choice.dangerLevel === 'EXTREME' || choice.dangerLevel === 'HIGH' ? 'danger-extreme' : ''}`}
                      onClick={() => handleSelectChoice(choice)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{choice.text}</strong>
                        <span className="choice-badge">위험도: {choice.dangerLevel}</span>
                      </div>
                      {choice.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{choice.description}</p>
                      )}
                      <div className="choice-cost-pills">
                        {choice.costAhn && <span className="cost-pill" style={{ color: '#ffb3ba' }}>비용: -{choice.costAhn}안</span>}
                        {choice.rewardAhn && <span className="cost-pill" style={{ color: 'var(--pm-gold)' }}>보상: +{choice.rewardAhn}안</span>}
                        {choice.costHp && <span className="cost-pill" style={{ color: '#ff4d6d' }}>체력: -{choice.costHp}</span>}
                        {choice.costSp && <span className="cost-pill" style={{ color: '#9d4edd' }}>정신력: -{choice.costSp}</span>}
                        {choice.costTimeHours && <span className="cost-pill" style={{ color: '#d4a373' }}>시간: -{choice.costTimeHours}h</span>}
                        {choice.rewardTimeHours && <span className="cost-pill" style={{ color: '#faedcd' }}>시간: +{choice.rewardTimeHours}h</span>}
                        {choice.recruitCharacter && <span className="cost-pill" style={{ color: '#ff99c8' }}>♥ 인연 등록</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Action Footer Bar: Flow status & custom input or game over */}
          <div className="action-panel">
            {gameState.isGameOver ? (
              <div style={{ textAlign: 'center', padding: '1.2rem', background: 'rgba(214,40,40,0.15)', borderRadius: '8px', border: '1px solid var(--pm-crimson)' }}>
                <Skull size={32} color="var(--pm-crimson)" style={{ margin: '0 auto 0.4rem' }} />
                <h3 style={{ fontSize: '1.1rem', color: 'var(--pm-crimson)', marginBottom: '0.3rem', fontFamily: 'var(--font-serif)' }}>
                  생의 종착 (Life Extinguished)
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                  {gameState.gameOverReason}
                </p>
                <button
                  type="button"
                  className="action-submit-btn"
                  style={{ background: 'var(--pm-crimson)', borderColor: 'var(--pm-crimson)' }}
                  onClick={() => setIsCreating(true)}
                >
                  새로운 생애 시작하기 (New Life)
                </button>
              </div>
            ) : (
              <div>
                <div className="ambient-flow-bar">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="pulse-indicator" style={{ background: gameState.timeSpeed === 'PAUSED' ? 'var(--pm-crimson)' : 'var(--pm-cyan)' }} />
                    <span>
                      {gameState.activeEncounter
                        ? '돌발 인카운터가 발생했습니다. 위 피드에서 선택지를 결단하십시오.'
                        : gameState.timeSpeed === 'PAUSED'
                        ? '도시의 시간이 멈춰 있습니다. [Space] 키를 눌러 시간을 흐르게 하십시오.'
                        : '도시의 시간이 흐르는 중입니다... (1분 = 1달) 거리의 인카운터를 주시하십시오.'}
                    </span>
                  </div>
                  <div>
                    <span>일시정지/재개</span>
                    <kbd className="space-hotkey-badge">Space</kbd>
                  </div>
                </div>

                {/* Free Text Input (자유 행동/대화 입력) */}
                <form className="custom-action-form" onSubmit={handleCustomActionSubmit} style={{ marginTop: '0.6rem' }}>
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="이곳에 자신만의 자유 행동이나 대화를 입력하여 도시에 즉시 개입할 수 있습니다..."
                    value={customActionText}
                    onChange={(e) => setCustomActionText(e.target.value)}
                    disabled={isProcessing}
                  />
                  <button type="submit" className="action-submit-btn" disabled={isProcessing}>
                    <Send size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {isProcessing ? '처리 중...' : '행동'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>

        {/* Right Column: Relationships, District Info & Taboo */}
        <aside className="glass-panel right-column" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setActiveRightTab('relationships')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '0.78rem',
                background: activeRightTab === 'relationships' ? 'rgba(0,180,216,0.15)' : 'transparent',
                borderColor: activeRightTab === 'relationships' ? 'var(--pm-cyan)' : 'transparent',
                color: activeRightTab === 'relationships' ? 'var(--pm-cyan)' : 'var(--text-muted)',
                borderRadius: '4px',
                borderWidth: '1px',
                borderStyle: 'solid',
                cursor: 'pointer',
              }}
            >
              인연·히로인 ({p.relationships.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('district')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '0.78rem',
                background: activeRightTab === 'district' ? 'rgba(0,180,216,0.15)' : 'transparent',
                borderColor: activeRightTab === 'district' ? 'var(--pm-cyan)' : 'transparent',
                color: activeRightTab === 'district' ? 'var(--pm-cyan)' : 'var(--text-muted)',
                borderRadius: '4px',
                borderWidth: '1px',
                borderStyle: 'solid',
                cursor: 'pointer',
              }}
            >
              구역 생태계
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('taboo')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '0.78rem',
                background: activeRightTab === 'taboo' ? 'rgba(214,40,40,0.15)' : 'transparent',
                borderColor: activeRightTab === 'taboo' ? 'var(--pm-crimson)' : 'transparent',
                color: activeRightTab === 'taboo' ? 'var(--pm-crimson)' : 'var(--text-muted)',
                borderRadius: '4px',
                borderWidth: '1px',
                borderStyle: 'solid',
                cursor: 'pointer',
              }}
            >
              머리의 금기
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeRightTab === 'relationships' && (
              <div>
                <div className="section-title">
                  <User size={14} color="var(--pm-cyan)" />
                  인연 목록 ({p.relationships.length}명)
                </div>

                {p.relationships.length === 0 ? (
                  <div className="empty-relationships-placeholder">
                    <Heart size={24} color="var(--text-dim)" style={{ margin: '0 auto 0.6rem', display: 'block' }} />
                    아직 깊은 인연을 맺은 이가 없습니다.<br />
                    도시의 거리에서 위기에 처한 이를 구출하거나 조우하십시오.
                  </div>
                ) : (
                  p.relationships.map((npc) => (
                    <div key={npc.id} className="relationship-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{npc.name}</strong>
                        <span className="relationship-badge">{npc.title}</span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        관계 상태:{' '}
                        <span style={{ color: npc.type === 'lover' ? '#ff4d6d' : 'var(--pm-cyan)', fontWeight: 'bold' }}>
                          {npc.type === 'stranger' && '초면'}
                          {npc.type === 'acquaintance' && '아는 사이'}
                          {npc.type === 'ally' && '협력자'}
                          {npc.type === 'vow_partner' && '맹세의 동료'}
                          {npc.type === 'lover' && '♥ 연인 (Lover)'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>호감도:</span>
                        <span style={{ color: 'var(--pm-gold)' }}>{npc.affection} / 100</span>
                      </div>
                      <div className="meter-track" style={{ height: '5px', marginBottom: '0.5rem' }}>
                        <div style={{ height: '100%', width: `${npc.affection}%`, background: 'var(--pm-gold)' }} />
                      </div>

                      {npc.currentCrisis && (
                        <div className="npc-crisis">
                          <strong>당면한 위기:</strong> {npc.currentCrisis}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeRightTab === 'district' && (
              <div>
                <div className="section-title">
                  <Compass size={14} color="var(--pm-cyan)" />
                  {currentDistrict.wingName}
                </div>
                <div style={{ fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                  <strong style={{ color: 'var(--pm-gold)' }}>독점 특이점:</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{currentDistrict.singularity}</p>
                </div>
                <div style={{ fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                  <strong style={{ color: 'var(--pm-cyan)' }}>둥지 생태계:</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{currentDistrict.nestCulture}</p>
                </div>
                <div style={{ fontSize: '0.82rem', marginBottom: '0.8rem' }}>
                  <strong style={{ color: '#ff6b6b' }}>뒷골목 환경:</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{currentDistrict.backstreetCulture}</p>
                </div>
                <div style={{ fontSize: '0.82rem' }}>
                  <strong style={{ color: 'var(--pm-crimson)' }}>구역 주의사항:</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{currentDistrict.tabooHint}</p>
                </div>
              </div>
            )}

            {activeRightTab === 'taboo' && (
              <div>
                <div className="section-title">
                  <AlertTriangle size={14} color="var(--pm-crimson)" />
                  머리의 금기 (The Taboos)
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                  머리는 도덕이 아닌 체제의 지속성과 인류의 형태 보존을 위해 금기를 집행합니다.
                </p>

                <div style={{ marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--pm-crimson)', marginBottom: '3px' }}>
                    <span>불순물(Impurity) 판정 게이지</span>
                    <span>{p.taboo.impurityLevel} / 100</span>
                  </div>
                  <div className="meter-track">
                    <div style={{ height: '100%', width: `${p.taboo.impurityLevel}%`, background: 'var(--pm-crimson)' }} />
                  </div>
                </div>

                <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', lineHeight: '1.7' }}>
                  <li>인공지능 윤리 개정안 (AI 자의식 부여 금지)</li>
                  <li>복제인간 7일 초과 공존 금지</li>
                  <li>합법 거주구역 무단 침입 및 파괴 금지</li>
                  <li>총기 사거리·관통력 규격 및 세금 납부</li>
                  <li>트레스 협회 공방 특허 침해 금지</li>
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 월간 상황 및 동적 선택지 모달 (Monthly Situation Overlay) */}
      {gameState.pendingSituation && (
        <div className="monthly-situation-overlay">
          <div className={`monthly-situation-modal ${gameState.pendingSituation.urgency === 'CRISIS' ? 'crisis-mode' : ''}`}>
            <div>
              <span
                className="situation-tag-badge"
                style={{
                  background: gameState.pendingSituation.urgency === 'CRISIS' ? 'rgba(214,40,40,0.2)' : 'rgba(0,180,216,0.2)',
                  borderColor: gameState.pendingSituation.urgency === 'CRISIS' ? 'var(--pm-crimson)' : 'var(--pm-cyan)',
                  color: gameState.pendingSituation.urgency === 'CRISIS' ? '#ff6b6b' : 'var(--pm-cyan)',
                  border: '1px solid',
                }}
              >
                {gameState.pendingSituation.urgency === 'CRISIS' ? '⚠ 위기 발생 (Crisis)' : '월간 주요 분기점'}
              </span>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontFamily: 'var(--font-serif)', marginTop: '0.3rem' }}>
                {gameState.pendingSituation.title}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                도시력 {gameState.pendingSituation.year}년 {gameState.pendingSituation.month}월 (1달 = 60초 경과)
              </div>
            </div>

            <div className="situation-lore-text">
              {gameState.pendingSituation.loreDescription}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.8rem', fontStyle: 'italic' }}>
                풍경: {gameState.pendingSituation.atmosphere}
              </div>
            </div>

            {gameState.pendingSituation.carmenWhisper && (
              <div className="carmen-whisper-card">
                <strong>[카르멘의 속삭임]</strong> {gameState.pendingSituation.carmenWhisper}
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--pm-gold)', fontWeight: 'bold', marginBottom: '0.6rem' }}>
                이번 달의 결단 (선택 시 시간이 재개됩니다):
              </div>

              <div className="monthly-choices-list">
                {gameState.pendingSituation.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isProcessing}
                    className={`monthly-choice-card ${choice.dangerLevel === 'EXTREME' ? 'danger-extreme' : ''}`}
                    onClick={() => handleSelectChoice(choice)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{choice.text}</strong>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: choice.dangerLevel === 'EXTREME' || choice.dangerLevel === 'HIGH' ? 'rgba(214,40,40,0.2)' : 'rgba(0,180,216,0.15)',
                          color: choice.dangerLevel === 'EXTREME' || choice.dangerLevel === 'HIGH' ? '#ff6b6b' : 'var(--pm-cyan)',
                          border: `1px solid ${choice.dangerLevel === 'EXTREME' || choice.dangerLevel === 'HIGH' ? 'var(--pm-crimson)' : 'var(--pm-cyan)'}`,
                        }}
                      >
                        위험도: {choice.dangerLevel}
                      </span>
                    </div>

                    {choice.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {choice.description}
                      </p>
                    )}

                    <div className="choice-cost-pills">
                      {choice.costAhn ? <span className="cost-pill" style={{ color: '#ffb3ba' }}>비용: -{choice.costAhn}안</span> : null}
                      {choice.rewardAhn ? <span className="cost-pill" style={{ color: 'var(--pm-gold)' }}>보상: +{choice.rewardAhn}안</span> : null}
                      {choice.costHp ? <span className="cost-pill" style={{ color: '#ff4d6d' }}>체력: -{choice.costHp}</span> : null}
                      {choice.costSp ? <span className="cost-pill" style={{ color: '#9d4edd' }}>정신력: -{choice.costSp}</span> : null}
                      {choice.costTimeHours ? <span className="cost-pill" style={{ color: '#d4a373' }}>⏳ 소모시간: -{choice.costTimeHours}h</span> : null}
                      {choice.rewardTimeHours ? <span className="cost-pill" style={{ color: '#faedcd' }}>⏳ 획득시간: +{choice.rewardTimeHours}h</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {apiKeyModalOpen && (
        <div className="creation-overlay" style={{ zIndex: 2000 }}>
          <div className="creation-card" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--pm-cyan)', marginBottom: '0.6rem' }}>
              Gemini API Key 설정
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Google Gemini API 키를 입력하시면 AI 서사 생성기가 매달 시간의 흐름과 거리의 돌발 인카운터를 프문 특유의 하드보일드 문체로 실시간 직조합니다. (키가 없어도 정밀 내장 룰 엔진으로 완전하게 플레이 가능합니다.)
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Gemini API Key
              </label>
              {geminiApiKey ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--pm-cyan)', fontWeight: 'bold' }}>
                  ✓ 브라우저 로컬 저장소(localStorage) 보관 중
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>미등록</span>
              )}
            </div>

            <input
              type="password"
              className="custom-input"
              style={{ width: '100%', marginBottom: '1.2rem', borderColor: geminiApiKey ? 'var(--pm-cyan)' : undefined }}
              placeholder="AIzaSy... (입력 즉시 로컬에 영구 저장됩니다)"
              value={geminiApiKey}
              onChange={(e) => {
                const val = e.target.value;
                setGeminiApiKey(val);
                AINarrativeDirector.saveApiKey(val);
              }}
            />

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                className="action-submit-btn"
                style={{ flex: 1 }}
                onClick={handleSaveApiKey}
              >
                저장 및 적용
              </button>
              {geminiApiKey && (
                <button
                  type="button"
                  className="action-submit-btn"
                  style={{ background: 'rgba(214, 40, 40, 0.2)', borderColor: 'var(--pm-crimson)', color: '#ff6b6b' }}
                  onClick={handleClearApiKey}
                >
                  키 삭제
                </button>
              )}
              <button
                type="button"
                className="action-submit-btn"
                style={{ background: '#242838', borderColor: '#343a50' }}
                onClick={() => setApiKeyModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Return Confirmation Modal */}
      {showExitTitleModal && (
        <div className="creation-overlay" style={{ zIndex: 2000 }} onClick={() => setShowExitTitleModal(false)}>
          <div
            className="creation-card"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
              <RotateCcw size={20} color="var(--pm-crimson)" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontFamily: 'var(--font-serif)' }}>
                타이틀로 복귀
              </h3>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.4rem' }}>
              현재 진행 중인 도시의 생애를 중단하고 메인 화면(캐릭터 생성)으로 돌아가시겠습니까?
              <br />
              <span style={{ color: '#ff6b6b', fontSize: '0.78rem' }}>
                * 저장되지 않은 진행 데이터는 초기화됩니다.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="action-submit-btn"
                style={{ background: 'var(--pm-crimson)', borderColor: 'var(--pm-crimson)', color: '#fff' }}
                onClick={() => {
                  setGameState(null);
                  setIsCreating(true);
                  timeKeeperRef.current.reset(0);
                  setShowExitTitleModal(false);
                }}
              >
                타이틀로 돌아가기
              </button>
              <button
                type="button"
                className="action-submit-btn"
                style={{ background: '#242838', borderColor: '#343a50' }}
                onClick={() => setShowExitTitleModal(false)}
              >
                계속 플레이
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
