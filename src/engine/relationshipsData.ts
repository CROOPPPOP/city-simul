import type { Gender, RelationshipCharacter } from '../types/game';

interface NpcTemplate {
  name: string;
  gender: Gender;
  title: string;
  backstory: string;
  crisisList: string[];
}

const NPC_TEMPLATES: NpcTemplate[] = [
  {
    name: '유리안',
    gender: 'female',
    title: '츠바이 6과 견습 검사',
    backstory: '정의로운 마음으로 사람들을 지키고자 츠바이 협회에 들어왔으나, 돈이 없으면 칼 한 자루 뽑지 못하게 하는 협회의 차가운 규정에 회의감을 느끼고 있다.',
    crisisList: [
      '뒷골목 순찰 중 상부의 지시를 어기고 빈민을 구하려다 징계 위기에 처했습니다.',
      '협회 장비 수리비 800안을 마련하지 못해 방패를 압류당할 처지입니다.',
      '오늘 밤 뒷골목의 밤 순찰에 강제 차출되어 생환 여부가 불투명합니다.',
    ],
  },
  {
    name: '이솔',
    gender: 'female',
    title: '뒷골목 사설 의체 정비사',
    backstory: '버려진 부품들을 주워 빈민들의 망가진 의체를 몰래 고쳐주며 생계를 잇는 기술자. 순수 육체를 신봉하는 N사 이단심문관들의 눈을 피해 숨어 지낸다.',
    crisisList: [
      'N사 망치 대원들이 작업장 앞 골목까지 수색을 좁혀와 은신처가 발각될 위기입니다.',
      '환자의 의체를 고치다 트레스 협회 미승인 특허 부품을 사용한 혐의로 고발당했습니다.',
      '밀린 작업장 월세와 거주세를 내지 못해 오늘 자정 쫓겨날 위험에 놓였습니다.',
    ],
  },
  {
    name: '카엘',
    gender: 'male',
    title: '시 협회 하청 은밀 해결사',
    backstory: '과중한 암살 의뢰와 수면 부족에 시달리면서도, 소중한 사람을 살릴 약값을 마련하기 위해 묵묵히 칼날을 벼리는 과묵한 청년.',
    crisisList: [
      '표적 암살에 실패하여 오히려 손가락 산하 조직원들에게 역추적당하고 있습니다.',
      '약지 갤러리의 인체 실험용 표적으로 지목되어 납치 위협을 받고 있습니다.',
      '연속된 격무로 SP가 위험 수치에 도달해 환청(카르멘의 목소리)에 시달리고 있습니다.',
    ],
  },
  {
    name: '샤를로트',
    gender: 'female',
    title: '몰락한 둥지의 전직 연구원',
    backstory: '과거 날개의 특이점 기밀 연구에 참여했으나 날개의 파벌 숙청으로 모든 것을 잃고 뒷골목으로 추락했다. 둥지 재입성을 위한 자금을 필사적으로 모으고 있다.',
    crisisList: [
      '날개의 암살자가 입막음을 위해 보낸 용병에게 거처가 포위되었습니다.',
      '특이점 연구 수첩을 빼앗기지 않기 위해 뒷골목 폭력배들과 대치 중입니다.',
      '시간세(T사) 체납으로 인해 온몸이 서서히 흑백으로 굳어가는 병증이 시작되었습니다.',
    ],
  },
  {
    name: '시온',
    gender: 'male',
    title: '검지(Index)의 방황하는 전령',
    backstory: '이유도 맥락도 알 수 없는 무작위적인 "지령"을 배달하며 죄책감에 짓눌려 있다. 지령을 거역하면 대행자에게 처형당한다는 것을 알면서도 의문을 품는다.',
    crisisList: [
      '받아든 지령의 내용이 "당신(플레이어)의 왼팔을 잘라 바치라"는 명령이었습니다.',
      '지령 전달 기한을 10분 넘겨 검지 대행자의 추적을 받기 시작했습니다.',
      '맹목적 복종에 회의를 느껴 검지를 탈출하려는 계획을 세우고 있습니다.',
    ],
  },
];

export function generateInitialRelationship(playerGender: Gender, districtId: number): RelationshipCharacter {
  // 플레이어 성별에 따라 로맨스 가능한 대상 우선 고려 (이성 또는 다양한 성향 대응)
  const targetGender: Gender = playerGender === 'male' ? 'female' : 'male';
  let filtered = NPC_TEMPLATES.filter((t) => t.gender === targetGender);
  if (filtered.length === 0) filtered = NPC_TEMPLATES;

  const chosen = filtered[Math.floor(Math.random() * filtered.length)];
  const crisis = chosen.crisisList[Math.floor(Math.random() * chosen.crisisList.length)];

  return {
    id: `npc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: chosen.name,
    gender: chosen.gender,
    title: chosen.title,
    districtId: districtId,
    affection: 35, // 초기 호감도
    dependence: 40, // 초기 유대감
    type: 'acquaintance',
    status: 'alive',
    backstory: chosen.backstory,
    currentCrisis: crisis,
  };
}
