import type { TimeSpeed, TimeOfDay } from '../types/game';

export interface TimeTickResult {
  minutePassed: boolean;
  hourPassed: boolean;
  dayPassed: boolean;
  monthPassed: boolean;
  yearPassed: boolean;
  timeOfDayChanged: boolean;
  newTimeOfDay: TimeOfDay;
  newYear: number;
  newMonth: number;
  newDay: number;
  newHour: number;
  newMinute: number;
  formattedTime: string; // 예: "08:30"
  dayProgress: number; // 0.0 ~ 1.0 (24시간 중 진행률)
  monthProgress: number; // 0.0 ~ 1.0 (월 진행률)
  shouldPrefetchNextMonth: boolean;
}

export class TimeKeeper {
  // 현실 1초(1000ms) = 인게임 1분
  // 현실 1분(60초) = 인게임 1시간 (1분 = 1시간)
  // 현실 24분 = 인게임 1일(24시간)
  public static readonly MS_PER_INGAME_MINUTE = 1000;
  public static readonly MINUTES_PER_HOUR = 60;
  public static readonly HOURS_PER_DAY = 24;
  public static readonly DAYS_PER_MONTH = 30;
  public static readonly MONTHS_PER_YEAR = 12;

  private accumulatedMinuteMs: number = 0;

  constructor() {
    this.accumulatedMinuteMs = 0;
  }

  public reset(_progress = 0) {
    this.accumulatedMinuteMs = 0;
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
   * 시/분에 따른 프문 세계관 정확한 시간대 판정
   * 뒷골목의 밤: 매일 03:13 ~ 04:34 (81분간 초법적 살육의 시간)
   */
  public static getTimeOfDay(hour: number, minute: number): TimeOfDay {
    const totalMinutes = hour * 60 + minute;
    const sweeperStart = 3 * 60 + 13; // 03:13 (193분)
    const sweeperEnd = 4 * 60 + 34;   // 04:34 (274분)

    if (totalMinutes >= sweeperStart && totalMinutes <= sweeperEnd) {
      return 'NIGHT_SWEEPER';
    }
    if (totalMinutes < sweeperStart) {
      return 'MIDNIGHT'; // 00:00 ~ 03:12
    }
    if (totalMinutes < 8 * 60) {
      return 'DAWN'; // 04:35 ~ 07:59
    }
    if (totalMinutes < 12 * 60) {
      return 'MORNING'; // 08:00 ~ 11:59
    }
    if (totalMinutes < 18 * 60) {
      return 'AFTERNOON'; // 12:00 ~ 17:59
    }
    return 'EVENING'; // 18:00 ~ 23:59
  }

  /**
   * 시간 포맷팅 헬퍼 (HH:MM)
   */
  public static formatTime(hour: number, minute: number): string {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /**
   * Delta time 기반 정밀 시간 진행 계산
   */
  public tick(
    deltaMs: number,
    speed: TimeSpeed,
    currentYear: number,
    currentMonth: number,
    currentDay: number,
    currentHour: number,
    currentMinute: number,
    currentTimeOfDay: TimeOfDay
  ): TimeTickResult {
    const multiplier = this.getSpeedMultiplier(speed);

    let newMinute = currentMinute;
    let newHour = currentHour;
    let newDay = currentDay;
    let newMonth = currentMonth;
    let newYear = currentYear;

    let minutePassed = false;
    let hourPassed = false;
    let dayPassed = false;
    let monthPassed = false;
    let yearPassed = false;

    if (multiplier > 0 && deltaMs > 0) {
      this.accumulatedMinuteMs += deltaMs * multiplier;

      while (this.accumulatedMinuteMs >= TimeKeeper.MS_PER_INGAME_MINUTE) {
        this.accumulatedMinuteMs -= TimeKeeper.MS_PER_INGAME_MINUTE;
        minutePassed = true;
        newMinute += 1;

        if (newMinute >= TimeKeeper.MINUTES_PER_HOUR) {
          newMinute = 0;
          hourPassed = true;
          newHour += 1;

          if (newHour >= TimeKeeper.HOURS_PER_DAY) {
            newHour = 0;
            dayPassed = true;
            newDay += 1;

            if (newDay > TimeKeeper.DAYS_PER_MONTH) {
              newDay = 1;
              monthPassed = true;
              newMonth += 1;

              if (newMonth > TimeKeeper.MONTHS_PER_YEAR) {
                newMonth = 1;
                yearPassed = true;
                newYear += 1;
              }
            }
          }
        }
      }
    }

    const newTimeOfDay = TimeKeeper.getTimeOfDay(newHour, newMinute);
    const timeOfDayChanged = newTimeOfDay !== currentTimeOfDay;
    const formattedTime = TimeKeeper.formatTime(newHour, newMinute);

    const dayProgress = (newHour * 60 + newMinute) / (24 * 60);
    const monthProgress = ((newDay - 1) + dayProgress) / TimeKeeper.DAYS_PER_MONTH;

    return {
      minutePassed,
      hourPassed,
      dayPassed,
      monthPassed,
      yearPassed,
      timeOfDayChanged,
      newTimeOfDay,
      newYear,
      newMonth,
      newDay,
      newHour,
      newMinute,
      formattedTime,
      dayProgress,
      monthProgress,
      shouldPrefetchNextMonth: monthProgress >= 0.85,
    };
  }
}
