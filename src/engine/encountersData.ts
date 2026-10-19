import type { ActiveEncounter, EncounterCategory, TimeOfDay } from '../types/game';

export interface EncounterCondition {
  minAge?: number;
  maxAge?: number;
  districtIds?: number[];
  timeOfDays?: TimeOfDay[];
  minProsthetics?: number;
  maxProsthetics?: number;
  requiresShin?: boolean;
  minAhn?: number;
  maxHpPercent?: number;
}

export interface LoreEncounterTemplate {
  id: string;
  category: EncounterCategory;
  title: string;
  condition?: EncounterCondition;
  description: string;
  atmosphereQuote?: string;
  carmenWhisper?: string;
  choices: ActiveEncounter['choices'];
}

/**
 * 4대 보고서 기반 프문 세계관 총망라 인카운터 데이터베이스
 */
export const LORE_ENCOUNTERS_POOL: LoreEncounterTemplate[] = [
  // =========================================================================
  // 1. 유소년기(8~12세) 전용 생존 인카운터
  // =========================================================================
  {
    id: 'child_stolen_bread',
    category: 'STREET_SURVIVAL',
    title: '뒷골목 합성 빵집의 쓰레기통',
    condition: { maxAge: 12 },
    description: '배에서 찢어질 듯한 꼬르륵 소리가 납니다. 뒷골목의 허름한 합성 빵집 뒤편에서 방금 버려진 딱딱하게 굳은 단백질 블록 덩어리가 보입니다. 하지만 그 옆에는 굶주린 들개 두 마리가 으르렁거리고 있습니다.',
    atmosphereQuote: '도시에서 아이는 미래가 아니다. 가장 먼저 굶어 죽는 고깃덩이일 뿐이다.',
    choices: [
      {
        id: 'child_scavenge_dog',
        text: '짱돌을 던져 들개를 쫓아내고 빵을 낚아챈다 (신체 판정)',
        description: '성공 시 허기를 달래지만 물릴 위험이 있습니다.',
        actionType: 'SCAVENGE',
        dangerLevel: 'MEDIUM',
        rewardAhn: 30,
        costHp: 5,
      },
      {
        id: 'child_beg_owner',
        text: '빵집 뒷문으로 가 사정하며 허드렛일을 자청한다',
        description: '어른의 기분에 따라 매질을 당하거나 약간의 식사를 얻습니다.',
        actionType: 'WORK',
        dangerLevel: 'LOW',
        rewardAhn: 50,
      },
    ],
  },
  {
    id: 'child_dieci_orphanage',
    category: 'FIXER_ASSOCIATION',
    title: '디에치 협회 산하 고아원의 빵 배급',
    condition: { maxAge: 13 },
    description: '두꺼운 가죽 외투와 목에 학식의 상징인 영대(Spiritual Belt)를 두른 디에치 협회 4과 해결사들이 골목 한가운데에서 도시의 부랑아들을 모아 딱딱한 호밀빵을 나누어주고 있습니다. 한 해결사가 당신의 눈빛을 유심히 바라봅니다.',
    atmosphereQuote: '학식은 곧 물리적인 무게다. 앎을 갈망하는 자만이 주먹으로 벽을 부술 수 있다.',
    choices: [
      {
        id: 'child_dieci_study',
        text: '고개를 숙이고 공손하게 교리 책자를 읽으며 배급을 받는다',
        description: '학문적 기초와 소량의 식사를 얻으며 SP가 회복됩니다.',
        actionType: 'STUDY',
        dangerLevel: 'LOW',
        rewardAhn: 40,
        costSp: -10, // SP +10 회복
      },
      {
        id: 'child_dieci_punch',
        text: '디에치 무투파(검은 장갑)에게 어깨너머로 주먹 쥐는 법을 묻는다',
        description: '해결사가 웃으며 주먹질의 요령을 가르쳐줍니다. (전투력 향상)',
        actionType: 'TRAIN_SHIN',
        dangerLevel: 'LOW',
      },
    ],
  },
  {
    id: 'child_workshop_scraps',
    category: 'WORKSHOP_TATTOO',
    title: '늙은소년 공방의 폐자재 더미',
    condition: { maxAge: 14 },
    description: '트레스 협회의 특허 인장이 찍힌 폐기 상자에서 예리하게 벼려진 공방용 톱날과 고장 난 태엽 뭉치가 쏟아져 나와 있습니다. 이를 고철상에 넘기면 며칠 치 밥값을 벌 수 있지만, 근처 소년배들이 몽둥이를 쥐고 다가옵니다.',
    atmosphereQuote: '공방의 부스러기 하나도 뒷골목에서는 살인 무기가 된다.',
    choices: [
      {
        id: 'child_scrap_fight',
        text: '녹슨 쇠파이프를 움켜쥐고 소년배들과 싸워 폐자재를 지킨다',
        description: '타박상을 입을 수 있으나 짭짤한 Ahn을 챙깁니다.',
        actionType: 'COMBAT',
        dangerLevel: 'MEDIUM',
        rewardAhn: 120,
        costHp: 10,
      },
      {
        id: 'child_scrap_share',
        text: '폐자재의 절반을 넘겨주고 타협하여 안전하게 빠져나간다',
        description: '평화롭게 푼돈을 건집니다.',
        actionType: 'EXPLORE',
        dangerLevel: 'LOW',
        rewardAhn: 50,
      },
    ],
  },

  // =========================================================================
  // 2. 날개 특이점 및 26개 구역 고유 인카운터
  // =========================================================================
  {
    id: 'singularity_fcorp_fairy',
    category: 'DISTRICT_SINGULARITY',
    title: '6구 F사 특이점: 무조건 여는 "요정" 기물 암거래',
    condition: { districtIds: [6] },
    description: '어두운 골목 구석에서 브로커가 은색으로 빛나는 F사의 "요정" 특이점 소형 단말기를 보여줍니다. "어떤 잠금장치든, 사람의 관절이든 개념적으로 따버리는 물건이지. 물론 햇빛이 비칠 때 문을 닫지 말라는 머리의 금기만 조심하면 돼."',
    atmosphereQuote: '닫힌 것은 모두 열려야 한다. 사람의 살갗이든 금고의 문이든.',
    choices: [
      {
        id: 'fcorp_buy_lockpick',
        text: '500안을 내고 소형 요정 개방 앰플을 구입한다',
        description: '공방 탐색 및 잠긴 문을 여는 데 치명적인 성능을 발휘합니다.',
        actionType: 'BUY_TIME',
        dangerLevel: 'LOW',
        costAhn: 500,
      },
      {
        id: 'fcorp_report_head',
        text: '머리의 금기 위반 가능성을 경고하며 자리를 피한다',
        description: '안전을 챙기며 냉정함을 유지합니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
    ],
  },
  {
    id: 'singularity_gcorp_soldier',
    category: 'DISTRICT_SINGULARITY',
    title: '7구 G사 뒷골목: 벌레 개조 패잔병의 발작',
    condition: { districtIds: [7] },
    description: '연기 전쟁 당시 신체 일부를 벌레의 외골격과 더듬이로 개조당했던 구 G사 출신 패잔병이 중력 제어 장치의 잔해 앞에서 머리를 쥐어뜯으며 절규하고 있습니다. 그의 팔에서 돋아난 낫 모양의 갑각이 통제 불능으로 회전하며 주변을 부숩니다.',
    atmosphereQuote: '전쟁이 끝나도 벌레의 신체는 돌아오지 않는다. 남은 건 뒷골목의 오물뿐.',
    choices: [
      {
        id: 'gcorp_soothe_soldier',
        text: '합성 진통제를 건네며 참전 군인의 호흡을 진정시킨다',
        description: '군인이 고마워하며 전리품이었던 구연기 전쟁 군용 탄환을 건넵니다.',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'LOW',
        costAhn: 80,
        rewardAhn: 200,
      },
      {
        id: 'gcorp_subdue_soldier',
        text: '폭주하는 벌레 팔의 관절부를 무기로 쳐내어 무력화한다',
        description: '격투를 통해 실전 경험을 쌓고 부품을 회수합니다.',
        actionType: 'COMBAT',
        dangerLevel: 'HIGH',
        costHp: 18,
        rewardAhn: 350,
      },
    ],
  },
  {
    id: 'singularity_kcorp_ampule',
    category: 'DISTRICT_SINGULARITY',
    title: '11구 K사 뒷골목: 재생 앰플과 인지 청사진',
    condition: { districtIds: [11] },
    description: 'K사 둥지 칼프 마을 근처 뒷골목. K사의 녹색 재생 앰플을 든 사설 의무병이 다가옵니다. "눈물 흘리는 것의 원액으로 만든 정품 앰플입니다. 주입하는 순간 당신이 스스로 기억하는 원형(본모습)대로 살점이 돋아납니다. 물론 뇌가 터지면 끝장이지만요."',
    atmosphereQuote: '원형을 잃은 자에게 재생 앰플은 그저 살점을 괴사시키는 붕괴액일 뿐이다.',
    choices: [
      {
        id: 'kcorp_buy_green_ampule',
        text: '400안을 주고 녹색 회복 앰플을 투여받는다 (HP 완전 회복)',
        description: '몸의 상처가 눈 깜짝할 새 재생됩니다.',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'LOW',
        costAhn: 400,
      },
      {
        id: 'kcorp_decline',
        text: '앰플이 붕괴액으로 변질되었을 위험을 경계하며 거절한다',
        description: '돈을 아끼고 신중하게 지나칩니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
    ],
  },
  {
    id: 'singularity_ncorp_inquisition',
    category: 'HEAD_TABOO',
    title: '14구 N사 뒷골목: "못과 망치" 이단심문관의 검문',
    condition: { districtIds: [14] },
    description: '순백의 판금 갑옷 위에 붉은 인장과 못(Nagel) 문양을 두른 N사 이단심문관들이 거리를 봉쇄하고 지나가는 시민들의 팔다리를 두들겨보고 있습니다. "의체로 살점을 더럽힌 불결한 이단자가 있는가! 살점이야말로 인간의 유일한 순수함이다!"',
    atmosphereQuote: '기계로 갈아 끼운 살점은 불태워야 마땅하다. 쥐는 자의 뜻대로.',
    choices: [
      {
        id: 'ncorp_prove_flesh',
        text: '옷을 걷어붙여 생살임을 증명하고 순종적인 태도를 취한다',
        description: '의체 비율이 낮다면 무사히 통과하지만, 굴욕감에 SP가 깎입니다.',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'MEDIUM',
        costSp: 10,
      },
      {
        id: 'ncorp_evade_inquisition',
        text: '심문관들의 시선을 피해 칠리 골목의 비좁은 배수구로 숨는다',
        description: '순발력으로 빠져나갑니다. 실패 시 못이 날아듭니다.',
        actionType: 'EXPLORE',
        dangerLevel: 'HIGH',
      },
    ],
  },
  {
    id: 'singularity_wcorp_warp_train',
    category: 'DISTRICT_SINGULARITY',
    title: '23구 W사 뒷골목: "맛의 골목" 식인 정육점의 비밀',
    condition: { districtIds: [23] },
    description: '피비린내와 향신료 냄새가 섞여 풍기는 23구 뒷골목. 거대한 도살용 칼을 든 요리사가 기괴한 고기를 썰며 말을 건넵니다. "워프 열차 1등석 승객들이 10초 만에 도착하기 위해 그 아공간에서 수천 년 동안 겪는 일이 뭔지 아나? 서로를 뜯어먹고 다시 붙여지는 거지... 맛보겠나? 최고의 진미일세."',
    atmosphereQuote: '23구에서 고기의 출처를 묻는 것은 예의가 아니다. 내장이 털리고 싶지 않다면.',
    choices: [
      {
        id: 'wcorp_refuse_meat',
        text: '역겨움을 억누르며 무기를 잡고 물러선다 (정신력 저항)',
        description: '인간성을 지키지만 공포에 짓눌립니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
        costSp: 12,
      },
      {
        id: 'wcorp_steal_recipe',
        text: '정육점 카운터 뒤에 놓인 공방 특제 도살도를 훔쳐 달아난다',
        description: '식인 요리사들이 맹렬하게 추격해옵니다!',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
        rewardAhn: 600,
        costHp: 25,
      },
    ],
  },

  // =========================================================================
  // 3. 다섯 손가락 (엄지, 검지, 중지, 약지, 소지) 인카운터
  // =========================================================================
  {
    id: 'fingers_thumb_manners',
    category: 'FINGER_SYNDICATE',
    title: '엄지(Thumb) 카포의 예의범절 시험',
    description: '단정한 검은 코트에 붉은 완장을 두른 엄지 산하 솔다토들과 카포가 골목을 막아섰습니다. 카포가 권총을 만지작거리며 차가운 눈으로 당신을 내려다봅니다. "하급자가 상급자의 눈을 마주치는 것은 불경이다. 아래턱을 뽑히고 싶지 않다면 예의를 갖춰라."',
    atmosphereQuote: '예의란 폭력을 정당화하기 위해 고안된 가장 잔혹한 규율이다.',
    choices: [
      {
        id: 'thumb_polite_bow',
        text: '시선을 즉시 바닥으로 내리고 엄지의 정중한 격식으로 인사한다',
        description: '카포가 흡족해하며 보호비 명목으로 100안만 징수하고 길을 엽니다.',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'LOW',
        costAhn: 100,
      },
      {
        id: 'thumb_defiant_stare',
        text: '턱을 치켜들고 무기를 겨누며 정면으로 대치한다 (목숨을 건 결투)',
        description: '엄지의 솔다토들이 일제히 화승식 총기와 총검을 겨눕니다!',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
        costHp: 40,
        rewardAhn: 800,
      },
    ],
  },
  {
    id: 'fingers_index_prescript',
    category: 'FINGER_SYNDICATE',
    title: '검지(Index) 전달자의 불가해한 지령',
    description: '붕대로 얼굴을 감싼 검지의 전달자가 째깍거리는 황동 기계에서 인쇄된 붉은 양피지 한 장을 당신의 손에 쥐여줍니다. 지령의 내용: [오늘 지나가는 네 번째 행인에게 자신이 가진 가장 소중한 쇠붙이를 건네라. 거부할 시 대행자가 파견된다.]',
    atmosphereQuote: '지령에는 이유도 목적도 없다. 오직 맹목적인 복종만이 있을 뿐.',
    choices: [
      {
        id: 'index_obey_prescript',
        text: '지령의 불합리함을 삼키고 지시에 따라 쇠붙이를 건넨다',
        description: '검지의 대행자가 지켜보며 고개를 끄덕이고 사라집니다. (기이한 가호 획득)',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'LOW',
        costAhn: 150,
      },
      {
        id: 'index_burn_prescript',
        text: '지령지를 그 자리에서 찢어 불태워버린다 (자유 의지의 관철)',
        description: '당신의 이마에 검지의 추적 표식이 새겨집니다. 언젠가 대행자가 찾아올 것입니다.',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'HIGH',
        costSp: 15,
      },
    ],
  },
  {
    id: 'fingers_middle_ledger',
    category: 'FINGER_SYNDICATE',
    title: '중지(Middle) 작은형님의 피 묻은 장부',
    description: '온몸에 푸른 쇠사슬과 맹수의 강화 문신을 두른 중지 조직원들이 골목을 에워쌉니다. 작은형님이 피로 물든 두꺼운 장부(Book of Vengeance)를 넘기며 당신을 지목합니다. "네 녀석이 일전에 우리 아우의 영역에서 물건을 주워갔더군. 중지는 받은 모욕을 반드시 열 배로 갚는다."',
    atmosphereQuote: '피로 맺어진 가족을 건드린 자는, 그 일족의 뼈까지 갈아 마신다.',
    choices: [
      {
        id: 'middle_pay_compensation',
        text: '정중하게 고개를 숙이고 300안의 합의금을 상납한다',
        description: '작은형님이 껄껄 웃으며 장부에서 당신의 이름을 지웁니다.',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'LOW',
        costAhn: 300,
      },
      {
        id: 'middle_brawl',
        text: '중지의 폭력에 맞서 의리와 주먹의 일대일 맞다이를 신청한다',
        description: '작은형님이 흥미를 보이며 1:1 백병전 맞다이를 벌입니다!',
        actionType: 'COMBAT',
        dangerLevel: 'HIGH',
        costHp: 25,
        rewardAhn: 500,
      },
    ],
  },
  {
    id: 'fingers_ring_gallery',
    category: 'FINGER_SYNDICATE',
    title: '약지(Ring) 도슨트의 인체 조각 전시회 초대',
    description: '손가락에 은색 반지 두 줄을 낀 약지의 도슨트가 가면을 쓰고 나타나 피 묻은 초대장을 내밉니다. "야수파 마에스트로 브누아 님의 신작 [절규하는 폐허] 전시회가 열립니다. 인간의 사지를 해체하여 만든 최고의 예술이지요. 당신도 훌륭한 재료가 될 수 있습니다."',
    atmosphereQuote: '살점과 뼈가 캔버스가 될 때, 비로소 인간은 진정한 미에 도달한다.',
    choices: [
      {
        id: 'ring_flee_terror',
        text: '공포에 질려 골목 너머로 전력 질주하여 도망친다',
        description: '도슨트의 웃음소리가 뒤따라오며 극심한 정신적 충격을 받습니다.',
        actionType: 'REST',
        dangerLevel: 'MEDIUM',
        costSp: 20,
      },
      {
        id: 'ring_counter_critique',
        text: '그의 조잡한 미학을 조롱하며 도슨트의 목을 무기로 찌른다',
        description: '약지의 기습 단원들과 목숨을 건 혈투가 시작됩니다!',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
        costHp: 35,
        rewardAhn: 700,
      },
    ],
  },
  {
    id: 'fingers_pinky_vow',
    category: 'FINGER_SYNDICATE',
    title: '소지(Pinky) 72지살 결사원의 절대 맹세',
    description: '수호전의 별호를 가슴에 품은 과묵한 사내가 골목의 찻집에서 당신을 응시합니다. "나는 소지 72지살의 일원이다. 소지는 오직 한 번 맺은 약속(誓)으로만 움직이지. 내 의뢰를 하나 완수해주면, 당신이 위기에 처했을 때 목숨을 바쳐 돕겠다."',
    atmosphereQuote: '약속을 어긴 자에게 남는 것은 혀를 꿰뚫는 족쇄뿐이다.',
    choices: [
      {
        id: 'pinky_accept_vow',
        text: '새끼손가락을 걸고 비밀스러운 맹세를 맺는다',
        description: '소지의 맹세 증표를 받습니다. (위기 시 구원 가능)',
        actionType: 'RECRUIT_RELATIONSHIP',
        dangerLevel: 'MEDIUM',
      },
      {
        id: 'pinky_refuse',
        text: '손가락 조직과의 맹세는 족쇄가 될 뿐이라며 거절한다',
        description: '사내가 고개를 끄덕이며 묵묵히 찻잔을 비웁니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
    ],
  },

  // =========================================================================
  // 4. 12협회 의뢰 및 사건
  // =========================================================================
  {
    id: 'assoc_devyat_courier',
    category: 'FIXER_ASSOCIATION',
    title: '제9 제뱌찌 협회: 플루드니차 캐리어 배달 의뢰',
    description: '두꺼운 러시아풍 방한복을 입은 제뱌찌 협회 배달부가 숨을 헐떡이며 당신 앞에 캐리어를 내려놓습니다. "이 캐리어 안에는 인공지능 플루드니차가 들어있어! 30분 안에 둥지 경계 초소로 전달해야 해. 늦으면 캐리어가 소지자를 갈아버린다! 보수는 두둑하다!"',
    atmosphereQuote: '도시의 가장 험난한 사지를 뚫고 달리는 배달부들. 지연은 곧 죽음이다.',
    choices: [
      {
        id: 'devyat_sprint_delivery',
        text: '캐리어를 둘러메고 전력을 다해 질주한다 (제한 시간 배달)',
        description: '체력을 극도로 소모하지만 막대한 배달료를 챙깁니다.',
        actionType: 'WORK',
        dangerLevel: 'HIGH',
        costHp: 20,
        rewardAhn: 750,
      },
      {
        id: 'devyat_refuse',
        text: '갈려 나갈 위험을 감수할 수 없어 정중히 사양한다',
        description: '배달부가 다른 길로 급히 달려갑니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
    ],
  },
  {
    id: 'assoc_liu_fire_clash',
    category: 'FIXER_ASSOCIATION',
    title: '제6 리우 협회: 국지전 화염 진압 용병 소집',
    description: '붉은 코트를 휘날리는 리우 협회 4과 부장이 조직 간의 대규모 전면전을 앞두고 뒷골목 용병들을 징집하고 있습니다. 전방에서 화염의 권법과 언월도가 번뜩이며 빌딩 하나가 불타오르고 있습니다.',
    atmosphereQuote: '불꽃은 망설임을 태우고, 일기토는 전황을 결정짓는다.',
    choices: [
      {
        id: 'liu_join_frontline',
        text: '리우 협회의 돌격대에 합류하여 화염 전면전에 뛰어든다',
        description: '화상 위험이 높으나 막대한 전투 보수와 승급 평점을 얻습니다.',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
        costHp: 30,
        rewardAhn: 900,
      },
      {
        id: 'liu_support_logistics',
        text: '후방에서 부상병 후송과 소화(消火) 작업을 돕는다',
        description: '안전하게 협회 보수를 챙깁니다.',
        actionType: 'WORK',
        dangerLevel: 'LOW',
        rewardAhn: 300,
      },
    ],
  },

  // =========================================================================
  // 5. 초상 현상 & 내면의 각성 (뒤틀림, 카르멘, 신/망)
  // =========================================================================
  {
    id: 'distortion_alley_flower',
    category: 'DISTORTION_EGO',
    title: '골목의 뒤틀림(Distortion): 붉은 가시덤불의 탄생',
    description: '딸을 잃고 빚더미에 앉아 흐느끼던 골목의 약초상이 갑자기 가슴을 쥐어뜯으며 절규합니다. 그의 살점이 찢어지며 붉은 피를 머금은 거대한 가시덩굴과 눈알이 돋아나 주변 사람들을 옭아매기 시작합니다. 공기 중에 달콤하고 비릿한 향기가 진동합니다.',
    atmosphereQuote: '빛 속의 카르멘이 속삭였다. 더 이상 울지 마렴, 너 자신이 되는 거야.',
    choices: [
      {
        id: 'distortion_strike_core',
        text: '뒤틀림의 심장부(뿌리)를 향해 무기를 내리꽂는다 (합 판정)',
        description: '뒤틀림을 토벌하고 도시 악몽 급의 전리품을 획득합니다.',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
        costHp: 35,
        costSp: 15,
        rewardAhn: 1000,
      },
      {
        id: 'distortion_awaken_shin',
        text: '공포를 마주하며 신(心)의 오라를 전개해 사람들을 결계로 구출한다',
        description: '신념을 통해 신(心)과 망(望)의 파괴 고리를 한 단계 각성시킵니다!',
        actionType: 'TRAIN_SHIN',
        dangerLevel: 'HIGH',
      },
    ],
  },
  // =========================================================================
  // 6. 청소부의 밤 (03:13 ~ 04:34)
  // =========================================================================
  {
    id: 'night_sweeper_ambush',
    category: 'NIGHT_SWEEPER_TERROR',
    title: '03:13 뒷골목의 밤: 액체 인간 청소부의 살육',
    condition: { timeOfDays: ['NIGHT_SWEEPER'] },
    description: '사이렌이 울리며 도시의 빛이 꺼집니다. 등에 거대한 연료 탱크를 메고 뇌와 척추만을 보호복에 담은 청소부들이 갈고리를 쩔렁이며 쏟아져 나옵니다. 거주세 영수증이 없는 부랑민들이 갈고리에 꿰여 순식간에 액체 연료로 용해되어 탱크로 빨려 들어갑니다.',
    atmosphereQuote: '머리가 고안한 가장 완벽한 인구 청소 기제. 기록도, 증언도 금기다.',
    choices: [
      {
        id: 'sweeper_hide_safehouse',
        text: '합법 거주구역의 철문을 잠그고 방벽 뒤로 숨는다 (안전 확보)',
        description: '머리의 "거주구역 침입 금지" 금기 덕분에 청소부들이 문을 뜯지 못합니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
      {
        id: 'sweeper_counter_hook',
        text: '다가오는 청소부 첨병의 갈고리를 쳐내고 역습한다 (결사항전)',
        description: '청소부를 격퇴하고 그들의 액체 연료 농축액을 회수합니다.',
        actionType: 'COMBAT',
        dangerLevel: 'EXTREME',
        costHp: 40,
        rewardAhn: 1200,
      },
    ],
  },

  // =========================================================================
  // 7. 20구 T사 시간세 감사
  // =========================================================================
  {
    id: 'tcorp_tax_collector',
    category: 'TCORP_AUDIT',
    title: '20구 T사: 3등급 시간 징수관의 방문',
    condition: { districtIds: [20] },
    description: '황동 태엽과 톱니바퀴 모자를 쓴 T사 세무국 징수관들이 거대한 모래시계를 들고 나타났습니다. "당신의 시간 계좌 감사를 진행합니다. 체납된 시간이 있다면 즉시 신체의 시간을 압류하여 흑백 박제로 박제할 것입니다."',
    atmosphereQuote: '가난한 자는 4시간만 살고, 부유한 자는 100시간을 산다. 시간이야말로 진정한 화폐다.',
    choices: [
      {
        id: 'tcorp_pay_72h',
        text: '450안을 지불하고 72시간의 정규 시간을 충전한다',
        description: '시간세 기한이 연장되고 신체가 생기를 되찾습니다.',
        actionType: 'PAY_TIME_TAX',
        dangerLevel: 'LOW',
        costAhn: 450,
        rewardTimeHours: 72,
      },
      {
        id: 'tcorp_borrow_loan',
        text: '시간 사채업자에게 48시간의 고리대금 시간을 대출받는다',
        description: '당장의 동결을 면하지만 엄청난 빚을 지게 됩니다.',
        actionType: 'BORROW_TIME',
        dangerLevel: 'MEDIUM',
        rewardTimeHours: 48,
        costSp: 15,
      },
    ],
  },

  // =========================================================================
  // 8. 공방 무기 & 불법 강화 문신 시술
  // =========================================================================
  {
    id: 'workshop_illegal_tattoo',
    category: 'WORKSHOP_TATTOO',
    title: '흑운회풍 B등급 강화 문신 시술 제안',
    description: '어두운 공방 지하에서 문신 시술사가 짙은 먹구름과 붉은 번개가 이는 특수 도료를 보여줍니다. "몰락한 날개의 특허가 풀려 뒷골목으로 흘러나온 B등급 강화 문신이지. 살갗에 새기면 칼질 한 번에 먹구름과 화염이 실린다네. 단, 시술 부위를 노출해야만 기운이 뿜어져 나오지."',
    atmosphereQuote: '방어복을 입지 못하는 페널티를 감수하고라도 화력을 얻고자 하는 자들의 살육 도료.',
    choices: [
      {
        id: 'tattoo_apply_b_grade',
        text: '600안을 내고 오른팔에 B등급 화염 문신을 새긴다',
        description: '극심한 고통 속에 공격력이 대폭 상승합니다. (신체 고통 HP -15)',
        actionType: 'EVENT_CHOICE',
        dangerLevel: 'HIGH',
        costAhn: 600,
        costHp: 15,
      },
      {
        id: 'tattoo_refuse_pure_flesh',
        text: '피복을 포기할 수 없다며 거절한다',
        description: '안전하게 공방을 떠납니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
      },
    ],
  },

  // =========================================================================
  // 9. 머리의 금기 집행관 (Claw/발톱)의 그림자
  // =========================================================================
  {
    id: 'head_claw_purification',
    category: 'HEAD_TABOO',
    title: 'C사 처형자(Claw)의 탈세자 숙청 현장',
    description: '공기가 얼어붙듯 정적에 휩싸입니다. 육중한 생체 강화복을 입고 K사, R사, W사의 혈청 주사기를 몸에 꽂은 C사의 "발톱"이 허공을 찢고 나타나 거대 조직의 간부를 단 한 번의 손톱 휘두름으로 반 토막 내버립니다. "공방 특허 탈세 3회 누적 확인. 머리의 조율에 따라 즉결 처형을 집행함."',
    atmosphereQuote: '도시의 인간이 감히 대적할 수 없는 절대적 무력의 상징.',
    choices: [
      {
        id: 'claw_hide_breath',
        text: '숨소리조차 죽이고 콘크리트 바닥에 엎드린다 (절대적 은신)',
        description: '발톱이 목표를 수거하여 사라질 때까지 공포에 떱니다.',
        actionType: 'REST',
        dangerLevel: 'LOW',
        costSp: 25,
      },
      {
        id: 'claw_loot_remains',
        text: '발톱이 떠난 뒤 반 토막 난 조직 간부의 품에서 장부를 뒤진다',
        description: '위험하지만 거액의 비자금과 고급 공방 장비를 얻습니다.',
        actionType: 'EXPLORE',
        dangerLevel: 'EXTREME',
        rewardAhn: 1500,
      },
    ],
  },
];

