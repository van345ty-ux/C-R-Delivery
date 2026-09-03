import type { OperatingHour } from '../types';

const storeClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function secondsOfDay(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?$/.exec(time);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0) : null;
}

export function getStoreStatus(hours: OperatingHour[], city: string, now = new Date()) {
  const parts = storeClock.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '';
  const day = weekdays.indexOf(part('weekday'));
  const currentTime = Number(part('hour')) * 3600 + Number(part('minute')) * 60 + Number(part('second'));
  const today = hours.find(h => h.day_of_week === day);
  const yesterday = hours.find(h => h.day_of_week === (day + 6) % 7);

  const isOpen = (schedule: OperatingHour | undefined, previousDay = false) => {
    if (!schedule?.is_open) return false;
    const open = secondsOfDay(schedule.open_time);
    const close = secondsOfDay(schedule.close_time);
    if (open === null || close === null || open === close) return false;
    if (previousDay) return open > close && currentTime < close;
    return open < close ? currentTime >= open && currentTime < close : currentTime >= open;
  };

  const isStoreOpen = isOpen(today) || isOpen(yesterday, true);
  const isComandatuba = city.toLowerCase().includes('comandatuba');
  return {
    isStoreOpen,
    canPlaceOrder: isStoreOpen || isComandatuba,
    showPreOrderBanner: isComandatuba,
  };
}
