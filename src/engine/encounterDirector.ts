import type { GameState, ActiveEncounter, ActionChoice } from '../types/game';
import { DISTRICTS_DATA } from './districtsData';
import { generateDiscoverableNpc } from './relationshipsData';
import { AINarrativeDirector } from './aiNarrative';
import { LORE_ENCOUNTERS_POOL, type LoreEncounterTemplate } from './encountersData';
import { TimeKeeper } from './timeKeeper';

export class EncounterDirector {
  /**
   * 정밀 시/분 연동 일상 서사 문장 생성
   */
  static generateAmbientLog(state: GameState): { text: string; monologue?: string } {
    const p = state.player;
    const dist = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[4];
    const isTCorp = p.currentDistrictId === 20;
    const timeStr = TimeKeeper.formatTime(state.hour, state.minute);

    if (state.timeOfDay === 'NIGHT_SWEEPER') {
      return {
        text: `${timeStr} [⚠ 뒷골목의 밤] 도시의 모든 전등이 소등되었습니다. 창밖에서 액체 인간 청소부들의 갈고리와 가위 소리가 쩔렁입니다.`,
        monologue: '숨소리조차 내서는 안 된다. 벽 너머에 그것들이 있다.',
      };
    }

    if (state.timeOfDay === 'MIDNIGHT') {
      return {
        text: `${timeStr} [심야] ${dist.id}구 뒷골목이 쥐 죽은 듯 가라앉습니다. 부랑자들이 거주세 방벽 안으로 몸을 욱여넣습니다.`,
        monologue: '곧 03시 13분... 청소부들의 시간이 다가온다.',
      };
    }

    if (state.timeOfDay === 'DAWN') {
      return {
        text: `${timeStr} [새벽] 핏빛으로 물든 뒷골목 위로 차가운 안개가 걷힙니다. 청소부들이 쓸고 간 자리에 남은 핏자국이 희미하게 증발합니다.`,
        monologue: '어젯밤도 무사히 살아남았다.',
      };
    }

    if (state.timeOfDay === 'MORNING') {
      if (isTCorp) {
        return {
          text: `${timeStr} [오전] 20구 거대한 황동 시계탑에서 증기 호루라기가 울립니다. 개인 보유 시간: ${p.timeBalanceHours ?? 0}h.`,
          monologue: '째깍거리는 톱니바퀴 소리. 내 목숨이 1시간씩 깎여나간다.',
        };
      }
      return {
        text: `${timeStr} [오전] ${dist.id}구 (${dist.wingName} 관할) 골목에 합성 단백질 노점들이 문을 열며 소음이 번집니다.`,
        monologue: p.age <= 12 ? '배가 고프다... 쓰레기통이라도 뒤져봐야 하나.' : '오늘도 일거리를 찾아야 한다.',
      };
    }

    if (state.timeOfDay === 'AFTERNOON') {
      return {
        text: `${timeStr} [오후] ${dist.direction} 권역의 차가운 빌딩 그늘이 골목길을 덮습니다. 어디선가 해결사들의 칼부림 소리가 들려옵니다.`,
        monologue: '총성은 없다. 오직 살점이 찢기는 소리뿐.',
      };
    }

    // EVENING
    return {
      text: `${timeStr} [저녁] 붉은 네온사인이 깨진 보도블록마다 반사됩니다. 거주세 잔여: ${p.housingTaxDaysLeft}일.`,
      monologue: '밤이 오기 전에 안전한 은신처로 돌아가야 한다.',
    };
  }

  /**
   * 인카운터 발생 조건 판정 (1분 = 1시간 스케일)
   * @param totalHoursPassed 시작 시점부터 총 누적 인게임 시간
   * @param lastEncounterTotalHour 마지막 인카운터 발생 누적 시간
   */
  static shouldTriggerEncounter(
    state: GameState,
    totalHoursPassed: number,
    lastEncounterTotalHour: number
  ): boolean {
    if (state.activeEncounter !== null || state.pendingSituation !== null || state.isGameOver) {
      return false;
    }

    // 1. 뒷골목의 밤(03:13)에 거주세가 없으면 즉시 청소부 습격 발동!
    if (state.timeOfDay === 'NIGHT_SWEEPER' && state.player.housingTaxDaysLeft <= 0) {
      return true;
    }

    // 2. T사 시간 고갈 위기 (4시간 이하)
    if (state.player.currentDistrictId === 20 && (state.player.timeBalanceHours ?? 24) <= 4) {
      return true;
    }

    // 3. 이전 인카운터 발생 후 인게임 3~6시간(현실 3~6분) 경과 시 랜덤 판정
    const hoursSince = totalHoursPassed - lastEncounterTotalHour;
    if (hoursSince >= 3) {
      const chance = hoursSince >= 6 ? 0.8 : 0.45;
      return Math.random() < chance;
    }

    return false;
  }

  /**
   * 4대 보고서 기반 동적 인카운터 생성 (AI 우선 호출 + 방대한 로컬 풀)
   */
  static async generateRandomEncounter(state: GameState, apiKey?: string): Promise<ActiveEncounter> {
    const p = state.player;
    const dist = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[4];

    // 1. 뒷골목의 밤 특수 처리 (03:13 ~ 04:34)
    if (state.timeOfDay === 'NIGHT_SWEEPER') {
      const sweeperTemplate = LORE_ENCOUNTERS_POOL.find((e) => e.id === 'night_sweeper_ambush');
      if (sweeperTemplate) {
        return this.templateToEncounter(sweeperTemplate);
      }
    }

    // 2. T사 시간세 위기 특수 처리
    if (p.currentDistrictId === 20 && (p.timeBalanceHours ?? 24) <= 8) {
      const tcorpTemplate = LORE_ENCOUNTERS_POOL.find((e) => e.id === 'tcorp_tax_collector');
      if (tcorpTemplate) {
        return this.templateToEncounter(tcorpTemplate);
      }
    }

    // 3. 인연(히로인/동료) 조우 기회 (약 18% 확률)
    const discoverableNpc = generateDiscoverableNpc(p.relationships, p.currentDistrictId);
    if (discoverableNpc && Math.random() < 0.18) {
      return this.buildHeroineEncounter(discoverableNpc, dist, p);
    }

    // 4. Gemini AI를 통한 실시간 동적 인카운터 생성 시도
    const key = apiKey || AINarrativeDirector.getSavedApiKey();
    if (key.trim()) {
      try {
        const aiEncounter = await AINarrativeDirector.generateDynamicEncounterWithAI(state, key);
        if (aiEncounter) {
          return aiEncounter;
        }
      } catch (err) {
        console.warn('AI Dynamic encounter generation failed, using lore template:', err);
      }
    }

    // 5. 오프라인 / Fallback: 4대 설정 보고서 로컬 인카운터 풀에서 필터링
    return this.pickFallbackLoreEncounter(state);
  }

  /**
   * 조건에 부합하는 로컬 인카운터 템플릿 선별
   */
  private static pickFallbackLoreEncounter(state: GameState): ActiveEncounter {
    const p = state.player;

    const matched = LORE_ENCOUNTERS_POOL.filter((tpl) => {
      if (!tpl.condition) return true;
      const c = tpl.condition;

      if (c.minAge !== undefined && p.age < c.minAge) return false;
      if (c.maxAge !== undefined && p.age > c.maxAge) return false;
      if (c.districtIds && !c.districtIds.includes(p.currentDistrictId)) return false;
      if (c.timeOfDays && !c.timeOfDays.includes(state.timeOfDay)) return false;
      if (c.requiresShin && !p.hasShin) return false;

      return true;
    });

    const pool = matched.length > 0 ? matched : LORE_ENCOUNTERS_POOL;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    return this.templateToEncounter(chosen);
  }

  private static templateToEncounter(template: LoreEncounterTemplate): ActiveEncounter {
    return {
      id: `${template.id}_${Date.now()}`,
      category: template.category,
      title: template.title,
      description: template.description,
      atmosphereQuote: template.atmosphereQuote,
      carmenWhisper: template.carmenWhisper,
      choices: template.choices,
    };
  }

  /**
   * 인연 조우 빌더
   */
  private static buildHeroineEncounter(npc: any, dist: any, p: any): ActiveEncounter {
    const isChild = p.age <= 12;

    const choices: ActionChoice[] = [
      {
        id: `heroine_rescue_${npc.name}`,
        text: isChild
          ? `[작은 손길] 떨고 있는 ${npc.name}에게 챙겨둔 빵 조각을 건네며 비밀 은신처로 안내한다`
          : `[구출 및 은신] 상처 입은 ${npc.name}을(를) 업고 추적자들을 따돌린다`,
        description: `진심 어린 온기로 깊은 신뢰와 인연을 맺습니다. (인연 등록)`,
        actionType: 'RECRUIT_RELATIONSHIP',
        dangerLevel: 'MEDIUM',
        costSp: 10,
        recruitCharacter: {
          ...npc,
          affection: 45,
          dependence: 40,
          type: 'acquaintance',
        },
      },
      {
        id: `heroine_ignore_${npc.name}`,
        text: `[외면] 남을 돌볼 여유는 없다. 빠른 걸음으로 자리를 뜬다`,
        description: `자원을 아끼고 위험을 회피합니다.`,
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
    ];

    return {
      id: `enc_heroine_${npc.id}`,
      category: 'RELATIONSHIP_DISCOVERY',
      title: `골목의 조우: ${npc.name} (${npc.title})`,
      description: `${dist.id}구의 어두운 뒷골목 모퉁이에서 피를 흘리며 주저앉아 있는 ${npc.name}을(를) 마주쳤습니다. "${npc.currentCrisis}"`,
      atmosphereQuote: `콘크리트 바닥에 튄 붉은 혈흔과 다급한 추적자들의 발소리.`,
      choices,
      discoveredNpc: npc,
    };
  }
}
