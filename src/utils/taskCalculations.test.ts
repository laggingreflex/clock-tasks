import { describe, it, expect } from 'vitest';
import {
  calculateTaskStats,
  getCurrentRunningTaskId,
  calculateTotalElapsedTime,
} from './taskCalculations';
import type { ClickEvent } from '../types';

describe('taskCalculations', () => {
  describe('calculateTaskStats', () => {
    it('should return zero stats for task with no clicks', () => {
      const result = calculateTaskStats('task1', [], Date.now());
      expect(result).toEqual({
        currentSessionTime: 0,
        lastSessionTime: 0,
        totalTime: 0,
      });
    });

    it('should calculate stats for single click', () => {
      const now = Date.now();
      const clickTime = now - 5000; // 5 seconds ago
      const history: ClickEvent[] = [{ taskId: 'task1', timestamp: clickTime }];

      const result = calculateTaskStats('task1', history, now);
      expect(result.currentSessionTime).toBe(5);
      expect(result.lastSessionTime).toBe(0);
      expect(result.totalTime).toBe(5);
    });

    it('should calculate stats for multiple clicks of same task', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 10000 },
        { taskId: 'task2', timestamp: now - 8000 },
        { taskId: 'task1', timestamp: now - 5000 },
      ];

      const result = calculateTaskStats('task1', history, now);
      // First click: 10s - 8s = 2s (until next click)
      // Second click: 5s - now (current session)
      expect(result.totalTime).toBe(7); // 2 + 5
      expect(result.currentSessionTime).toBe(5);
      expect(result.lastSessionTime).toBe(2);
    });

    it('should handle multiple task switches correctly', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 20000 },
        { taskId: 'task2', timestamp: now - 15000 },
        { taskId: 'task1', timestamp: now - 10000 },
        { taskId: 'task3', timestamp: now - 5000 },
      ];

      const result = calculateTaskStats('task1', history, now);
      // First click: 20s - 15s = 5s
      // Second click: 10s - 5s = 5s
      expect(result.totalTime).toBe(10);
      expect(result.currentSessionTime).toBe(5);
      expect(result.lastSessionTime).toBe(5);
    });

    it('should ignore other tasks in click history', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task2', timestamp: now - 20000 },
        { taskId: 'task1', timestamp: now - 15000 },
        { taskId: 'task2', timestamp: now - 10000 },
      ];

      const result = calculateTaskStats('task1', history, now);
      // task1 was clicked at now-15000, but immediately followed by task2 at now-10000
      // So task1 only ran for 5 seconds until the next task was clicked
      expect(result.totalTime).toBe(5);
      expect(result.currentSessionTime).toBe(5);
    });
  });

  describe('getCurrentRunningTaskId', () => {
    it('should return undefined for empty history', () => {
      const result = getCurrentRunningTaskId([]);
      expect(result).toBeUndefined();
    });

    it('should return most recent task id', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 10000 },
        { taskId: 'task2', timestamp: now - 5000 },
        { taskId: 'task3', timestamp: now - 1000 },
      ];

      const result = getCurrentRunningTaskId(history);
      expect(result).toBe('task3');
    });

    it('should return single task if only one click', () => {
      const history: ClickEvent[] = [{ taskId: 'task1', timestamp: Date.now() }];
      const result = getCurrentRunningTaskId(history);
      expect(result).toBe('task1');
    });
  });

  describe('calculateTotalElapsedTime', () => {
    it('should return 0 for empty task list', () => {
      const result = calculateTotalElapsedTime([]);
      expect(result).toBe(0);
    });

    it('should sum all task total times', () => {
      const tasks = [
        { totalTime: 10 },
        { totalTime: 20 },
        { totalTime: 30 },
      ];
      const result = calculateTotalElapsedTime(tasks);
      expect(result).toBe(60);
    });

    it('should handle tasks with zero time', () => {
      const tasks = [
        { totalTime: 0 },
        { totalTime: 50 },
        { totalTime: 0 },
      ];
      const result = calculateTotalElapsedTime(tasks);
      expect(result).toBe(50);
    });
  });
});
