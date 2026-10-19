import React, { useState, useEffect, useRef } from 'react';
import type { GameState, Gender, ActionChoice } from './types/game';
import { CoreEngine } from './engine/coreEngine';
import { DISTRICTS_DATA } from './engine/districtsData';
import { AINarrativeDirector } from './engine/aiNarrative';
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
} from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const [charName, setCharName] = useState('');
  const [charGender, setCharGender] = useState<Gender>('male');
  const [activeRightTab, setActiveRightTab] = useState<'relationships' | 'district' | 'taboo'>('relationships');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(AINarrativeDirector.getSavedApiKey());
  const [customActionText, setCustomActionText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.logs]);

  // 캐릭터 생성
  const handleStartGame = () => {
    const newState = CoreEngine.createCharacter(charName, charGender);
    setGameState(newState);
    setIsCreating(false);
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
        const latestLog = updatedState.logs[0];
        const aiResult = await AINarrativeDirector.generateNarrativeWithAI(
          gameState,
          choice,
          latestLog,
          { apiKey: geminiApiKey, model: 'gemini-1.5-flash' }
        );

        updatedState.logs[0] = {
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
              뒷골목의 이방인 (Stranger in the City)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              규칙과 수치는 차가운 엔진이 통제하며, 당신의 삶과 비극은 AI가 엮어냅니다.
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

          <div>
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

          <div style={{ background: 'rgba(214, 40, 40, 0.08)', border: '1px solid #4a151b', padding: '0.8rem', borderRadius: '6px', fontSize: '0.78rem', color: '#ffb3ba', margin: '1.2rem 0' }}>
            * 26개 구 중 랜덤한 구역에서 출생합니다. (85% 확률로 뒷골목, 15% 확률로 둥지 출생)<br />
            * 신(心)과 망(望)은 처음부터 주어지지 않으며, 극한의 시련과 감정의 맹세를 통해 후천적으로 개화합니다.
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
  const currentDistrict = DISTRICTS_DATA[p.currentDistrictId];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Game Header */}
      <header className="game-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="brand-title">THE CITY</span>
          <span className="brand-badge">도시력 {gameState.year}년</span>
          <span className="brand-badge" style={{ borderColor: 'var(--pm-cyan)', color: 'var(--pm-cyan)', background: 'rgba(0,180,216,0.1)' }}>
            Day {gameState.day}
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
            {gameState.timeOfDay === 'MORNING' && '오전 (Morning)'}
            {gameState.timeOfDay === 'AFTERNOON' && '오후 (Afternoon)'}
            {gameState.timeOfDay === 'EVENING' && '저녁 (Evening)'}
            {gameState.timeOfDay === 'NIGHT_SWEEPER' && '⚠ 뒷골목의 밤 (03:13 ~ 04:34)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            {geminiApiKey ? 'AI 연동 활성 (Gemini)' : 'API Key 설정'}
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
            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: p.isNestBorn ? 'rgba(0,180,216,0.15)' : 'rgba(214,40,40,0.15)', color: p.isNestBorn ? 'var(--pm-cyan)' : '#ff6b6b' }}>
              {p.isNestBorn ? '둥지 출생' : '뒷골목 출생'}
            </span>
          </div>

          {/* Vitals: HP & SP */}
          <div className="sidebar-section" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '0.8rem', marginBottom: '1rem' }}>
            <div className="status-meter-container">
              <div className="meter-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff6b6b' }}>
                  <Heart size={12} /> HP (체력)
                </span>
                <span>{p.hp} / {p.maxHp}</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill-hp" style={{ width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%` }} />
              </div>
            </div>

            <div className="status-meter-container">
              <div className="meter-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: p.sp <= -30 ? 'var(--pm-crimson)' : 'var(--pm-cyan)' }}>
                  <Brain size={12} /> SP (정신력)
                </span>
                <span>{p.sp} / 45</span>
              </div>
              <div className={`meter-track ${p.sp <= -30 ? 'sp-panic-pulse' : ''}`}>
                <div
                  className="meter-fill-sp"
                  style={{
                    width: `${Math.max(0, ((p.sp + 45) / 90) * 100)}%`,
                    background: p.sp <= -30 ? 'linear-gradient(90deg, #d62828, #b5179e)' : undefined,
                  }}
                />
              </div>
              {p.sp <= -30 && (
                <div style={{ fontSize: '0.7rem', color: '#ff99c8', marginTop: '3px' }}>
                  ⚠ 위험: 카르멘의 환청이 귓가를 맴돕니다
                </div>
              )}
            </div>
          </div>

          {/* Resources: Ahn & Housing Tax */}
          <div className="sidebar-section" style={{ padding: '0 0.2rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--pm-gold)' }}>
                <Coins size={14} /> 소지금 (Ahn)
              </span>
              <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{p.ahn} 안</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: p.housingTaxDaysLeft <= 1 ? 'var(--pm-crimson)' : 'var(--text-main)' }}>
                <Home size={14} /> 거주세 잔여 기한
              </span>
              <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: p.housingTaxDaysLeft <= 1 ? 'var(--pm-crimson)' : 'var(--text-main)' }}>
                {p.housingTaxDaysLeft} 일
              </span>
            </div>
            {p.housingTaxDaysLeft <= 0 && (
              <div style={{ fontSize: '0.7rem', color: '#ff4d6d', marginTop: '2px' }}>
                * 만료됨: 오늘 밤 청소부의 표적이 됩니다!
              </div>
            )}
          </div>

          {/* Shin (心) and Mang (望) Power System */}
          <div className="sidebar-section">
            <div className="section-title">
              <Zap size={14} color="var(--pm-cyan)" />
              초상 이능력: 신(心) & 망(望)
            </div>

            <div className={`shin-aura-container ${p.shinActive ? 'shin-aura-active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: p.hasShin ? 'var(--pm-cyan)' : 'var(--text-dim)' }}>
                  신(心) - 정신 오라
                </span>
                {p.hasShin ? (
                  <button
                    type="button"
                    onClick={handleToggleShin}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: p.shinActive ? 'var(--pm-cyan)' : '#242838',
                      color: p.shinActive ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {p.shinActive ? '활성 (ON)' : '대기 (OFF)'}
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

              {/* Mang Rings (0 to 5) */}
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

          {/* Weapon / Workshop */}
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

        {/* Center Column: Narrative Feed & Action Choices */}
        <main className="glass-panel center-log-column">
          <div className="logs-container">
            {gameState.logs.map((log) => (
              <div
                key={log.id}
                className={`log-item ${log.eventTag?.includes('위기') || log.eventTag?.includes('절단') || log.eventTag?.includes('청소부') ? 'danger-event' : ''}`}
              >
                <div className="log-header">
                  <span>Day {log.day} - {log.timeOfDay}</span>
                  {log.eventTag && <span style={{ color: 'var(--pm-gold)' }}>[{log.eventTag}]</span>}
                </div>
                <div className="log-text">{log.text}</div>
                {log.internalMonologue && (
                  <div className="log-monologue">"{log.internalMonologue}"</div>
                )}
                {log.carmenWhisper && (
                  <div className="carmen-whisper-box">
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>
                      [빛 속에서 들려오는 목소리]
                    </div>
                    {log.carmenWhisper}
                  </div>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Action Choice Buttons */}
          <div className="choices-panel">
            {gameState.isGameOver ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ color: 'var(--pm-crimson)', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Skull size={20} /> 종말 (GAME OVER)
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
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
              <>
                <div className="choices-grid">
                  {gameState.currentChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={isProcessing}
                      className={`choice-btn ${choice.dangerLevel === 'HIGH' || choice.dangerLevel === 'EXTREME' ? 'danger-high' : ''}`}
                      onClick={() => handleSelectChoice(choice)}
                    >
                      <span style={{ fontWeight: 'bold' }}>{choice.text}</span>
                      <span className="choice-badge">
                        위험도: {choice.dangerLevel} {choice.costAhn ? `| 비용: ${choice.costAhn}안` : ''}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Free Text Input */}
                <form className="custom-action-form" onSubmit={handleCustomActionSubmit}>
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="이곳에 자신만의 자유 행동이나 대화를 입력할 수 있습니다..."
                    value={customActionText}
                    onChange={(e) => setCustomActionText(e.target.value)}
                    disabled={isProcessing}
                  />
                  <button type="submit" className="action-submit-btn" disabled={isProcessing}>
                    <Send size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {isProcessing ? '처리 중...' : '행동'}
                  </button>
                </form>
              </>
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
              인연·히로인
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
              구역 정보
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

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeRightTab === 'relationships' && (
              <div>
                <div className="section-title">
                  <User size={14} color="var(--pm-gold)" />
                  인연 목록
                </div>
                {p.relationships.map((npc) => (
                  <div key={npc.id} className="npc-card">
                    <div className="npc-name">
                      <span>{npc.name}</span>
                      <span style={{ fontSize: '0.75rem', color: npc.type === 'lover' ? '#ff4d6d' : 'var(--pm-cyan)' }}>
                        {npc.type === 'lover' ? '♥ 연인 (Lover)' : npc.type === 'vow_partner' ? '맹세의 동료' : '지인'}
                      </span>
                    </div>
                    <div className="npc-title">{npc.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      {npc.backstory}
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
                ))}
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

      {/* API Key Modal */}
      {apiKeyModalOpen && (
        <div className="creation-overlay" style={{ zIndex: 2000 }}>
          <div className="creation-card" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--pm-cyan)', marginBottom: '0.6rem' }}>
              Gemini API Key 설정
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Google Gemini API 키를 입력하시면 AI 서사 생성기가 실시간으로 프문풍의 깊이 있는 상황 묘사와 카르멘의 환청을 직조합니다. (키가 없어도 내장 룰 엔진으로 완전하게 플레이 가능합니다.)
            </p>

            <input
              type="password"
              className="custom-input"
              style={{ width: '100%', marginBottom: '1.2rem' }}
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
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
    </div>
  );
}
