import { describe, it, expect } from 'vitest';
import { formatTime } from './timeFormatter';

describe('formatTime', () => {
  describe('seconds formatting', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(45)).toBe('45s');
    });

    it('should handle zero seconds', () => {
      expect(formatTime(0)).toBe('0s');
    });

    it('should handle 59 seconds (max before minutes)', () => {
      expect(formatTime(59)).toBe('59s');
    });
  });

  describe('minutes formatting', () => {
    it('should format minutes correctly', () => {
      expect(formatTime(150)).toBe('2.5m');
    });

    it('should handle edge case at 60 seconds', () => {
      expect(formatTime(60)).toBe('1.0m');
    });

    it('should handle 1 minute 30 seconds', () => {
      expect(formatTime(90)).toBe('1.5m');
    });

    it('should handle 59 minutes (max before hours)', () => {
      expect(formatTime(3540)).toBe('59.0m');
    });
  });

  describe('hours formatting', () => {
    it('should format hours correctly', () => {
      expect(formatTime(4680)).toBe('1.3h');
    });

    it('should handle edge case at 3600 seconds (1 hour)', () => {
      expect(formatTime(3600)).toBe('1.0h');
    });

    it('should handle 23 hours', () => {
      expect(formatTime(82800)).toBe('23.0h');
    });

    it('should handle 23.9 hours (max before days)', () => {
      expect(formatTime(86040)).toBe('23.9h');
    });
  });

  describe('days formatting', () => {
    it('should format days correctly', () => {
      expect(formatTime(432000)).toBe('5.0d');
    });

    it('should handle edge case at 86400 seconds (1 day)', () => {
      expect(formatTime(86400)).toBe('1.0d');
    });

    it('should handle 6.9 days (max before weeks)', () => {
      expect(formatTime(600000)).toBe('6.9d');
    });
  });

  describe('weeks formatting', () => {
    it('should format weeks correctly', () => {
      expect(formatTime(1209600)).toBe('2.0w');
    });

    it('should handle edge case at 1 week', () => {
      expect(formatTime(604800)).toBe('1.0w');
    });

    it('should handle 4.2 weeks (max before months)', () => {
      expect(formatTime(2534400)).toBe('4.2w');
    });
  });

  describe('months formatting', () => {
    it('should format months correctly', () => {
      const thirtyDaysInSeconds = 30.44 * 86400;
      const twoMonths = Math.floor(thirtyDaysInSeconds * 2);
      const result = formatTime(twoMonths);
      expect(result).toMatch(/\d+\.\d+mo/);
    });

    it('should handle edge case at 1 month', () => {
      const oneMonthInSeconds = Math.floor(30.44 * 86400);
      const result = formatTime(oneMonthInSeconds);
      expect(result).toMatch(/1\.\d+mo/);
    });

    it('should handle 11.9 months (max before years)', () => {
      const almostOneYear = Math.floor(365.25 * 86400 * 0.99);
      const result = formatTime(almostOneYear);
      expect(result).toMatch(/mo$/);
    });
  });

  describe('years formatting', () => {
    it('should format years correctly', () => {
      const oneYear = Math.floor(365.25 * 86400 * 1.2);
      const result = formatTime(oneYear);
      expect(result).toMatch(/1\.\d+y/);
    });

    it('should handle multiple years', () => {
      const twoYears = Math.floor(365.25 * 86400 * 2);
      const result = formatTime(twoYears);
      expect(result).toMatch(/2\.\d+y/);
    });

    it('should handle large time spans', () => {
      const tenYears = Math.floor(365.25 * 86400 * 10);
      const result = formatTime(tenYears);
      expect(result).toMatch(/10\.\d+y/);
    });
  });

  describe('decimal precision', () => {
    it('should always show one decimal place', () => {
      expect(formatTime(60).endsWith('.0m')).toBe(true);
      expect(formatTime(3600).endsWith('.0h')).toBe(true);
    });

    it('should round decimal correctly for minutes', () => {
      expect(formatTime(150)).toBe('2.5m');
      expect(formatTime(180)).toBe('3.0m');
    });
  });
});
