import type {
  GameState,
  PlayerCharacter,
  ActionChoice,
  NarrativeLog,
  TimeOfDay,
  Gender,
  BodyParts,
} from '../types/game';
import { DISTRICTS_DATA } from './districtsData';
import { generateInitialRelationship } from './relationshipsData';

export class CoreEngine {
  /**
   * 새로운 캐릭터 및 초기 게임 상태 생성
   */
  static createCharacter(name: string, gender: Gender): GameState {
    // 26개 구 중 랜덤 선택 (1, 2, 3구 머리 직할구는 출생 확률이 낮음)
    const validDistricts = [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const birthDistrictId = validDistricts[Math.floor(Math.random() * validDistricts.length)];

    // 15% 확률로 둥지 출생, 85% 확률로 뒷골목 출생
    const isNestBorn = Math.random() < 0.15;

    const initialBodyParts: BodyParts = {
      head: 'healthy',
      torso: 'healthy',
      leftArm: 'healthy',
      rightArm: 'healthy',
      leftLeg: 'healthy',
      rightLeg: 'healthy',
    };

    const initialRelationship = generateInitialRelationship(gender, birthDistrictId);

    const player: PlayerCharacter = {
      name: name.trim() || (gender === 'female' ? '엘레나' : '칼리온'),
      gender,
      age: 20,
      birthDistrictId,
      isNestBorn,
      currentDistrictId: birthDistrictId,
      isInsideNest: isNestBorn,
      ahn: isNestBorn ? 1800 : 450,
      housingTaxDaysLeft: isNestBorn ? 25 : 3, // 뒷골목은 3일 남음 (거주세 압박)
      timeBalanceHours: birthDistrictId === 20 ? 16 : undefined,
      hp: 100,
      maxHp: 100,
      bodyParts: initialBodyParts,
      prostheticsRatio: 0,
      tattoo: {
        grade: 'NONE',
        name: '미시술',
        effectDescription: '시술된 문신 없음',
        sideEffectPenalty: 0,
      },
      weapon: isNestBorn
        ? {
            name: '츠바이식 수련용 세검',
            workshop: '정규 공방 보급품',
            damage: 14,
            description: '날이 잘 다듬어진 표준 규격 검.',
          }
        : {
            name: '날이 이빠진 정육도',
            workshop: '뒷골목 자작 무기',
            damage: 8,
            description: '녹슬고 거칠게 갈아낸 조잡한 칼날.',
          },
      sp: 0,
      hasShin: false,
      shinActive: false,
      mangLevel: 0,
      egoProgress: 0,
      distortionProgress: 0,
      path: isNestBorn ? 'WING_FEATHER' : 'FIXER',
      fixerGrade: isNestBorn ? undefined : 9,
      relationships: [initialRelationship],
      taboo: {
        ai_violation: 0,
        clone_7days: 0,
        dwelling_invasion: 0,
        firearm_tax_evasion: 0,
        impurityLevel: 0,
      },
    };

    const district = DISTRICTS_DATA[birthDistrictId];
    const initialLogText = isNestBorn
      ? `당신은 ${district.wingName} 관할 둥지에서 비교적 온실 같은 어린 시절을 보냈습니다. 그러나 날개의 특이점을 유지하기 위해 이면에 도사린 끔찍한 생체 실험과 매달 징수되는 살인적인 세금의 공포는 둥지의 깃털들에게도 예외가 아닙니다. 이제 당신은 스스로의 발로 도시의 잔혹한 생태계에 첫발을 디뎠습니다.`
      : `당신은 ${district.wingName} 관할 ${district.id}구 뒷골목의 차가운 흙바닥에서 태어났습니다. 사방에서 울려 퍼지는 비명과 폭력, 매일 밤 3시 13분에 시작되는 청소부들의 살육을 피해 살아남는 것만이 유일한 법이었습니다. 당신에게 남은 것은 손에 쥔 무기 한 자루와, 고작 3일 치밖에 남지 않은 거주세뿐입니다.`;

    const initialLog: NarrativeLog = {
      id: `log_init_${Date.now()}`,
      day: 1,
      timeOfDay: 'MORNING',
      districtId: birthDistrictId,
      text: initialLogText,
      internalMonologue: `살아남아야 한다. 이 빌어먹을 도시에서 내장을 쏟아내지 않으려면...`,
      eventTag: isNestBorn ? '둥지의 깃털' : '뒷골목의 탄생',
    };

    const initialChoices = CoreEngine.generateChoices(player, 'MORNING', 1);

    return {
      year: 984,
      day: 1,
      timeOfDay: 'MORNING',
      player,
      logs: [initialLog],
      currentChoices: initialChoices,
      isGameOver: false,
    };
  }

  /**
   * 플레이어의 행동 선택 실행 및 상태 전이
   */
  static executeAction(state: GameState, choice: ActionChoice): GameState {
    if (state.isGameOver) return state;

    const p = { ...state.player };
    let newDay = state.day;
    let newTime = state.timeOfDay;
    let narrative = '';
    let monologue = '';
    let carmenWhisper: string | undefined = undefined;
    let eventTag = '';
    let isGameOver = false;
    let gameOverReason = '';

    const district = DISTRICTS_DATA[p.currentDistrictId];

    // 신(心) 토글 적용 상태 계산
    const shinBonus = p.shinActive ? 6 : 0;
    if (p.shinActive) {
      p.sp = Math.max(-45, p.sp - 4); // 신 유지 시 SP 소모
    }

    // 1. 행동 타입별 룰 판정
    switch (choice.actionType) {
      case 'WORK': {
        const gradeBonus = typeof p.fixerGrade === 'number' ? (10 - p.fixerGrade) * 2 : p.fixerGrade === 'COLOR' ? 24 : 2;
        const roll = Math.floor(Math.random() * 20) + 1 + gradeBonus;
        const earnedAhn = 280 + roll * 15;
        p.ahn += earnedAhn;
        p.sp = Math.max(-45, p.sp - 6);

        narrative = `의뢰를 완수하여 ${earnedAhn}안을 벌어들였습니다. 피와 땀으로 얼룩진 지폐를 세며, 도시의 톱니바퀴로서 하루를 소모했습니다.`;
        monologue = `손끝에 묻은 피는 닦으면 그만이다. 중요한 건 오늘치 안(Ahn)을 손에 넣었다는 것.`;
        eventTag = '생존을 위한 노동';
        break;
      }

      case 'REST': {
        p.hp = Math.min(p.maxHp, p.hp + 30);
        p.sp = Math.min(45, p.sp + 20);
        narrative = `합법 거주구역의 허름한 방에서 잠시 눈을 붙였습니다. 삐걱거리는 침대 위에서 부서질 듯한 육체와 정신이 다소 안정을 되찾았습니다.`;
        monologue = `벽 밖에서 들리는 신음 소리를 애써 무시하며 눈을 감았다.`;
        eventTag = '위태로운 휴식';
        break;
      }

      case 'PAY_TAX': {
        if (p.ahn >= 500) {
          p.ahn -= 500;
          p.housingTaxDaysLeft += 7;
          narrative = `500안을 지불하여 7일간의 합법 거주권을 연장했습니다. 관할 구역 관리국에서 인쇄된 푸른색 거주 확인증이 벽에 부착됩니다.`;
          monologue = `적어도 앞으로 일주일 동안은 '뒷골목의 밤'에 청소부들에게 문이 뜯겨나갈 걱정은 없다.`;
          eventTag = '거주세 납부';
        } else {
          narrative = `거주세를 낼 돈이 부족합니다! 500안이 필요하지만 가진 것은 ${p.ahn}안뿐입니다.`;
          monologue = `젠장, 돈이 부족해... 이대로 거주세가 만료되면 끝장이다.`;
          eventTag = '세금 체납 위기';
        }
        break;
      }

      case 'EXPLORE': {
        const exploreRoll = Math.floor(Math.random() * 100);
        if (exploreRoll < 40) {
          // 공방 부품/자원 획득
          const foundAhn = Math.floor(Math.random() * 250) + 100;
          p.ahn += foundAhn;
          narrative = `${district.id}구 뒷골목의 쓰레기 더미 사이에서 버려진 지갑과 공방 부품을 건졌습니다. (+${foundAhn}안)`;
          monologue = `죽은 자는 돈이 필요 없다. 살아남은 자만이 챙길 뿐.`;
          eventTag = '폐허 수색';
        } else if (exploreRoll < 75) {
          // 폭력배 조우 소규모 교전
          const damage = Math.max(5, 20 - (p.hasShin ? 10 : 0));
          p.hp = Math.max(0, p.hp - damage);
          p.sp = Math.max(-45, p.sp - 10);
          narrative = `골목길에서 흉기를 든 폭력배들과 마주쳐 격투를 벌였습니다! 적을 쓰러뜨렸지만 ${damage}의 상처를 입었습니다.`;
          monologue = `숨 쉴 틈도 없이 칼이 날아든다. 이게 도시의 일상이다.`;
          eventTag = '골목 칼부림';
        } else {
          // 이색적인 로어 이벤트
          p.sp = Math.max(-45, p.sp - 15);
          narrative = `${district.wingName}의 특이점 잔재가 골목 구석에서 기괴하게 박동하는 광경을 목격했습니다. 설명할 수 없는 혐오감에 머리가 쪼개질 듯 아파옵니다.`;
          monologue = `저런 끔찍한 것을 바탕으로 날개는 번영을 누리고 있던 것인가.`;
          eventTag = '특이점의 잔재 목격';
        }
        break;
      }

      case 'COMBAT': {
        // 합(Clash) 판정
        const playerRoll = Math.floor(Math.random() * 10) + p.weapon.damage + shinBonus + p.mangLevel * 4;
        const enemyRoll = Math.floor(Math.random() * 15) + 12;

        if (playerRoll >= enemyRoll) {
          const reward = 400 + p.mangLevel * 100;
          p.ahn += reward;
          p.sp = Math.min(45, p.sp + 10);
          p.egoProgress = Math.min(100, p.egoProgress + 8);
          narrative = `[합(Clash) 승리!] 적의 무기를 쳐내고 심장부에 치명적인 일격을 꽂아 넣었습니다! 적은 피를 뿜으며 쓰러졌고 전리품(${reward}안)을 획득했습니다.`;
          monologue = `칼날이 뼈를 가르는 감각. 오늘도 살아남았다.`;
          eventTag = '합(Clash) 승리';
        } else {
          const damage = Math.max(10, 35 - (p.hasShin ? 12 : 0));
          p.hp = Math.max(0, p.hp - damage);
          p.sp = Math.max(-45, p.sp - 20);

          // 사지 손상 확률
          if (p.hp < 40 && p.bodyParts.leftArm === 'healthy' && Math.random() < 0.4) {
            p.bodyParts.leftArm = 'severed';
            narrative = `[합 패배 & 중상!] 적의 무자비한 궤적에 왼팔이 절단되었습니다! 극심한 출혈과 쇼크로 비명을 질렀습니다.`;
            monologue = `내 팔이... 바닥에 떨어져 있다... 빌어먹을, 의체 시술을 받지 않으면 칼도 쥘 수 없어!`;
            eventTag = '사지 절단';
          } else {
            narrative = `[합 패배!] 적의 맹렬한 연타를 방어해내지 못하고 ${damage}의 피해를 입고 튕겨져 나갔습니다.`;
            monologue = `뼈가 울린다... 조금만 빗맞았어도 목이 날아갈 뻔했다.`;
            eventTag = '합(Clash) 패배';
          }
        }
        break;
      }

      case 'TRAIN_SHIN': {
        // 신(心) 습득 도전 or 단련
        if (!p.hasShin) {
          // 습득 조건 판정
          const canAwaken = p.sp <= -15 || Math.random() < 0.35;
          if (canAwaken) {
            p.hasShin = true;
            p.shinActive = true;
            p.sp = Math.max(-10, p.sp + 15);
            narrative = `[신(心) 각성!] 극도의 공포와 죄책감 속에서 자신의 내면을 직면하는 순간, 달빛 같은 은은한 온기가 전신으로 퍼져나갔습니다! 정신의 오라로 신체를 감싸는 비인공적 기예, '신(心)'을 깨달았습니다!`;
            monologue = `이 감각은... 기계도, 약물도 아니다. 내 영혼 자체가 타오르고 있어.`;
            eventTag = '★ 신(心)의 개화';
          } else {
            p.sp = Math.max(-45, p.sp - 12);
            narrative = `마음의 심연을 들여다보려 했으나, 뿜어져 나오는 불안과 잡념에 짓눌려 호흡이 가빠졌습니다. 아직 자신의 죄를 온전히 마주하지 못했습니다.`;
            monologue = `아직 부족하다. 마음이 공포에 흔들리고 있어...`;
            eventTag = '수련 실패';
          }
        } else {
          // 이미 신을 습득한 상태: 망(望)의 축적 기회 탐색
          p.sp = Math.min(45, p.sp + 10);
          narrative = `신(心)의 호흡을 정렬하며 내면의 오라를 안정시켰습니다. 극한의 상황에서 타오를 감정의 불꽃을 조용히 다듬습니다.`;
          monologue = `차분하게 흐른다. 이 감정을 더 강하게 벼려야 한다.`;
          eventTag = '신의 정렬';
        }
        break;
      }

      case 'ROMANCE': {
        // 인연과의 교류 및 위기 구출
        if (p.relationships.length > 0) {
          const npc = p.relationships[0];
          npc.affection = Math.min(100, npc.affection + 15);
          npc.dependence = Math.min(100, npc.dependence + 12);
          p.sp = Math.min(45, p.sp + 15);

          if (npc.affection >= 70 && npc.type !== 'lover') {
            npc.type = 'lover';
            narrative = `${npc.name}(와)과 피비린내 나는 골목 한구석에서 서로의 상처를 감싸주며 깊은 맹세를 나누었습니다. '이 지옥 같은 도시에서, 오직 너만을 위해 살아가겠다.' 당신들은 연인(Lover)이 되었습니다.`;
            monologue = `나에게도 지키고 싶은 사람이 생겼다. 그 사실 하나가 심장을 다시 뛰게 만든다.`;
            eventTag = '♥ 맹세와 연인';

            // 연인을 지키겠다는 갈망으로 1망(望) 각성 가능
            if (p.hasShin && p.mangLevel === 0) {
              p.mangLevel = 1;
              narrative += ` [1망(望) 개화!] 사랑과 지키고자 하는 갈망(渇望)이 노란 고리가 되어 오른팔에 응축됩니다!`;
            }
          } else {
            narrative = `${npc.name}(을)를 만나 따뜻한 합성 빵을 나누고 위기("${npc.currentCrisis}")에 대해 논의했습니다. 서로의 눈을 바라보며 잠시 도시의 냉혹함을 잊습니다.`;
            monologue = `이 차가운 콘크리트 바닥에서 유일하게 온기를 느끼는 순간이다.`;
            eventTag = '인연과의 교류';
          }
        }
        break;
      }

      case 'CUSTOM': {
        narrative = choice.customPrompt || `선택한 행동을 신중하게 실행에 옮겼습니다.`;
        monologue = `어떤 결과가 돌아오든, 선택은 내가 내렸다.`;
        eventTag = '독자적 결단';
        break;
      }
    }

    // 2. 카르멘의 속삭임 (SP가 -30 이하로 폭락했을 때)
    if (p.sp <= -30) {
      p.distortionProgress = Math.min(100, p.distortionProgress + 15);
      carmenWhisper = `"...참으로 가련하구나. 왜 이 잔혹한 도시의 도덕과 규율에 얽매여 고통받고 있니? 네 안의 가장 순수한 욕망만을 남기고 모든 것을 내려놓으렴. 너 자신이 되는 거야..."`;
      if (p.distortionProgress >= 100) {
        isGameOver = true;
        gameOverReason = '카르멘의 속삭임에 자아를 헌납하고 이형의 괴물, "뒤틀림(Distortion)"으로 변이하였습니다.';
      }
    }

    // 3. 체력 0 판정
    if (p.hp <= 0) {
      isGameOver = true;
      gameOverReason = '치명적인 외상으로 인해 뒷골목의 차가운 바닥에서 사망하였습니다.';
    }

    // 4. 시간 전이 (MORNING -> AFTERNOON -> EVENING -> NIGHT_SWEEPER -> MORNING)
    const timeOrder: TimeOfDay[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT_SWEEPER'];
    const currentIndex = timeOrder.indexOf(state.timeOfDay);
    if (currentIndex < 3) {
      newTime = timeOrder[currentIndex + 1];
    } else {
      newTime = 'MORNING';
      newDay += 1;

      // 자정 전환 처리: 식비 차감 및 거주세 1일 감소
      p.housingTaxDaysLeft -= 1;
      if (p.ahn >= 40) {
        p.ahn -= 40;
      } else {
        p.hp = Math.max(0, p.hp - 10);
        p.sp = Math.max(-45, p.sp - 10);
      }
    }

    // 5. 뒷골목의 밤 (03:13 ~ 04:34) 특별 위험 판정
    if (newTime === 'NIGHT_SWEEPER') {
      if (p.isInsideNest) {
        narrative += `\n[둥지의 심야] 둥지의 거대한 방벽 너머에서 뒷골목의 밤이 시작되었습니다. 창문 밖으로 붉은 경보등이 회전하지만, 둥지 내부는 고요합니다.`;
      } else {
        if (p.housingTaxDaysLeft <= 0) {
          // 거주세 미납으로 노출됨! 청소부 습격
          const escapeRoll = Math.floor(Math.random() * 20) + (p.hasShin ? 5 : 0);
          if (escapeRoll >= 12) {
            p.hp = Math.max(10, p.hp - 35);
            p.sp = Math.max(-45, p.sp - 25);
            narrative += `\n[03:13 뒷골목의 밤 - 청소부 조우!] 거주세 체납으로 문이 잠긴 피난처 밖에서 청소부 무리에게 발각되었습니다! 액체 인간들의 갈고리를 피해 필사적으로 도주하여 간신히 쓰레기통 속에 숨었습니다.`;
            monologue = `쉭쉭거리는 가위 소리와 기름 냄새... 죽을 뻔했다...`;
            eventTag = '청소부의 밤 생환';
          } else {
            isGameOver = true;
            gameOverReason = '뒷골목의 밤, 청소부의 갈고리에 찔려 액체 연료 탱크로 용해되었습니다.';
          }
        } else {
          narrative += `\n[03:13 뒷골목의 밤] 합법 거주구역의 철문을 잠그고 숨을 죽입니다. 바깥 골목에서는 청소부들이 배회하며 거주민들을 해체하는 끔찍한 소리가 들려옵니다.`;
        }
      }
    }

    const newLog: NarrativeLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      day: newDay,
      timeOfDay: newTime,
      districtId: p.currentDistrictId,
      text: narrative,
      internalMonologue: monologue,
      carmenWhisper,
      eventTag,
    };

    const nextChoices = isGameOver ? [] : CoreEngine.generateChoices(p, newTime, newDay);

    return {
      ...state,
      day: newDay,
      timeOfDay: newTime,
      player: p,
      logs: [newLog, ...state.logs].slice(0, 50), // 최신 50개 보존
      currentChoices: nextChoices,
      isGameOver,
      gameOverReason,
    };
  }

  /**
   * 상황에 맞는 동적 선택지 3~4개 생성
   */
  static generateChoices(player: PlayerCharacter, time: TimeOfDay, _day: number): ActionChoice[] {
    const choices: ActionChoice[] = [];

    if (time === 'NIGHT_SWEEPER') {
      if (player.housingTaxDaysLeft <= 0) {
        choices.push({
          id: 'sweeper_flee',
          text: '어둠을 틈타 폐건물 깊숙한 곳으로 은신한다 (신체 능력 판정)',
          actionType: 'REST',
          dangerLevel: 'EXTREME',
        });
        choices.push({
          id: 'sweeper_fight',
          text: '다가오는 청소부 첨병을 무기로 기습한다 (결사항전)',
          actionType: 'COMBAT',
          dangerLevel: 'EXTREME',
        });
      } else {
        choices.push({
          id: 'night_rest',
          text: '방문을 걸어 잠그고 뒷골목의 밤이 끝날 때까지 휴식한다',
          actionType: 'REST',
          dangerLevel: 'LOW',
        });
        choices.push({
          id: 'night_meditate',
          text: '공포 속에서 마음을 다잡으며 신(心)의 호흡을 수련한다',
          actionType: 'TRAIN_SHIN',
          dangerLevel: 'MEDIUM',
        });
      }
      return choices;
    }

    // 일반 시간대 선택지
    choices.push({
      id: 'work_contract',
      text: player.fixerGrade ? '해결사 사무소의 수금/토벌 의뢰를 수행한다' : '위험한 일용직 노동과 하청 의뢰를 뛴다',
      actionType: 'WORK',
      dangerLevel: 'MEDIUM',
    });

    choices.push({
      id: 'explore_alley',
      text: `${player.currentDistrictId}구 뒷골목을 수색하여 자원과 소문을 찾는다`,
      actionType: 'EXPLORE',
      dangerLevel: 'MEDIUM',
    });

    if (player.relationships.length > 0) {
      const npc = player.relationships[0];
      choices.push({
        id: 'visit_partner',
        text: `${npc.name}(${npc.title})을 찾아가 대화를 나누고 위기를 살핀다`,
        actionType: 'ROMANCE',
        dangerLevel: 'LOW',
      });
    }

    if (player.housingTaxDaysLeft <= 3 && player.ahn >= 500) {
      choices.push({
        id: 'pay_tax_choice',
        text: `관리국에 거주세 500안을 납부하여 주거권을 7일 연장한다 (잔여: ${player.housingTaxDaysLeft}일)`,
        actionType: 'PAY_TAX',
        dangerLevel: 'LOW',
        costAhn: 500,
      });
    } else {
      choices.push({
        id: 'train_mind',
        text: player.hasShin
          ? `신(心)의 감정 에너지를 다스려 망(望)의 파괴력을 시험한다`
          : `극심한 스트레스 속에서 자아를 응시하며 신(心)을 각성하려 시도한다`,
        actionType: 'TRAIN_SHIN',
        dangerLevel: 'HIGH',
      });
    }

    return choices;
  }
}
