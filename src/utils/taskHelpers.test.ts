import { describe, it, expect } from 'vitest';
import {
  taskDataToTask,
  convertTaskDataList,
  calculateTaskPercentage,
} from './taskHelpers';
import type { TaskData, ClickEvent } from '../types';

describe('taskHelpers', () => {
  describe('taskDataToTask', () => {
    it('should convert task data to task with no running status', () => {
      const taskData: TaskData = { id: 'task1', name: 'Test Task' };
      const history: ClickEvent[] = [];
      const now = Date.now();

      const result = taskDataToTask(taskData, history, now);

      expect(result.id).toBe('task1');
      expect(result.name).toBe('Test Task');
      expect(result.isRunning).toBe(false);
      expect(result.currentSessionTime).toBe(0);
      expect(result.lastSessionTime).toBe(0);
      expect(result.totalTime).toBe(0);
    });

    it('should mark task as running if it is the most recent click', () => {
      const taskData: TaskData = { id: 'task1', name: 'Test Task' };
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 5000 },
      ];

      const result = taskDataToTask(taskData, history, now);

      expect(result.isRunning).toBe(true);
      expect(result.currentSessionTime).toBe(5);
    });

    it('should set last session time when task is not running', () => {
      const taskData: TaskData = { id: 'task1', name: 'Test Task' };
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 15000 },
        { taskId: 'task2', timestamp: now - 10000 },
        { taskId: 'task1', timestamp: now - 5000 },
        { taskId: 'task2', timestamp: now - 1000 },
      ];

      const result = taskDataToTask(taskData, history, now);

      expect(result.isRunning).toBe(false);
      // task1's second session was 5 seconds (from now-5000 to now-1000 when task2 was clicked)
      // But since task2 is currently running, task1's lastSessionTime should be 5
      expect(result.lastSessionTime).toBe(5);
      expect(result.currentSessionTime).toBe(0);
    });

    it('should calculate total time correctly', () => {
      const taskData: TaskData = { id: 'task1', name: 'Test Task' };
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 15000 },
        { taskId: 'task2', timestamp: now - 10000 },
        { taskId: 'task1', timestamp: now - 5000 },
      ];

      const result = taskDataToTask(taskData, history, now);

      expect(result.totalTime).toBe(10); // 5 + 5
    });
  });

  describe('convertTaskDataList', () => {
    it('should convert empty list', () => {
      const result = convertTaskDataList([], [], Date.now());
      expect(result).toEqual([]);
    });

    it('should convert multiple tasks', () => {
      const taskDataList: TaskData[] = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 10000 },
        { taskId: 'task2', timestamp: now - 5000 },
      ];

      const result = convertTaskDataList(taskDataList, history, now);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task1');
      expect(result[1].id).toBe('task2');
      expect(result[1].isRunning).toBe(true);
      expect(result[0].isRunning).toBe(false);
    });

    it('should preserve task order', () => {
      const taskDataList: TaskData[] = [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ];

      const result = convertTaskDataList(taskDataList, [], Date.now());

      expect(result.map(t => t.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('calculateTaskPercentage', () => {
    it('should return 0 when grand total is 0', () => {
      const result = calculateTaskPercentage(10, 0);
      expect(result).toBe('0');
    });

    it('should calculate correct percentage', () => {
      const result = calculateTaskPercentage(25, 100);
      expect(result).toBe('25.0');
    });

    it('should round to 1 decimal place', () => {
      const result = calculateTaskPercentage(33, 100);
      expect(result).toBe('33.0');
    });

    it('should handle decimal results', () => {
      const result = calculateTaskPercentage(1, 3);
      expect(result).toBe('33.3');
    });

    it('should handle small percentages', () => {
      const result = calculateTaskPercentage(1, 1000);
      expect(result).toBe('0.1');
    });

    it('should handle 100 percent', () => {
      const result = calculateTaskPercentage(100, 100);
      expect(result).toBe('100.0');
    });
  });
});
