import type { GameState, MonthlySituation, ActionChoice, PlayerCharacter } from '../types/game';
import { DISTRICTS_DATA } from './districtsData';
import { AINarrativeDirector } from './aiNarrative';

export class DynamicChoiceGenerator {
  private static cachedNextSituation: MonthlySituation | null = null;
  private static isPrefetching: boolean = false;

  /**
   * 다음 달의 상황 및 선택지를 사전 요청(Prefetch)
   */
  static async prefetchNextMonth(state: GameState, apiKey?: string): Promise<void> {
    if (this.isPrefetching) return;
    this.isPrefetching = true;
    try {
      const nextMonth = state.month === 12 ? 1 : state.month + 1;
      const nextYear = state.month === 12 ? state.year + 1 : state.year;
      const situation = await this.generateSituation(state, nextYear, nextMonth, apiKey);
      this.cachedNextSituation = situation;
    } catch (err) {
      console.warn('Prefetching next month failed, will fallback upon arrival:', err);
    } finally {
      this.isPrefetching = false;
    }
  }

  /**
   * 해당 월의 상황 및 선택지를 획득 (캐시가 있으면 즉시 반환, 없으면 생성)
   */
  static async getSituationForMonth(
    state: GameState,
    year: number,
    month: number,
    apiKey?: string
  ): Promise<MonthlySituation> {
    if (this.cachedNextSituation && this.cachedNextSituation.month === month && this.cachedNextSituation.year === year) {
      const situation = this.cachedNextSituation;
      this.cachedNextSituation = null;
      return situation;
    }
    return await this.generateSituation(state, year, month, apiKey);
  }

  /**
   * API 또는 로컬 템플릿을 통해 동적 상황 및 선택지 3~4개 생성
   */
  private static async generateSituation(
    state: GameState,
    year: number,
    month: number,
    apiKey?: string
  ): Promise<MonthlySituation> {
    const key = apiKey || AINarrativeDirector.getSavedApiKey();
    const p = state.player;
    const district = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[20];

    // API Key가 유효할 경우 Gemini에 정밀 서사 및 동적 선택지 생성 요청
    if (key.trim()) {
      try {
        const aiSituation = await this.fetchAISituation(state, year, month, district, key);
        if (aiSituation) {
          return aiSituation;
        }
      } catch (err) {
        console.warn('AI dynamic choice generation failed, using procedural fallback:', err);
      }
    }

    // 폴백 절차적 생성 (T사 및 구역별 특화 템플릿)
    return this.generateProceduralFallback(state, year, month);
  }

  /**
   * Gemini API 호출
   */
  private static async fetchAISituation(
    state: GameState,
    year: number,
    month: number,
    district: any,
    apiKey: string
  ): Promise<MonthlySituation | null> {
    const p = state.player;
    const isTCorp = p.currentDistrictId === 20;

    const systemPrompt = `당신은 '프로젝트 문(Project Moon - 로보토미 코퍼레이션, 라이브러리 오브 루이나, 림버스 컴퍼니)' 세계관의 TRPG 게임 마스터이자 서사 디렉터입니다.
도시(The City)의 잔혹하고 비정한 현실, 특이점의 이면, 자본주의적 착취, 그리고 신(心)과 망(望), 뒤틀림의 위기를 바탕으로 이번 달(${year}년 ${month}월) 플레이어가 마주할 주요 사건과 3~4개의 차별화된 선택지를 JSON으로 생성하십시오.

${isTCorp ? `[중요: 20구 T사(T Corp) 특별 규칙]
- T사는 '시간'을 화폐이자 세금으로 수탈하는 산업혁명 스팀펑크풍 구역입니다.
- 시간세(Time Tax) 체납 시 신체 시간이 정지되어 흑백화(미라화)되거나 징수관에게 분쇄당합니다.
- 반드시 시간세 납부, 시간 거래/대출, 시간 가속 공방 노동, 시간 징수관 조우 등 T사 특유의 시간 관련 선택지 1개 이상을 포함하십시오.` : ''}

반드시 아래 JSON 포맷을 엄격하게 지켜 응답하십시오:
{
  "title": "사건의 강렬한 제목 (예: T사 제3시간징수관의 예고 통첩 / 붉은 안개의 환영 / 맛의 골목 만찬 초대)",
  "loreDescription": "3~4문장의 하드보일드하고 시적인 상황 묘사. 도시의 잔혹함과 인물들의 비극을 묘사.",
  "atmosphere": "주변의 시각적·청각적 풍경 (예: 흑백으로 물드는 가로등, 톱니바퀴의 굉음)",
  "urgency": "NORMAL" | "CRISIS" | "OPPORTUNITY",
  "carmenWhisper": ${p.sp <= -20 ? '"카르멘의 속삭임 1문장"' : 'null'},
  "choices": [
    {
      "id": "choice_1",
      "text": "행동 이름 (간결하고 직관적)",
      "description": "이 행동을 취할 때의 구체적 방법과 따르는 위험/기대효과",
      "actionType": "WORK" | "EXPLORE" | "COMBAT" | "PAY_TAX" | "PAY_TIME_TAX" | "BORROW_TIME" | "BUY_TIME" | "TRAIN_SHIN" | "ROMANCE" | "EVENT_CHOICE",
      "dangerLevel": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
      "costAhn": 0,
      "costSp": 0,
      "costHp": 0,
      "costTimeHours": ${isTCorp ? '소모 시간(시간 단위, 예: 8 또는 24)' : '0'},
      "rewardTimeHours": 0,
      "rewardAhn": 0
    }
  ]
}`;

    const userPrompt = `[플레이어 현재 상태]
- 도시력: ${year}년 ${month}월
- 이름: ${p.name} (성별: ${p.gender})
- 위치: ${district.id}구 (${district.wingName}, ${p.isInsideNest ? '둥지' : '뒷골목'})
- 특이점/구역문화: ${district.singularity} / ${district.backstreetCulture}
- 재화: ${p.ahn}안 | 거주세 남은 일수: ${p.housingTaxDaysLeft}일
${isTCorp ? `- T사 개인 시간 잔여량: ${p.timeBalanceHours ?? 24}시간 | 시간세 납부 기한: ${p.timeTaxDueDays ?? 7}일` : ''}
- 신체: HP ${p.hp}/${p.maxHp} | 의체 비율: ${p.prostheticsRatio}%
- 정신/이능: SP ${p.sp} | 신(心) 각성: ${p.hasShin} | 망(望): ${p.mangLevel}단계
- 인연: ${p.relationships.map((r) => `${r.name}(${r.title}, 호감:${r.affection}, 위기:${r.currentCrisis})`).join(', ') || '없음'}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.85,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    return {
      year,
      month,
      title: parsed.title || `${month}월의 도시 풍경`,
      loreDescription: parsed.loreDescription || '차가운 골목에 또 한 달의 그림자가 드리웁니다.',
      atmosphere: parsed.atmosphere || '연기와 기름 냄새가 뒤섞인 스산한 바람.',
      urgency: parsed.urgency || 'NORMAL',
      carmenWhisper: parsed.carmenWhisper || undefined,
      choices: (parsed.choices || []).slice(0, 4),
    };
  }

  /**
   * API 미사용 시 정밀 룰 기반 폴백 템플릿 생성
   */
  public static generateProceduralFallback(
    state: GameState,
    year: number,
    month: number
  ): MonthlySituation {
    const p = state.player;
    const isTCorp = p.currentDistrictId === 20;

    if (isTCorp) {
      return this.generateTCorpFallback(p, year, month);
    }

    // 일반 구역 폴백
    const district = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[11];
    const relationship = p.relationships[0];

    const choices: ActionChoice[] = [
      {
        id: `fb_work_${month}`,
        text: `${district.wingName} 하청 정규 의뢰 수주`,
        description: `위험하지만 확실한 안(Ahn)을 벌어들입니다. 체력과 정신력이 일부 소모됩니다.`,
        actionType: 'WORK',
        dangerLevel: 'MEDIUM',
        costSp: 8,
        costHp: 5,
        rewardAhn: 450,
      },
      {
        id: `fb_explore_${month}`,
        text: `${district.id}구 뒷골목의 특이점 밀수품 암시장 수색`,
        description: `버려진 공방 부품이나 비밀 정보를 탐색합니다. 불순물 단속반이나 깡패들과 충돌할 수 있습니다.`,
        actionType: 'EXPLORE',
        dangerLevel: 'HIGH',
        costSp: 10,
        rewardAhn: 300,
      },
    ];

    if (relationship) {
      choices.push({
        id: `fb_romance_${month}`,
        text: `${relationship.name}의 거처 방문 및 위기("${relationship.currentCrisis}") 구원`,
        description: `동료의 곁을 지키며 유대를 다집니다. 상호 신뢰와 정신력이 크게 회복됩니다.`,
        actionType: 'ROMANCE',
        dangerLevel: 'LOW',
        costSp: -15,
        costAhn: 100,
      });
    }

    choices.push({
      id: `fb_train_${month}`,
      text: p.hasShin ? '신(心)의 오라 결집 및 망(望)의 파괴력 연마' : '극한의 위기 속에서 신(心) 각성을 위한 내면 직면',
      description: '정신의 에너지를 다스려 전투 능력치를 끌어올립니다.',
      actionType: 'TRAIN_SHIN',
      dangerLevel: 'HIGH',
      costSp: 15,
    });

    return {
      year,
      month,
      title: `${month}월: ${district.wingName}의 차가운 톱니바퀴`,
      loreDescription: `${district.id}구의 거리는 언제나처럼 비명과 기름 연기로 자욱합니다. 날개의 특이점이 빚어낸 기형적인 번영 뒤편에서, 하층민들은 살아남기 위해 서로의 목을 죕니다. 이번 달에도 당신에게 주어진 시간은 가혹한 선택을 요구합니다.`,
      atmosphere: `축축한 아스팔트 위로 붉은 네온사인이 번져나갑니다.`,
      urgency: 'NORMAL',
      carmenWhisper: p.sp <= -25 ? '...포기하렴. 그 발버둥이 무슨 의미가 있겠니? 너 자신을 온전히 피워내.' : undefined,
      choices,
    };
  }

  /**
   * 20구 T사(Time Track) 전용 정밀 폴백 시나리오
   */
  private static generateTCorpFallback(p: PlayerCharacter, year: number, month: number): MonthlySituation {
    const timeHours = p.timeBalanceHours ?? 24;
    const timeTaxDays = p.timeTaxDueDays ?? 7;
    const isCrisis = timeHours <= 12 || timeTaxDays <= 2;

    const choices: ActionChoice[] = [];

    // 1. 시간세 납부 (안을 지불하여 T사 정규 시간 충전)
    choices.push({
      id: `tcorp_pay_tax_${month}`,
      text: 'T사 세무국에 시간세 납부 및 72시간 정규 시간 구매',
      description: '450안을 지불하여 시간세를 납부하고 72시간의 합법 활동 시간을 연장합니다.',
      actionType: 'PAY_TIME_TAX',
      dangerLevel: 'LOW',
      costAhn: 450,
      rewardTimeHours: 72,
    });

    // 2. 시간 가속 유리관에서 초고속 노동
    choices.push({
      id: `tcorp_work_tt2_${month}`,
      text: 'TT2 프로토콜 가속 유리관에서 10배속 극한 노동',
      description: '체력과 개인 시간 24시간을 소모하여 순식간에 800안의 거금을 수령합니다.',
      actionType: 'WORK',
      dangerLevel: 'HIGH',
      costHp: 20,
      costSp: 15,
      costTimeHours: 24,
      rewardAhn: 800,
    });

    // 3. 고리대금 시간 대출 (지하 전당포)
    choices.push({
      id: `tcorp_borrow_time_${month}`,
      text: '뒷골목 암시장 사채업자에게 긴급 시간(48시간) 대출',
      description: '즉시 48시간의 시간을 얻지만, 다음 달에 3배의 안(Ahn)을 이자로 갚아야 합니다.',
      actionType: 'BORROW_TIME',
      dangerLevel: 'EXTREME',
      rewardTimeHours: 48,
      costSp: 10,
    });

    // 4. 시간 징수관 또는 톱니바퀴 골목 수색
    choices.push({
      id: `tcorp_explore_clocks_${month}`,
      text: '연기 자욱한 증기 시계탑 폐허 수색 (시간 부속품 수거)',
      description: '부서진 시간 배터리와 렌즈를 수거합니다. 시간 징수관의 순찰선에 발각될 수 있습니다.',
      actionType: 'EXPLORE',
      dangerLevel: 'MEDIUM',
      costSp: 8,
      rewardTimeHours: 12,
      rewardAhn: 200,
    });

    return {
      year,
      month,
      title: isCrisis
        ? `[T사 긴급 경보] ${month}월: 시간세 체납 및 흑백화(정지) 위기`
        : `${month}월: T사 시간 징수국의 엄격한 회람`,
      loreDescription: isCrisis
        ? `T사 20구의 증기 시계가 날카롭게 종을 울립니다. 당신의 손끝이 점점 색을 잃고 잿빛 흑백으로 굳어가고 있습니다. 시간세를 즉시 납부하지 않으면, 거대한 태엽 추를 든 3등급 시간 징수관들이 당신의 신체 시간을 통째로 압류해 박제로 만들어버릴 것입니다!`
        : `산업혁명의 스팀과 기계 소음이 20구 하늘을 뒤덮습니다. 자본가들은 거금을 들여 하루를 100시간으로 늘려 누리지만, 빈민들은 몇 시간의 생존 시간을 사기 위해 피눈물을 흘립니다. 이번 달, 당신의 남은 시간 잔여량은 [${timeHours}시간]입니다.`,
      atmosphere: `째깍거리는 금속 태엽 소리와 증기 파이프에서 뿜어져 나오는 유독한 갈색 연기.`,
      urgency: isCrisis ? 'CRISIS' : 'NORMAL',
      carmenWhisper: p.sp <= -20 ? '...시간마저 빼앗기는 삶에 무슨 가치가 남았니? 차라리 영원히 정지된 채 네 안의 빛을 꺼내렴.' : undefined,
      choices,
    };
  }
}
