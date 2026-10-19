import type { TimeSpeed, TimeOfDay } from '../types/game';

export interface TimeTickResult {
  dayPassed: boolean;
  timeOfDayChanged: boolean;
  monthPassed: boolean;
  newTimeOfDay: TimeOfDay;
  newDay: number;
  newMonth: number;
  newYear: number;
  monthProgress: number; // 0.0 ~ 1.0
  shouldPrefetchNextMonth: boolean; // 80% 이상 진행 시 true
}

export class TimeKeeper {
  // 60초 = 1달, 1달 = 30일 -> 1일 = 2초(2000ms)
  public static readonly MS_PER_MONTH = 60000;
  public static readonly DAYS_PER_MONTH = 30;
  public static readonly MS_PER_DAY = TimeKeeper.MS_PER_MONTH / TimeKeeper.DAYS_PER_MONTH; // 2000ms
  public static readonly MS_PER_PHASE = TimeKeeper.MS_PER_DAY / 4; // 500ms per MORNING, AFTERNOON, EVENING, NIGHT_SWEEPER

  private accumulatedMonthMs: number = 0;
  private prefetchTriggeredThisMonth: boolean = false;

  constructor(initialMonthProgress = 0) {
    this.accumulatedMonthMs = initialMonthProgress * TimeKeeper.MS_PER_MONTH;
  }

  public reset(monthProgress = 0) {
    this.accumulatedMonthMs = monthProgress * TimeKeeper.MS_PER_MONTH;
    this.prefetchTriggeredThisMonth = false;
  }

  public getSpeedMultiplier(speed: TimeSpeed): number {
    switch (speed) {
      case 'PAUSED':
        return 0;
      case '1X':
        return 1;
      case '2X':
        return 2;
      case '4X':
        return 4;
      default:
        return 1;
    }
  }

  /**
   * Delta time 기반 시간 진행 계산
   * @param deltaMs 실제 경과 밀리초
   * @param speed 현재 배속
   * @param currentYear 현재 연도
   * @param currentMonth 현재 월 (1~12)
   * @param currentDay 현재 일 (1~30)
   * @param currentTimeOfDay 현재 시간대
   */
  public tick(
    deltaMs: number,
    speed: TimeSpeed,
    currentYear: number,
    currentMonth: number,
    currentDay: number,
    currentTimeOfDay: TimeOfDay
  ): TimeTickResult {
    const multiplier = this.getSpeedMultiplier(speed);
    if (multiplier === 0 || deltaMs <= 0) {
      const monthProgress = Math.min(0.999, this.accumulatedMonthMs / TimeKeeper.MS_PER_MONTH);
      return {
        dayPassed: false,
        timeOfDayChanged: false,
        monthPassed: false,
        newTimeOfDay: currentTimeOfDay,
        newDay: currentDay,
        newMonth: currentMonth,
        newYear: currentYear,
        monthProgress,
        shouldPrefetchNextMonth: false,
      };
    }

    const effectiveDelta = deltaMs * multiplier;
    this.accumulatedMonthMs += effectiveDelta;

    let monthPassed = false;
    let newYear = currentYear;
    let newMonth = currentMonth;

    if (this.accumulatedMonthMs >= TimeKeeper.MS_PER_MONTH) {
      monthPassed = true;
      this.accumulatedMonthMs %= TimeKeeper.MS_PER_MONTH;
      this.prefetchTriggeredThisMonth = false;

      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    }

    const monthProgress = Math.min(0.999, this.accumulatedMonthMs / TimeKeeper.MS_PER_MONTH);

    // 80% 진행 시 다음 달 서사/선택지 사전 요청 신호
    let shouldPrefetchNextMonth = false;
    if (monthProgress >= 0.8 && !this.prefetchTriggeredThisMonth) {
      shouldPrefetchNextMonth = true;
      this.prefetchTriggeredThisMonth = true;
    }

    // 일(Day) 및 시간대(TimeOfDay) 산출
    // 한 달(30일) 중 현재 일차 계산 (1 ~ 30)
    const exactDayFloat = (this.accumulatedMonthMs / TimeKeeper.MS_PER_DAY);
    const calculatedDay = Math.min(30, Math.floor(exactDayFloat) + 1);
    const dayPassed = calculatedDay !== currentDay || monthPassed;

    // 하루 내 시간대(TimeOfDay) 산출 (0 ~ 1999ms)
    const msInDay = this.accumulatedMonthMs % TimeKeeper.MS_PER_DAY;
    const phaseIndex = Math.floor(msInDay / TimeKeeper.MS_PER_PHASE);
    const phases: TimeOfDay[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT_SWEEPER'];
    const newTimeOfDay = phases[Math.min(3, phaseIndex)];
    const timeOfDayChanged = newTimeOfDay !== currentTimeOfDay;

    return {
      dayPassed,
      timeOfDayChanged,
      monthPassed,
      newTimeOfDay,
      newDay: calculatedDay,
      newMonth,
      newYear,
      monthProgress,
      shouldPrefetchNextMonth,
    };
  }
}
