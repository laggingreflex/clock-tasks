import { describe, it, expect } from 'vitest';
import { formatTime } from './timeFormatter';

describe('formatTime', () => {
  it('should format seconds correctly', () => {
    expect(formatTime(45)).toBe('45s');
  });

  it('should format minutes correctly', () => {
    expect(formatTime(150)).toBe('2.5m');
  });

  it('should format hours correctly', () => {
    expect(formatTime(4680)).toBe('1.3h');
  });

  it('should format days correctly', () => {
    expect(formatTime(432000)).toBe('5.0d');
  });

  it('should handle edge case at 60 seconds', () => {
    expect(formatTime(60)).toBe('1.0m');
  });

  it('should handle edge case at 3600 seconds (1 hour)', () => {
    expect(formatTime(3600)).toBe('1.0h');
  });
});
