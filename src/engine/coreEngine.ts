import type {
  GameState,
  PlayerCharacter,
  ActionChoice,
  NarrativeLog,
  TimeOfDay,
  Gender,
  BodyParts,
  MonthlySituation,
} from '../types/game';
import type { TimeTickResult } from './timeKeeper';
import { DISTRICTS_DATA } from './districtsData';

export class CoreEngine {
  /**
   * 새로운 캐릭터 및 초기 게임 상태 생성 (8~10세 유소년기로 시작)
   */
  static createCharacter(name: string, gender: Gender): GameState {
    // 26개 구 중 랜덤 선택 (1, 2, 3구 머리 직할구는 출생 확률이 낮음)
    const validDistricts = [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const birthDistrictId = validDistricts[Math.floor(Math.random() * validDistricts.length)];

    // 15% 확률로 둥지 출생, 85% 확률로 뒷골목 출생
    const isNestBorn = Math.random() < 0.15;

    // 시작 나이: 8~10세 중 랜덤 (기본 9세)
    const startAge = 8 + Math.floor(Math.random() * 3);

    const initialBodyParts: BodyParts = {
      head: 'healthy',
      torso: 'healthy',
      leftArm: 'healthy',
      rightArm: 'healthy',
      leftLeg: 'healthy',
      rightLeg: 'healthy',
    };

    const isTCorp = birthDistrictId === 20;

    const player: PlayerCharacter = {
      name: name.trim() || (gender === 'female' ? '엘레나' : '칼리온'),
      gender,
      age: startAge,
      growthStage: 'CHILD', // 8~12세 유소년
      birthDistrictId,
      isNestBorn,
      currentDistrictId: birthDistrictId,
      isInsideNest: isNestBorn,
      ahn: isNestBorn ? 400 : 80, // 아이의 주머니에 든 푼돈
      housingTaxDaysLeft: isNestBorn ? 30 : 5, // 뒷골목은 5일 남음 (거주세 압박)
      timeBalanceHours: isTCorp ? 24 : undefined,
      timeTaxDueDays: isTCorp ? 7 : undefined,
      isTimeFrozen: false,
      hp: 50,
      maxHp: 50,
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
            name: '가문의 연습용 호신 봉',
            workshop: '정규 공방 유소년용',
            damage: 6,
            description: '가문에서 호신용으로 쥐여준 가벼운 훈련용 봉.',
          }
        : {
            name: '녹슨 쇠파이프',
            workshop: '뒷골목 자작 폐품',
            damage: 4,
            description: '쓰레기 더미에서 주워 손잡이에 낡은 붕대를 감은 쇠파이프.',
          },
      sp: 0,
      hasShin: false,
      shinActive: false,
      mangLevel: 0,
      egoProgress: 0,
      distortionProgress: 0,
      path: isNestBorn ? 'WING_FEATHER' : 'FIXER',
      fixerGrade: undefined, // 17세 이전 유소년기에는 면허 미보유
      relationships: [],
      taboo: {
        ai_violation: 0,
        clone_7days: 0,
        dwelling_invasion: 0,
        firearm_tax_evasion: 0,
        impurityLevel: 0,
      },
    };

    const district = DISTRICTS_DATA[birthDistrictId];
    let initialLogText = isNestBorn
      ? `당신은 ${district.wingName} 관할 둥지에서 태어난 ${startAge}살 아이입니다. 비록 둥지의 보호막 아래 따뜻한 옷을 입고 있지만, 매달 부모님을 옥죄는 살인적인 주거세와 둥지 이면의 음산한 분위기는 어린 당신의 가슴에도 차가운 공포로 맺힙니다.`
      : `당신은 ${district.wingName} 관할 ${district.id}구 뒷골목의 차가운 시멘트 바닥에서 태어난 ${startAge}살 아이입니다. 사방에서 어른들의 고함과 칼부림이 오가고, 매일 새벽 3시 13분이면 청소부들이 들이닥치는 지옥 같은 거리에서 당신은 오직 작은 몸을 웅크린 채 살아남는 법을 배워야 합니다. 손에는 주워든 쇠파이프 한 자루뿐입니다.`;

    if (isTCorp) {
      initialLogText += `\n[T사 고유 규칙] 이곳에서는 시간조차 어린아이에게 자비를 베풀지 않습니다. 잔여 개인 시간: 24시간. 시간세 납부 기한: 7일.`;
    }

    const initialLog: NarrativeLog = {
      id: `log_init_${Date.now()}`,
      year: 984,
      month: 1,
      day: 1,
      hour: 8,
      minute: 0,
      timeOfDay: 'MORNING',
      districtId: birthDistrictId,
      text: initialLogText,
      internalMonologue: `너무 춥고 배고프다... 어떻게든 살아남아야 해. 어른들에게 짓밟히지 않으려면...`,
      eventTag: isNestBorn ? '둥지의 유소년' : isTCorp ? 'T사 시간의 톱니바퀴' : '뒷골목의 부랑아',
    };

    return {
      year: 984,
      month: 1,
      day: 1,
      hour: 8,
      minute: 0,
      timeOfDay: 'MORNING',
      timeSpeed: '1X',
      previousTimeSpeed: '1X',
      dayProgress: 8 / 24,
      monthProgress: 0,
      isAutoPaused: false,
      player,
      logs: [initialLog],
      currentChoices: [],
      activeEncounter: null,
      pendingSituation: null,
      isGameOver: false,
    };
  }

  /**
   * 실시간 TimeKeeper 틱 처리 (1분 = 1시간, 나이 성장 마일스톤 및 정밀 시간세 반영)
   */
  static processTimeTick(state: GameState, tick: TimeTickResult): GameState {
    if (state.isGameOver) return state;

    const p = { ...state.player, bodyParts: { ...state.player.bodyParts } };
    const logs = [...state.logs];
    let isGameOver = false;
    let gameOverReason = '';

    // 1. 매 인게임 1시간 경과 시 처리
    if (tick.hourPassed) {
      // 20구 T사(Time Track) 시간 소모
      if (p.currentDistrictId === 20 && p.timeBalanceHours !== undefined) {
        p.timeBalanceHours -= 1;

        if (p.timeBalanceHours <= 0) {
          p.isTimeFrozen = true;
          p.hp = Math.max(0, p.hp - 2);
          p.sp = Math.max(-45, p.sp - 3);

          if (p.timeBalanceHours <= -24) {
            isGameOver = true;
            gameOverReason = 'T사 시간세 체납 및 개인 시간 고갈로 인해 3등급 시간 징수관에게 신체 시간을 완전히 압류당해 영구 박제(미라화)되었습니다.';
          } else if (p.timeBalanceHours === 0) {
            logs.push({
              id: `log_tcorp_warning_${Date.now()}`,
              year: tick.newYear,
              month: tick.newMonth,
              day: tick.newDay,
              hour: tick.newHour,
              minute: tick.newMinute,
              timeOfDay: tick.newTimeOfDay,
              districtId: 20,
              text: '[T사 비상 경보] 개인 시간 잔여량이 0시간에 도달했습니다! 신체가 잿빛으로 탈색되며 굳어갑니다. 즉시 시간을 보충하지 않으면 징수관이 출동합니다!',
              internalMonologue: '몸이 굳어간다... 손가락이 움직이지 않아...!',
              eventTag: '시간 고갈 위기',
            });
          }
        } else {
          p.isTimeFrozen = false;
        }
      }
    }

    // 2. 일차 경과 시 처리 (식비 차감, 거주세 차감)
    if (tick.dayPassed) {
      p.housingTaxDaysLeft -= 1;
      if (p.timeTaxDueDays !== undefined) {
        p.timeTaxDueDays -= 1;
      }

      // 하루 기본 식비 (어린이는 20안, 소년기 35안, 성인 50안)
      const dailyFoodCost = p.growthStage === 'CHILD' ? 20 : p.growthStage === 'ADOLESCENT' ? 35 : 50;
      if (p.ahn >= dailyFoodCost) {
        p.ahn -= dailyFoodCost;
      } else {
        p.hp = Math.max(0, p.hp - 6);
        p.sp = Math.max(-45, p.sp - 6);
      }

      // 체력 0 판정
      if (p.hp <= 0) {
        isGameOver = true;
        gameOverReason = '극심한 부상과 기아로 인해 뒷골목의 차가운 바닥에서 숨을 거두었습니다.';
      }
    }

    // 3. 1년 경과 (나이 증가 및 성장 마일스톤)
    if (tick.yearPassed || (tick.monthPassed && tick.newYear !== state.year)) {
      p.age += 1;

      // 13세: 소년기(ADOLESCENT) 돌파
      if (p.age === 13 && p.growthStage === 'CHILD') {
        p.growthStage = 'ADOLESCENT';
        p.maxHp += 25;
        p.hp = Math.min(p.maxHp, p.hp + 25);
        logs.push({
          id: `log_grow_13_${Date.now()}`,
          year: tick.newYear,
          month: tick.newMonth,
          day: tick.newDay,
          hour: tick.newHour,
          minute: tick.newMinute,
          timeOfDay: tick.newTimeOfDay,
          districtId: p.currentDistrictId,
          text: `[★ 성장: 소년기 진입] 13세가 되었습니다! 키가 훌쩍 자라고 골목길의 험난한 생존 기술을 체득했습니다. (최대 체력 +25)`,
          internalMonologue: `더 이상 무기력하게 당하기만 하던 어린애가 아니다. 내 손으로 먹고살 길을 찾아야 해.`,
          eventTag: '★ 소년기 성장',
        });
      }
      // 17세: 성인(ADULT) 돌파 및 9급 해결사 면허 취득
      else if (p.age === 17 && p.growthStage === 'ADOLESCENT') {
        p.growthStage = 'ADULT';
        p.maxHp += 25;
        p.hp = Math.min(p.maxHp, p.hp + 25);
        if (p.path === 'FIXER') {
          p.fixerGrade = 9;
        }
        logs.push({
          id: `log_grow_17_${Date.now()}`,
          year: tick.newYear,
          month: tick.newMonth,
          day: tick.newDay,
          hour: tick.newHour,
          minute: tick.newMinute,
          timeOfDay: tick.newTimeOfDay,
          districtId: p.currentDistrictId,
          text: `[★ 성장: 성인 진입 & 9급 해결사 공인] 17세 성인이 되었습니다! 하나 협회 말단 창구에서 시험을 치르고 마침내 "9급 해결사" 면허를 정식 발급받았습니다! (최대 체력 +25, 9급 해결사 승격)`,
          internalMonologue: `마침내 어엿한 해결사다. 이제 도시의 본격적인 무대에 발을 들여놓는다.`,
          eventTag: '★ 9급 해결사 승격',
        });
      } else {
        logs.push({
          id: `log_year_${Date.now()}`,
          year: tick.newYear,
          month: tick.newMonth,
          day: tick.newDay,
          hour: tick.newHour,
          minute: tick.newMinute,
          timeOfDay: tick.newTimeOfDay,
          districtId: p.currentDistrictId,
          text: `[도시력 ${tick.newYear}년] 잔혹한 도시의 톱니바퀴 속에서 1년을 버텨내어 ${p.age}세가 되었습니다.`,
          internalMonologue: `또 1년을 살아남았다. 숨이 붙어있다는 것 자체가 기적이다.`,
          eventTag: '생존 기념',
        });
      }
    }

    return {
      ...state,
      year: tick.newYear,
      month: tick.newMonth,
      day: tick.newDay,
      hour: tick.newHour,
      minute: tick.newMinute,
      timeOfDay: tick.newTimeOfDay,
      dayProgress: tick.dayProgress,
      monthProgress: tick.monthProgress,
      player: p,
      logs: logs.slice(-100),
      isGameOver,
      gameOverReason: gameOverReason || state.gameOverReason,
    };
  }

  /**
   * 월간 사건 모달 열기 및 일시정지
   */
  static openMonthlySituation(state: GameState, situation: MonthlySituation): GameState {
    const newLog: NarrativeLog = {
      id: `log_situation_${Date.now()}`,
      year: situation.year,
      month: situation.month,
      day: state.day,
      hour: state.hour,
      minute: state.minute,
      timeOfDay: state.timeOfDay,
      districtId: state.player.currentDistrictId,
      text: `[${situation.year}년 ${situation.month}월: ${situation.title}]\n${situation.loreDescription}`,
      internalMonologue: situation.atmosphere,
      carmenWhisper: situation.carmenWhisper,
      eventTag: '월간 주요 사건',
    };

    return {
      ...state,
      pendingSituation: situation,
      timeSpeed: 'PAUSED',
      isAutoPaused: true,
      logs: [...state.logs, newLog].slice(-100),
    };
  }

  /**
   * 플레이어의 행동 선택 실행 및 상태 전이
   */
  static executeAction(state: GameState, choice: ActionChoice): GameState {
    if (state.isGameOver) return state;

    const p = { ...state.player, bodyParts: { ...state.player.bodyParts } };
    const newDay = state.day;
    const newMonth = state.month;
    const newYear = state.year;
    const newTime = state.timeOfDay;
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

    // 선택지의 기본 파라미터 적용 (Ahn, HP, SP, Time)
    if (choice.costAhn) p.ahn = Math.max(0, p.ahn - choice.costAhn);
    if (choice.costHp) p.hp = Math.max(0, p.hp - choice.costHp);
    if (choice.costSp) p.sp = Math.max(-45, p.sp - choice.costSp);
    if (choice.costTimeHours && p.timeBalanceHours !== undefined) {
      p.timeBalanceHours -= choice.costTimeHours;
    }
    if (choice.rewardAhn) p.ahn += choice.rewardAhn;
    if (choice.rewardTimeHours && p.timeBalanceHours !== undefined) {
      p.timeBalanceHours += choice.rewardTimeHours;
    }

    // 행동 타입별 룰 판정
    switch (choice.actionType) {
      case 'PAY_TIME_TAX': {
        const cost = choice.costAhn ?? 450;
        p.timeBalanceHours = (p.timeBalanceHours ?? 0) + (choice.rewardTimeHours ?? 72);
        p.timeTaxDueDays = 30;
        p.isTimeFrozen = false;
        p.sp = Math.min(45, p.sp + 10);
        narrative = `T사 20구 세무국 창구에서 ${cost}안을 지불하고 72시간의 정규 시간 배터리를 충전했습니다. 째깍거리는 황동 보증서가 발급되며 시간세 납부 기한이 30일 연장되었습니다.`;
        monologue = `적어도 한 달 동안은 징수관들이 들이닥쳐 내 시간을 압류할 일은 없다.`;
        eventTag = 'T사 시간세 납부';
        break;
      }

      case 'BORROW_TIME': {
        const hours = choice.rewardTimeHours ?? 48;
        p.timeBalanceHours = (p.timeBalanceHours ?? 0) + hours;
        p.sp = Math.max(-45, p.sp - 15);
        p.isTimeFrozen = false;
        narrative = `뒷골목의 악명 높은 시간 전당포에서 사채업자에게 ${hours}시간의 고리대금 시간을 대출받았습니다. 푸르스름한 시간 용액이 혈관으로 주입되며 일시적인 활력이 돕니다.`;
        monologue = `다음 달엔 세 배로 갚아야 한다... 갚지 못하면 내 심장을 떼어가겠지.`;
        eventTag = '고리대금 시간 대출';
        break;
      }

      case 'BUY_TIME': {
        const hours = choice.rewardTimeHours ?? 36;
        p.timeBalanceHours = (p.timeBalanceHours ?? 0) + hours;
        p.isTimeFrozen = false;
        narrative = `암시장에서 ${choice.costAhn ?? 300}안을 지불하고 ${hours}시간의 정제되지 않은 시간 앰플을 구입했습니다.`;
        monologue = `시간이 곧 목숨이다. 조금이라도 더 비축해둬야 해.`;
        eventTag = '시간 앰플 구매';
        break;
      }

      case 'WORK': {
        const gradeBonus = typeof p.fixerGrade === 'number' ? (10 - p.fixerGrade) * 2 : p.fixerGrade === 'COLOR' ? 24 : 2;
        const roll = Math.floor(Math.random() * 20) + 1 + gradeBonus;
        const earnedAhn = choice.rewardAhn ?? (280 + roll * 15);
        if (!choice.rewardAhn) p.ahn += earnedAhn;
        p.sp = Math.max(-45, p.sp - 6);

        narrative = choice.description
          ? `${choice.text} 완료: ${choice.description} (+${earnedAhn}안)`
          : `의뢰를 완수하여 ${earnedAhn}안을 벌어들였습니다. 피와 땀으로 얼룩진 지폐를 세며, 도시의 톱니바퀴로서 하루를 소모했습니다.`;
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
          const foundAhn = choice.rewardAhn ?? (Math.floor(Math.random() * 250) + 100);
          if (!choice.rewardAhn) p.ahn += foundAhn;
          narrative = choice.description
            ? `${choice.text} 탐색 성공: ${choice.description} (+${foundAhn}안)`
            : `${district.id}구 뒷골목의 쓰레기 더미 사이에서 버려진 지갑과 공방 부품을 건졌습니다. (+${foundAhn}안)`;
          monologue = `죽은 자는 돈이 필요 없다. 살아남은 자만이 챙길 뿐.`;
          eventTag = '폐허 수색';
        } else if (exploreRoll < 75) {
          const damage = Math.max(5, 20 - (p.hasShin ? 10 : 0));
          p.hp = Math.max(0, p.hp - damage);
          p.sp = Math.max(-45, p.sp - 10);
          narrative = `골목길에서 흉기를 든 폭력배들과 마주쳐 격투를 벌였습니다! 적을 쓰러뜨렸지만 ${damage}의 상처를 입었습니다.`;
          monologue = `숨 쉴 틈도 없이 칼이 날아든다. 이게 도시의 일상이다.`;
          eventTag = '골목 칼부림';
        } else {
          p.sp = Math.max(-45, p.sp - 15);
          narrative = `${district.wingName}의 특이점 잔재가 골목 구석에서 기괴하게 박동하는 광경을 목격했습니다. 설명할 수 없는 혐오감에 머리가 쪼개질 듯 아파옵니다.`;
          monologue = `저런 끔찍한 것을 바탕으로 날개는 번영을 누리고 있던 것인가.`;
          eventTag = '특이점의 잔재 목격';
        }
        break;
      }

      case 'COMBAT': {
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
        if (!p.hasShin) {
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
          p.sp = Math.min(45, p.sp + 10);
          narrative = `신(心)의 호흡을 정렬하며 내면의 오라를 안정시켰습니다. 극한의 상황에서 타오를 감정의 불꽃을 조용히 다듬습니다.`;
          monologue = `차분하게 흐른다. 이 감정을 더 강하게 벼려야 한다.`;
          eventTag = '신의 정렬';
        }
        break;
      }

      case 'ROMANCE': {
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

      case 'RECRUIT_RELATIONSHIP': {
        if (choice.recruitCharacter) {
          const already = p.relationships.some((r) => r.name === choice.recruitCharacter!.name);
          if (!already) {
            p.relationships = [...p.relationships, choice.recruitCharacter];
          }
          narrative = choice.description || `${choice.recruitCharacter.name}(${choice.recruitCharacter.title})와(과) 연을 맺었습니다.`;
          monologue = `이 차가운 콘크리트 도시에서 등을 맞댈 동료가 생겼다.`;
          eventTag = '★ 새로운 인연';
        }
        break;
      }

      case 'EVENT_CHOICE': {
        narrative = choice.description || `${choice.text}을(를) 완수했습니다.`;
        monologue = `결단을 내렸다. 앞으로 나아갈 뿐이다.`;
        eventTag = '사건 결단';
        break;
      }

      case 'CUSTOM': {
        narrative = choice.customPrompt || `선택한 행동을 신중하게 실행에 옮겼습니다.`;
        monologue = `어떤 결과가 돌아오든, 선택은 내가 내렸다.`;
        eventTag = '독자적 결단';
        break;
      }
    }

    // 카르멘의 속삭임 (SP가 -30 이하일 때)
    if (p.sp <= -30) {
      p.distortionProgress = Math.min(100, p.distortionProgress + 15);
      carmenWhisper = `"...참으로 가련하구나. 왜 이 잔혹한 도시의 도덕과 규율에 얽매여 고통받고 있니? 네 안의 가장 순수한 욕망만을 남기고 모든 것을 내려놓으렴. 너 자신이 되는 거야..."`;
      if (p.distortionProgress >= 100) {
        isGameOver = true;
        gameOverReason = '카르멘의 속삭임에 자아를 헌납하고 이형의 괴물, "뒤틀림(Distortion)"으로 변이하였습니다.';
      }
    }

    // 체력 0 판정
    if (p.hp <= 0) {
      isGameOver = true;
      gameOverReason = '치명적인 외상으로 인해 뒷골목의 차가운 바닥에서 사망하였습니다.';
    }

    const newLog: NarrativeLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      year: newYear,
      month: newMonth,
      day: newDay,
      hour: state.hour,
      minute: state.minute,
      timeOfDay: newTime,
      districtId: p.currentDistrictId,
      text: narrative,
      internalMonologue: monologue,
      carmenWhisper,
      eventTag,
    };

    return {
      ...state,
      player: p,
      logs: [...state.logs, newLog].slice(-100),
      currentChoices: [], // 인카운터 완료 시 선택지 닫음
      activeEncounter: null, // 인카운터 모달 닫기
      pendingSituation: null, // 월간 상황 닫기
      isAutoPaused: false,
      timeSpeed: state.previousTimeSpeed || (state.timeSpeed === 'PAUSED' ? '1X' : state.timeSpeed), // 행동 후 이전 시간으로 재개
      isGameOver,
      gameOverReason,
    };
  }

  /**
   * 돌발 인카운터 발생 및 시간 일시정지
   */
  static triggerEncounter(state: GameState, encounter: any): GameState {
    const newLog: NarrativeLog = {
      id: `log_enc_${Date.now()}`,
      year: state.year,
      month: state.month,
      day: state.day,
      hour: state.hour,
      minute: state.minute,
      timeOfDay: state.timeOfDay,
      districtId: state.player.currentDistrictId,
      text: `[돌발 인카운터: ${encounter.title}]\n${encounter.description}`,
      internalMonologue: encounter.atmosphereQuote || '갑작스러운 사태에 반사적으로 무기를 쥐었다.',
      carmenWhisper: encounter.carmenWhisper,
      eventTag: encounter.category === 'RELATIONSHIP_DISCOVERY' ? '♥ 인연의 조우' : '🚨 돌발 인카운터',
    };

    return {
      ...state,
      activeEncounter: encounter,
      currentChoices: encounter.choices,
      previousTimeSpeed: state.timeSpeed !== 'PAUSED' ? state.timeSpeed : '1X',
      timeSpeed: 'PAUSED',
      isAutoPaused: true,
      logs: [...state.logs, newLog].slice(-100),
    };
  }

  /**
   * 상황에 맞는 동적 기본 선택지 생성
   */
  static generateChoices(player: PlayerCharacter, time: TimeOfDay, _day: number): ActionChoice[] {
    const choices: ActionChoice[] = [];
    const isTCorp = player.currentDistrictId === 20;

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

    // T사 전용 즉각 행동 옵션 (시간세 압박 시)
    if (isTCorp && ((player.timeBalanceHours ?? 24) <= 24 || (player.timeTaxDueDays ?? 7) <= 3)) {
      choices.push({
        id: 'tcorp_quick_pay',
        text: `T사 세무국에 시간세 납부 (잔여: ${player.timeBalanceHours}시간 / 기한: ${player.timeTaxDueDays}일)`,
        description: '450안을 내고 72시간을 즉시 충전합니다.',
        actionType: 'PAY_TIME_TAX',
        dangerLevel: 'LOW',
        costAhn: 450,
        rewardTimeHours: 72,
      });
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
