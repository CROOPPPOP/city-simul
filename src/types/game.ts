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
  timeBalanceHours?: number; // T사 구역일 때의 시간 잔여량

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
  fixerGrade?: FixerGrade;
  colorTitle?: string; // 예: "검은 침묵", "비취 안개"
  association?: string; // 12협회 중 소속
  fingerInfo?: FingerHierarchy;

  // 인연 및 히로인
  relationships: RelationshipCharacter[];

  // 머리의 금기
  taboo: TabooViolation;
}

export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT_SWEEPER';

export interface GameState {
  year: number; // 도시력 (예: 984)
  day: number;
  timeOfDay: TimeOfDay;
  player: PlayerCharacter;
  logs: NarrativeLog[];
  currentChoices: ActionChoice[];
  isGameOver: boolean;
  gameOverReason?: string;
}

export interface ActionChoice {
  id: string;
  text: string;
  actionType: 'REST' | 'WORK' | 'EXPLORE' | 'COMBAT' | 'TRAIN_SHIN' | 'ROMANCE' | 'PAY_TAX' | 'CUSTOM';
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  costAhn?: number;
  costSp?: number;
  customPrompt?: string;
}

export interface NarrativeLog {
  id: string;
  day: number;
  timeOfDay: TimeOfDay;
  districtId: number;
  text: string;
  internalMonologue?: string;
  carmenWhisper?: string; // SP가 매우 낮을 때 카르멘이 건네는 유혹의 말
  eventTag?: string; // 예: "뒷골목의 밤", "신(心)의 태동", "엄지 카포의 심문"
}
