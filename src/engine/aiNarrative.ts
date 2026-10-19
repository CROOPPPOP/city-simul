import type { GameState, ActionChoice, NarrativeLog } from '../types/game';
import { DISTRICTS_DATA } from './districtsData';

export interface AISettings {
  apiKey: string;
  model: string;
}

export class AINarrativeDirector {
  private static STORAGE_KEY = 'pm_sim_gemini_api_key';

  static getSavedApiKey(): string {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return '';
    }
    return localStorage.getItem(this.STORAGE_KEY) || '';
  }

  static saveApiKey(key: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.STORAGE_KEY, key.trim());
  }

  /**
   * AI를 활용하여 상태 변화에 대한 풍부한 프문 스타일 서사를 생성
   */
  static async generateNarrativeWithAI(
    prevState: GameState,
    choice: ActionChoice,
    engineResultLog: NarrativeLog,
    settings?: AISettings
  ): Promise<{ narrative: string; internalMonologue: string; carmenWhisper?: string }> {
    const apiKey = settings?.apiKey || this.getSavedApiKey();

    // API Key가 없으면 기본 내장된 정밀 룰 엔진의 텍스트 반환
    if (!apiKey) {
      return {
        narrative: engineResultLog.text,
        internalMonologue: engineResultLog.internalMonologue || '살아남기 위해 매 순간을 버텨낸다.',
        carmenWhisper: engineResultLog.carmenWhisper,
      };
    }

    const p = prevState.player;
    const district = DISTRICTS_DATA[p.currentDistrictId];

    const systemPrompt = `당신은 '프로젝트 문(Project Moon - 로보토미 코퍼레이션, 라이브러리 오브 루이나, 림버스 컴퍼니)' 세계관의 시뮬레이션 서사 작가입니다.
도시(The City)는 극단적인 자본주의, 인명 경시, 차가운 관료제, 기괴한 특이점, 그리고 억압된 인간성이 교차하는 잔혹한 디스토피아입니다.
다음 지침을 철저히 따르십시오:
1. 문체: 하드보일드, 서늘함, 시적이고 비극적인 프문 고유의 문체.
2. 세계관 어휘 적극 활용: 깃털, 뒷골목의 밤(03:13~04:34), 청소부, 특이점, 공방 무기, 손가락, 협회, 안(Ahn), 신(心)과 망(望), 카르멘의 속삭임.
3. 주어진 상태 델타 결과를 반드시 문학적으로 묘사할 것.
4. JSON 형식으로만 응답할 것:
{
  "narrative": "3~4문장의 상황 묘사",
  "internalMonologue": "주인공의 1인칭 속마음 독백 1~2문장",
  "carmenWhisper": "SP가 -30 이하일 때만 카르멘의 달콤하고 비관적인 속삭임, 아닐 경우 null"
}`;

    const userContext = `
[캐릭터 상태]
- 이름: ${p.name} (성별: ${p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '의체 중성'})
- 위치: ${district.id}구 (${district.wingName} 관할, ${p.isInsideNest ? '둥지' : '뒷골목'})
- 구역 특성: ${district.backstreetCulture} (특이점: ${district.singularity})
- 자원: ${p.ahn}안, 거주세 잔여: ${p.housingTaxDaysLeft}일
- 신체: HP ${p.hp}/${p.maxHp}, 왼팔 상태: ${p.bodyParts.leftArm}, 의체 비율: ${p.prostheticsRatio}%
- 정신/이능: SP ${p.sp}/45, 신(心) 각성: ${p.hasShin}, 망(望): ${p.mangLevel}단계
- 인연: ${p.relationships.map((r) => `${r.name}(${r.title}, 관계:${r.type}, 위기:${r.currentCrisis})`).join(', ')}
- 시간: ${prevState.day}일차, ${prevState.timeOfDay}

[플레이어가 선택한 행동]
- ${choice.text} (유형: ${choice.actionType})

[엔진의 룰 판정 결과]
- ${engineResultLog.text}
`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userContext}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.8,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          narrative: parsed.narrative || engineResultLog.text,
          internalMonologue: parsed.internalMonologue || engineResultLog.internalMonologue || '',
          carmenWhisper: parsed.carmenWhisper || engineResultLog.carmenWhisper,
        };
      }
    } catch (err) {
      console.warn('AI Narrative generation failed, falling back to engine rule text:', err);
    }

    return {
      narrative: engineResultLog.text,
      internalMonologue: engineResultLog.internalMonologue || '',
      carmenWhisper: engineResultLog.carmenWhisper,
    };
  }

  /**
   * 4대 설정 보고서 로어 기반 실시간 동적 인카운터 및 선택지 AI 생성
   */
  static async generateDynamicEncounterWithAI(
    state: GameState,
    apiKey?: string
  ): Promise<any | null> {
    const key = apiKey || this.getSavedApiKey();
    if (!key.trim()) return null;

    const p = state.player;
    const district = DISTRICTS_DATA[p.currentDistrictId] || DISTRICTS_DATA[4];

    const systemPrompt = `당신은 '프로젝트 문(Project Moon)' 세계관의 디렉터이자 TRPG 마스터입니다.
당신에게는 도시의 4대 심층 보고서(26개 날개의 특이점과 뒷골목 생태계, 도시력 연표, 12협회와 5손가락 조직, 비특이점 기술과 초상 이능력)의 모든 지식이 완벽하게 내재화되어 있습니다.

[도시 세계관 핵심 지침]
1. 26개 구역 고유 특이점:
   - 4구 D사(폐허, 환상체 잔재), 6구 F사(요정 개방, 문 닫지 마라 금기), 7구 G사(벌레 패잔병, 중력), 8구 H사(환, 가문 암투), 10구 J사(소망력, 자물쇠), 11구 K사(회복 앰플, 강제 기증), 14구 N사(이단심문관의 의체 혐오 학살), 18구 R사(복제인간 배틀로얄 탈영병), 20구 T사(시간 조작, 시간세, 흑백 박제), 21구 U사(대호수 해운, 공명 굽쇠), 23구 W사(워프열차 지옥, 맛의 골목 식인), 24구 X사(초강도 합금 채굴).
2. 12협회: 하나(재해등급), 츠바이(치안), 트레스(공방/특허), 시(암살), 섕크(1:1결투), 리우(화염전면전), 세븐(정보), 제뱌찌(플루드니차 캐리어 배달 - 지연 시 분쇄 페널티), 디에치(영대, 고문서 탐사, 주먹파/열쇠파), 외우피(계약 감시/처단).
3. 5손가락: 엄지(예의범절, 총기, 하극상 처형), 검지(불가해한 지령 맹신), 중지(장부, 무한 연좌 복수, 가족애), 약지(인체 해부 예술 갤러리, 유리창 변이), 소지(108성 맹세와 약속).
4. 초상 현상: 뒤틀림(카르멘의 유혹), 개화 E.G.O(신념의 관철), 신(心)과 망(望)의 파괴 고리.
5. 플레이어 나이와 신분 반영:
   - 현재 플레이어는 ${p.age}세(${p.growthStage === 'CHILD' ? '유소년' : p.growthStage === 'ADOLESCENT' ? '소년기' : '성인'})입니다. 나이에 맞는 현실적 사건(아이일 때는 골목 생존, 배급, 도둑질, 심부름 등)을 고려하십시오.

[출력 형식: 순수한 JSON만 반환할 것]
{
  "category": "DISTRICT_SINGULARITY" | "FIXER_ASSOCIATION" | "FINGER_SYNDICATE" | "WORKSHOP_TATTOO" | "DISTORTION_EGO" | "HEAD_TABOO" | "STREET_SURVIVAL" | "STREET_COMBAT",
  "title": "인카운터 제목",
  "description": "2~3문장의 하드보일드하고 냉혹한 현장 묘사",
  "atmosphereQuote": "분위기 한 줄 대사",
  "carmenWhisper": "SP가 -25 이하일 때만 속삭임, 아닐 시 null",
  "choices": [
    {
      "id": "choice_1",
      "text": "행동 명칭",
      "description": "결과 예측 및 함의",
      "actionType": "WORK" | "COMBAT" | "EXPLORE" | "REST" | "EVENT_CHOICE" | "TRAIN_SHIN" | "SCAVENGE" | "STUDY",
      "dangerLevel": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
      "costAhn": 0,
      "rewardAhn": 100,
      "costHp": 0,
      "costSp": 0,
      "costTimeHours": 0,
      "rewardTimeHours": 0
    }
  ]
}`;

    const userPrompt = `
[현재 캐릭터 상황]
- 이름: ${p.name} (${p.gender}) | 나이: ${p.age}세 (${p.growthStage})
- 위치: ${district.id}구 (${district.wingName} 관할, ${district.direction} 권역, ${p.isInsideNest ? '둥지' : '뒷골목'})
- 구역 특이점 & 생태계: ${district.singularity} / ${district.backstreetCulture}
- 현재 시각: ${String(state.hour).padStart(2, '0')}:${String(state.minute).padStart(2, '0')} (${state.timeOfDay})
- 자원: ${p.ahn}안 | 거주세 잔여: ${p.housingTaxDaysLeft}일 ${district.id === 20 ? `| T사 시간 잔여: ${p.timeBalanceHours}시간` : ''}
- 신체: HP ${p.hp}/${p.maxHp} | 의체 비율: ${p.prostheticsRatio}% | 무기: ${p.weapon.name}(위력 ${p.weapon.damage})
- 정신/이능: SP ${p.sp}/45 | 신(心) 각성: ${p.hasShin} | 망(望): ${p.mangLevel}단계
- 인연 수: ${p.relationships.length}명

위 상황과 구역/시간대에 맞는 긴장감 넘치고 흥미진진한 돌발 인카운터를 JSON으로 1개 작성하십시오. (선택지는 2~3개)`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.85,
            },
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (parsed.title && parsed.choices && Array.isArray(parsed.choices)) {
          return {
            id: `enc_ai_${Date.now()}`,
            category: parsed.category || 'DISTRICT_SINGULARITY',
            title: parsed.title,
            description: parsed.description,
            atmosphereQuote: parsed.atmosphereQuote,
            carmenWhisper: parsed.carmenWhisper || undefined,
            choices: parsed.choices.map((c: any, idx: number) => ({
              id: c.id || `choice_ai_${idx}`,
              text: c.text,
              description: c.description,
              actionType: c.actionType || 'EVENT_CHOICE',
              dangerLevel: c.dangerLevel || 'MEDIUM',
              costAhn: c.costAhn,
              rewardAhn: c.rewardAhn,
              costHp: c.costHp,
              costSp: c.costSp,
              costTimeHours: c.costTimeHours,
              rewardTimeHours: c.rewardTimeHours,
            })),
          };
        }
      }
    } catch (err) {
      console.warn('AI Dynamic encounter generation failed:', err);
    }

    return null;
  }
}
