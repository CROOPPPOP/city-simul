import type { GameState, ActiveEncounter, ActionChoice } from '../types/game';
import { DISTRICTS_DATA } from './districtsData';
import { generateDiscoverableNpc } from './relationshipsData';
import { AINarrativeDirector } from './aiNarrative';

export class EncounterDirector {
  /**
   * 일상 서사 문장 생성 (시간이 흐를 때 중앙 피드에 가볍게 누적)
   */
  static generateAmbientLog(state: GameState): { text: string; monologue?: string } {
    const p = state.player;
    const dist = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[20];
    const isTCorp = p.currentDistrictId === 20;

    if (state.timeOfDay === 'MORNING') {
      if (isTCorp) {
        return {
          text: `오전 06:00 - 20구 거대한 증기 시계탑에서 육중한 종소리가 울립니다. 개인 시간 잔여량: ${p.timeBalanceHours ?? 0}시간.`,
          monologue: '오늘도 하루분의 시간을 지불하며 눈을 떴다.',
        };
      }
      return {
        text: `오전 06:00 - ${dist.id}구 골목 위로 스산한 새벽안개가 걷히고, 합성 영양 찌꺼기를 파는 노점들이 삐걱거리며 문을 엽니다.`,
        monologue: '또 하루를 버텨내야 한다.',
      };
    }

    if (state.timeOfDay === 'AFTERNOON') {
      return {
        text: `오후 12:00 - 둥지에서 뿜어져 나온 매연과 기름 냄새가 뒷골목 골짜기로 내려앉습니다. 거주세 잔여: ${p.housingTaxDaysLeft}일.`,
        monologue: '어디선가 사이렌 소리가 들려온다. 누군가의 목숨값이 치러진 모양이다.',
      };
    }

    if (state.timeOfDay === 'EVENING') {
      return {
        text: `오후 18:00 - 붉은 네온사인이 깨진 유리창마다 번져나갑니다. 거리의 부랑자들은 곧 찾아올 심야를 대비해 덧문을 걸어 잠급니다.`,
        monologue: '해가 지고 있다. 곧 청소부들의 시간이 온다.',
      };
    }

    // NIGHT_SWEEPER
    return {
      text: `심야 03:13 - 도시의 모든 불빛이 일제히 소등되며 '뒷골목의 밤'이 시작되었습니다. 바깥 골목에서 무거운 발소리와 가위 갈리는 소리가 들려옵니다.`,
      monologue: '숨소리조차 내서는 안 된다. 벽 너머에 그것들이 있다.',
    };
  }

  /**
   * 인카운터 발생 조건 판정
   */
  static shouldTriggerEncounter(state: GameState, lastEncounterDay: number): boolean {
    if (state.activeEncounter !== null || state.pendingSituation !== null || state.isGameOver) {
      return false;
    }

    // 뒷골목의 밤에 거주세가 없으면 즉시 청소부 인카운터 발생
    if (state.timeOfDay === 'NIGHT_SWEEPER' && state.player.housingTaxDaysLeft <= 0) {
      return true;
    }

    // T사 개인 시간 고갈 위기
    if (state.player.currentDistrictId === 20 && (state.player.timeBalanceHours ?? 24) <= 6) {
      return true;
    }

    // 이전 인카운터 발생 후 2~3일(현실 약 4~6초) 경과 시 랜덤 판정
    const daysSince = state.day - lastEncounterDay;
    if (daysSince >= 2) {
      return Math.random() < 0.65;
    }

    return false;
  }

  /**
   * 돌발 인카운터 생성 (API 연동 또는 정밀 폴백)
   */
  static async generateRandomEncounter(state: GameState, apiKey?: string): Promise<ActiveEncounter> {
    const p = state.player;
    const isTCorp = p.currentDistrictId === 20;
    const dist = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[20];

    // 1. 인연 조우 판정 (보유 인연이 3명 미만일 때 우선 기회 제공)
    const discoverableNpc = generateDiscoverableNpc(p.relationships, p.currentDistrictId);
    const triggerHeroine = discoverableNpc && (p.relationships.length === 0 || Math.random() < 0.4);

    if (triggerHeroine) {
      return this.buildHeroineEncounter(discoverableNpc, dist, p);
    }

    // 2. T사 시간세 / 시간 징수관 인카운터
    if (isTCorp && (p.timeBalanceHours ?? 24) <= 18) {
      return this.buildTCorpAuditEncounter(p);
    }

    // 3. 뒷골목의 밤 청소부 조우
    if (state.timeOfDay === 'NIGHT_SWEEPER') {
      return this.buildSweeperEncounter(p);
    }

    // 4. 일반 골목 사건 / 해결사 의뢰 / 특이점 암시장
    const generalEncounter = this.buildGeneralEncounter(p, dist);

    // API Key가 있을 경우 서사 문장 더욱 고도화
    const key = apiKey || AINarrativeDirector.getSavedApiKey();
    if (key.trim()) {
      try {
        const enriched = await this.enrichEncounterWithAI(generalEncounter, p, dist, key);
        if (enriched) return enriched;
      } catch (err) {
        console.warn('Encounter AI enrichment failed, using built-in narrative:', err);
      }
    }

    return generalEncounter;
  }

  /**
   * 인연(히로인/동료) 조우 인카운터 빌더
   */
  private static buildHeroineEncounter(npc: any, dist: any, _p: any): ActiveEncounter {
    const choices: ActionChoice[] = [
      {
        id: `heroine_rescue_${npc.name}`,
        text: `[구출 및 보호] 피 흘리는 ${npc.name}을(를) 폐건물로 숨기고 상처를 치료한다`,
        description: `치료비와 은신을 위해 200안과 정신력 10을 소모하지만, 깊은 신뢰와 인연을 얻습니다.`,
        actionType: 'RECRUIT_RELATIONSHIP',
        dangerLevel: 'MEDIUM',
        costAhn: 200,
        costSp: 10,
        recruitCharacter: {
          ...npc,
          affection: 40,
          dependence: 35,
          type: 'acquaintance',
        },
      },
      {
        id: `heroine_bargain_${npc.name}`,
        text: `[거래 제안] 추적자들의 시선을 돌려주는 대가로 공방 물품과 정보를 요구한다`,
        description: `냉정하게 실리를 챙깁니다. 위험하지만 350안을 챙기고 지인으로 등록됩니다.`,
        actionType: 'RECRUIT_RELATIONSHIP',
        dangerLevel: 'HIGH',
        rewardAhn: 350,
        recruitCharacter: {
          ...npc,
          affection: 20,
          dependence: 20,
          type: 'stranger',
        },
      },
      {
        id: `heroine_ignore_${npc.name}`,
        text: `[외면] 남의 일에 휘말려 목숨을 걸 여유는 없다. 빠른 걸음으로 자리를 뜬다`,
        description: `어떤 자원도 소모하지 않고 조용히 벗어납니다. 인연은 성립되지 않습니다.`,
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
    ];

    return {
      id: `enc_heroine_${npc.id}`,
      category: 'RELATIONSHIP_DISCOVERY',
      title: `골목의 조우: ${npc.name} (${npc.title})`,
      description: `${dist.id}구의 어두운 뒷골목 모퉁이에서 헐떡이는 숨소리가 들려옵니다. 상처를 입은 ${npc.name}이(가) 벽에 기대어 피를 흘리고 있습니다. "${npc.currentCrisis}"`,
      atmosphereQuote: `콘크리트 벽면에 튄 붉은 핏자국과 다급한 추적자들의 군홧소리.`,
      choices,
      discoveredNpc: npc,
    };
  }

  /**
   * T사(Time Track) 시간세 감사 인카운터
   */
  private static buildTCorpAuditEncounter(p: any): ActiveEncounter {
    const choices: ActionChoice[] = [
      {
        id: 'tcorp_audit_pay',
        text: '황동 회중시계를 제시하며 즉시 시간세 450안 납부 (72시간 충전)',
        description: '세무관에게 정규 세금을 납부하고 안전하게 위기를 모면합니다.',
        actionType: 'PAY_TIME_TAX',
        dangerLevel: 'LOW',
        costAhn: 450,
        rewardTimeHours: 72,
      },
      {
        id: 'tcorp_audit_borrow',
        text: '사채업자에게서 얻은 불법 시간 바우처로 시간을 임시 충당한다',
        description: '시간세는 모면하지만 정신력이 15 감소하고 암시장의 빚이 늘어납니다.',
        actionType: 'BORROW_TIME',
        dangerLevel: 'HIGH',
        costSp: 15,
        rewardTimeHours: 48,
      },
      {
        id: 'tcorp_audit_fight',
        text: '징수관의 태엽 지팡이를 무기로 쳐내고 증기 속으로 탈출한다 (합 판정)',
        description: '성공 시 안을 아끼지만, 체력 손상 위험과 불순물 게이지가 증가할 수 있습니다.',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
      },
    ];

    return {
      id: `enc_tcorp_audit_${Date.now()}`,
      category: 'TCORP_AUDIT',
      title: 'T사 제3시간징수관의 불심검문',
      description: `등 뒤에 거대한 괘종시계를 짊어진 T사 정규 징수관이 골목을 막아섰습니다. 째깍거리는 금속 태엽 지팡이를 들어 당신의 얼굴을 비춥니다. "남은 시간 [${p.timeBalanceHours ?? 0}시간]. 시간세 감사 대상자다. 즉시 영수증을 제시하거나 시간을 공출하라."`,
      atmosphereQuote: '증기 배관에서 뿜어 나오는 뜨거운 열기와 째깍거리는 죽음의 카운트다운.',
      choices,
    };
  }

  /**
   * 뒷골목의 밤 청소부 조우 인카운터
   */
  private static buildSweeperEncounter(_p: any): ActiveEncounter {
    const choices: ActionChoice[] = [
      {
        id: 'sweeper_flee',
        text: '어둠을 틈타 폐건물 환기구 깊숙한 곳으로 몸을 숨긴다',
        description: '호흡을 죽이고 숨습니다. SP가 10 감소하지만 전투를 회피합니다.',
        actionType: 'REST',
        dangerLevel: 'HIGH',
        costSp: 10,
      },
      {
        id: 'sweeper_clash',
        text: '다가오는 청소부 첨병의 가위를 무기로 받아친다 (결사항전)',
        description: '합(Clash) 판정에 따라 사지 절단 또는 승리 전리품을 획득합니다.',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
      },
    ];

    return {
      id: `enc_sweeper_${Date.now()}`,
      category: 'NIGHT_SWEEPER_TERROR',
      title: '03:13 뒷골목의 밤: 청소부의 기습',
      description: '푸른 액체로 가득 찬 원통형 탱크를 등에 진 청소부 무리가 골목을 포위했습니다. 쉭쉭거리는 기괴한 마찰음과 함께 거대한 가위 날이 당신의 목덜미를 겨눕니다!',
      atmosphereQuote: '기름과 피비린내가 뒤섞인 악취. 액체 인간들의 무자비한 해체 작업이 시작됩니다.',
      choices,
    };
  }

  /**
   * 일반 거리 인카운터 (의뢰, 암시장, 칼부림)
   */
  private static buildGeneralEncounter(_p: any, dist: any): ActiveEncounter {
    const roll = Math.random();

    if (roll < 0.35) {
      // 해결사 긴급 의뢰
      return {
        id: `enc_contract_${Date.now()}`,
        category: 'FIXER_CONTRACT',
        title: `${dist.id}구 해결사 사무소의 긴급 의뢰`,
        description: `골목 전광판에 피로 얼룩진 수금 및 경호 의뢰서가 게시되었습니다. 날개의 하청 조직이 위험한 작업에 나설 해결사를 긴급 모집하고 있습니다.`,
        atmosphereQuote: '돈 냄새를 맡은 무뢰배들이 무기를 챙기며 모여듭니다.',
        choices: [
          {
            id: 'fixer_contract_accept',
            text: '위험한 현장 토벌 의뢰 수락 (성공 시 500안, HP 소모 위험)',
            actionType: 'WORK',
            dangerLevel: 'HIGH',
            costHp: 15,
            costSp: 8,
            rewardAhn: 500,
          },
          {
            id: 'fixer_contract_scout',
            text: '안전한 공방 부품 운반 작업만 맡는다 (소액 200안)',
            actionType: 'WORK',
            dangerLevel: 'LOW',
            costSp: 5,
            rewardAhn: 200,
          },
          {
            id: 'fixer_contract_decline',
            text: '의뢰를 지나치고 은신처로 돌아가 휴식한다',
            actionType: 'REST',
            dangerLevel: 'LOW',
          },
        ],
      };
    }

    if (roll < 0.7) {
      // 골목 암시장 및 특이점 잔재
      return {
        id: `enc_market_${Date.now()}`,
        category: 'DISTRICT_SINGULARITY',
        title: `${dist.wingName}의 특이점 밀수품 암시장`,
        description: `버려진 지하도에서 암상인들이 푸른빛을 발하는 특이점 부속품과 공방 무기를 거래하고 있습니다.`,
        atmosphereQuote: '음산한 속삭임과 은밀하게 오가는 묵직한 지폐 뭉치.',
        choices: [
          {
            id: 'market_buy_scrap',
            text: '공방 정밀 개조 부품 구매 (300안 소모, 무기 보강)',
            actionType: 'EXPLORE',
            dangerLevel: 'LOW',
            costAhn: 300,
            rewardAhn: 0,
          },
          {
            id: 'market_investigate',
            text: '암시장의 비밀 거래 장부를 훔쳐본다 (위험한 정보 탐색)',
            actionType: 'EXPLORE',
            dangerLevel: 'HIGH',
            costSp: 12,
            rewardAhn: 350,
          },
          {
            id: 'market_leave',
            text: '경비원들의 시선이 닿기 전에 지하도를 빠져나간다',
            actionType: 'REST',
            dangerLevel: 'LOW',
          },
        ],
      };
    }

    // 골목 칼부림 / 폭력배 충돌
    return {
      id: `enc_combat_${Date.now()}`,
      category: 'STREET_COMBAT',
      title: `${dist.id}구 폭력배 무리의 습격`,
      description: `녹슨 쇠파이프와 칼날을 든 뒷골목 무뢰배들이 당신의 지갑과 소지품을 노리고 골목 양쪽을 막아섰습니다!`,
      atmosphereQuote: '거친 욕설과 아스팔트를 긁는 쇳소리.',
      choices: [
        {
          id: 'combat_fight_gang',
          text: '무기를 뽑아 들고 적의 우두머리와 합(Clash)을 겨룬다',
          actionType: 'COMBAT',
          dangerLevel: 'HIGH',
        },
        {
          id: 'combat_pay_off',
          text: '통행료 150안을 던져주고 자리를 피한다',
          actionType: 'REST',
          dangerLevel: 'LOW',
          costAhn: 150,
        },
      ],
    };
  }

  /**
   * Gemini API를 활용하여 상황과 선택지 묘사를 프로젝트 문 문체로 정밀 보완
   */
  private static async enrichEncounterWithAI(
    base: ActiveEncounter,
    player: any,
    district: any,
    apiKey: string
  ): Promise<ActiveEncounter | null> {
    const prompt = `당신은 '프로젝트 문(Project Moon)' 세계관의 서사 디렉터입니다.
다음 상황에 대한 비극적이고 냉혹한 묘사를 다듬어 JSON으로 반환하십시오:
[상황 제목]: ${base.title}
[상황 설명]: ${base.description}
[캐릭터]: ${player.name} (${district.id}구 ${district.wingName} 관할)

반드시 다음 JSON 형식으로만 응답하십시오:
{
  "title": "${base.title}",
  "description": "3~4문장의 하드보일드하고 시적인 프문풍 상황 묘사",
  "atmosphereQuote": "골목의 차가운 풍경 묘사 1문장"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    return {
      ...base,
      title: parsed.title || base.title,
      description: parsed.description || base.description,
      atmosphereQuote: parsed.atmosphereQuote || base.atmosphereQuote,
    };
  }
}
