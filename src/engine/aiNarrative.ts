import type { GameState, ActionChoice, NarrativeLog } from '../types/game';
import { DISTRICTS_DATA } from './districtsData';

export interface AISettings {
  apiKey: string;
  model: string;
}

export class AINarrativeDirector {
  private static STORAGE_KEY = 'pm_sim_gemini_api_key';

  static getSavedApiKey(): string {
    return localStorage.getItem(this.STORAGE_KEY) || '';
  }

  static saveApiKey(key: string): void {
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
}
