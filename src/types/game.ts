export type Gender = 'male' | 'female' | 'other';

export type DistrictDirection = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTRAL';

export interface DistrictInfo {
  id: number;
  wingName: string; // 예: "T사 (Time Track)"
  singularity: string; // 특이점 요약
  direction: DistrictDirection;
  nestCulture: string; // 둥지 문화
  backstreetCulture: string; // 뒷골목 생태계
  dangerLevel: 'SAFE' | 'RUMOR' | 'URBAN_MYTH' | 'URBAN_LEGEND' | 'URBAN_PLAGUE' | 'URBAN_NIGHTMARE' | 'STAR_OF_CITY';
  tabooHint: string; // 머리 및 구역 고유 금기
}

export type BodyPartStatus = 'healthy' | 'damaged' | 'severed' | 'prosthetic_basic' | 'prosthetic_highgrade';

export interface BodyParts {
  head: BodyPartStatus;
  torso: BodyPartStatus;
  leftArm: BodyPartStatus;
  rightArm: BodyPartStatus;
  leftLeg: BodyPartStatus;
  rightLeg: BodyPartStatus;
}

export type TattooGrade = 'NONE' | 'D' | 'C' | 'B' | 'A';

export interface TattooInfo {
  grade: TattooGrade;
  name: string;
  effectDescription: string;
  sideEffectPenalty: number; // D등급의 신체 부작용 등
}

export type FactionPath = 'FIXER' | 'FINGERS' | 'WING_FEATHER' | 'WANDERER';

export type FixerGrade = 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 'COLOR';

export type FingerFaction = 'THUMB' | 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY';

export interface FingerHierarchy {
  faction: FingerFaction;
  rank: string; // 예: 엄지(솔다토, 카포, 언더보스), 약지(스튜던트, 도슨트, 마에스트로)
  codeOfConduct: string;
}

export type RelationshipType = 'stranger' | 'acquaintance' | 'ally' | 'vow_partner' | 'lover' | 'tragic_lost';

export interface RelationshipCharacter {
  id: string;
  name: string;
  gender: Gender;
  title: string; // 예: "츠바이 6과 견습 검사", "버터거리의 재봉사", "약지 스튜던트"
  districtId: number;
  affection: number; // 호감도 0 ~ 100
  dependence: number; // 의존도/신뢰도 0 ~ 100
  type: RelationshipType;
  status: 'alive' | 'in_danger' | 'captured' | 'distorted' | 'dead';
  backstory: string;
  currentCrisis?: string; // 예: "거주세 체납으로 뒷골목의 밤에 쫓겨날 위기"
}

export interface TabooViolation {
  ai_violation: number; // 인공지능 자의식 부여
  clone_7days: number; // 복제인간 7일 초과
  dwelling_invasion: number; // 거주구역 침입/파괴
  firearm_tax_evasion: number; // 총기/공방 세금 탈루
  impurityLevel: number; // 불순물 판정 게이지 (100 도달 시 발톱/조율자 강림)
}

export interface PlayerCharacter {
  name: string;
  gender: Gender;
  age: number;
  birthDistrictId: number;
  isNestBorn: boolean; // true: 둥지 깃털 출신, false: 뒷골목 출신
  currentDistrictId: number;
  isInsideNest: boolean;

  // 자원
  ahn: number; // 화폐 (안)
  housingTaxDaysLeft: number; // 합법 거주구역 거주세 남은 일수 (0이면 쫓겨나서 뒷골목의 밤에 노출)
  timeBalanceHours?: number; // T사 구역일 때의 시간 잔여량 (시간세 및 활동용)
  timeTaxDueDays?: number; // T사 시간세 납부 기한(일)
  isTimeFrozen?: boolean; // T사 시간 체납으로 인한 흑백 동결/지연 상태

  // 신체 및 개조
  hp: number;
  maxHp: number;
  bodyParts: BodyParts;
  prostheticsRatio: number; // 0 ~ 100% (높을수록 N사 이단심문관의 타겟 위험도 상승)
  tattoo: TattooInfo;
  weapon: {
    name: string;
    workshop: string; // 예: "로직 아틀리에", "랑아 공방", "자작 무기"
    damage: number;
    description: string;
  };

  // 정신 및 이능력 (신과 망)
  sp: number; // -45 ~ +45 (0 미만: 불안, -30 이하: 패닉 및 카르멘의 속삭임 환청)
  hasShin: boolean; // 신(心) 습득 여부 (처음엔 false)
  shinActive: boolean; // 신 활성화 상태 (SP 소모하여 능력치 강화)
  mangLevel: number; // 망(望) 단계 (0 ~ 5)
  egoProgress: number; // 0 ~ 100 (E.G.O 개화 진행도)
  distortionProgress: number; // 0 ~ 100 (뒤틀림 침식도)

  // 사회적 신분
  path: FactionPath;
  growthStage: 'CHILD' | 'ADOLESCENT' | 'ADULT'; // 유소년(8~12세), 소년기(13~16세), 성인(17세 이상)
  fixerGrade?: FixerGrade;
  colorTitle?: string; // 예: "검은 침묵", "비취 안개"
  association?: string; // 12협회 중 소속
  fingerInfo?: FingerHierarchy;

  // 인연 및 히로인
  relationships: RelationshipCharacter[];

  // 머리의 금기
  taboo: TabooViolation;
}

export type TimeOfDay =
  | 'DAWN'          // 04:35 ~ 07:59 (새벽/해돋이)
  | 'MORNING'       // 08:00 ~ 11:59 (오전)
  | 'AFTERNOON'     // 12:00 ~ 17:59 (오후)
  | 'EVENING'       // 18:00 ~ 23:59 (저녁)
  | 'MIDNIGHT'      // 00:00 ~ 03:12 (심야)
  | 'NIGHT_SWEEPER';// 03:13 ~ 04:34 (뒷골목의 밤 청소부)

export type TimeSpeed = 'PAUSED' | '1X' | '2X' | '4X';

export type EncounterCategory =
  | 'RELATIONSHIP_DISCOVERY' // 인연/동료 조우
  | 'TCORP_AUDIT'           // T사 시간세 감사/시간 거래
  | 'NIGHT_SWEEPER_TERROR'  // 뒷골목의 밤 청소부 (03:13 ~ 04:34)
  | 'DISTRICT_SINGULARITY'  // 26개 구역 날개 특이점 (F사 요정, G사 벌레, K사 앰플, N사 못과망치, W사 워프 등)
  | 'FIXER_ASSOCIATION'     // 12협회 사건/의뢰 (츠바이, 리우, 시, 제뱌찌, 디에치, 트레스 등)
  | 'FINGER_SYNDICATE'      // 다섯 손가락 (엄지, 검지, 중지, 약지, 소지)
  | 'WORKSHOP_TATTOO'       // 공방 무기 & 강화 문신 & 의체 개조
  | 'DISTORTION_EGO'        // 뒤틀림, 카르멘의 속삭임, 개화 에고, 신(心)과 망(望)
  | 'HEAD_TABOO'            // 머리의 절대 금기 감시
  | 'STREET_SURVIVAL'       // 골목 생존, 배급, 구걸, 도둑질 (유소년 특화)
  | 'STREET_COMBAT';        // 골목 칼부림 / 합(Clash)

export interface ActiveEncounter {
  id: string;
  category: EncounterCategory;
  title: string;
  description: string;
  atmosphereQuote?: string;
  carmenWhisper?: string;
  choices: ActionChoice[];
  discoveredNpc?: RelationshipCharacter; // 조우한 인연 캐릭터 (선택 시 영입 가능)
}

export interface ActionChoice {
  id: string;
  text: string;
  description?: string;
  actionType:
    | 'REST'
    | 'WORK'
    | 'EXPLORE'
    | 'COMBAT'
    | 'TRAIN_SHIN'
    | 'ROMANCE'
    | 'PAY_TAX'
    | 'PAY_TIME_TAX'
    | 'BORROW_TIME'
    | 'BUY_TIME'
    | 'CUSTOM'
    | 'EVENT_CHOICE'
    | 'RECRUIT_RELATIONSHIP'
    | 'SCAVENGE'
    | 'STUDY';
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  costAhn?: number;
  costSp?: number;
  costHp?: number;
  costTimeHours?: number; // T사 시간 소모
  rewardTimeHours?: number; // T사 시간 획득
  rewardAhn?: number;
  recruitCharacter?: RelationshipCharacter; // 이 선택지를 고르면 인연으로 등록
  customPrompt?: string;
}

export interface MonthlySituation {
  month: number;
  year: number;
  title: string;
  loreDescription: string;
  atmosphere: string;
  urgency: 'NORMAL' | 'CRISIS' | 'OPPORTUNITY';
  carmenWhisper?: string;
  choices: ActionChoice[];
}

export interface GameState {
  year: number; // 도시력 (예: 984)
  month: number; // 1 ~ 12월
  day: number; // 1 ~ 30일
  hour: number; // 0 ~ 23시 (1분 = 1시간 정밀 시계)
  minute: number; // 0 ~ 59분
  timeOfDay: TimeOfDay;
  timeSpeed: TimeSpeed;
  previousTimeSpeed?: TimeSpeed; // 스페이스바 재개용 이전 속도
  dayProgress: number; // 0.0 ~ 1.0 (하루 24시간 중 진행률)
  monthProgress: number; // 0.0 ~ 1.0 (월 진행률)
  isAutoPaused: boolean;
  player: PlayerCharacter;
  logs: NarrativeLog[];
  currentChoices: ActionChoice[];
  activeEncounter: ActiveEncounter | null; // 현재 발생한 돌발 인카운터
  pendingSituation: MonthlySituation | null;
  isGameOver: boolean;
  gameOverReason?: string;
}

export interface NarrativeLog {
  id: string;
  year?: number;
  month?: number;
  day: number;
  hour?: number;
  minute?: number;
  timeOfDay: TimeOfDay;
  districtId: number;
  text: string;
  internalMonologue?: string;
  carmenWhisper?: string; // SP가 매우 낮을 때 카르멘이 건네는 유혹의 말
  eventTag?: string; // 예: "뒷골목의 밤", "T사 시간세 징수", "신(心)의 태동", "엄지 카포의 심문"
}
