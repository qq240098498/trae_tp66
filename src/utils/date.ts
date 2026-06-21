import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('HH:mm:ss');
};

export const getToday = (): string => {
  return dayjs().format('YYYY-MM-DD');
};

export const isToday = (date: string | Date): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};

export const getDateRange = (days: number): { start: string; end: string } => {
  return {
    start: dayjs().subtract(days, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  };
};

export { dayjs };
