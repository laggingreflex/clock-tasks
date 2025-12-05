import { describe, it, expect, vi } from 'vitest';
import {
  calculateTaskStats,
  getCurrentRunningTaskId,
  calculateTotalElapsedTime,
  taskDataToTask,
  convertTaskDataList,
  calculateTaskPercentage,
} from './calculations';
import type { ClickEvent, TaskData } from './types';

describe('calculateTaskStats', () => {
  describe('basic calculations', () => {
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
      const clickTime = now - 5000;
      const history: ClickEvent[] = [{ taskId: 'task1', timestamp: clickTime }];

      const result = calculateTaskStats('task1', history, now);

      expect(result.currentSessionTime).toBe(5);
      expect(result.lastSessionTime).toBe(0);
      expect(result.totalTime).toBe(5);
    });

    it('should calculate stats for multiple sessions of same task', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 20000 },
        { taskId: 'task2', timestamp: now - 15000 },
        { taskId: 'task1', timestamp: now - 10000 },
      ];

      const result = calculateTaskStats('task1', history, now);

      expect(result.totalTime).toBe(15); // 5 + 10
      expect(result.currentSessionTime).toBe(10);
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

      expect(result.totalTime).toBe(5);
      expect(result.currentSessionTime).toBe(5);
    });
  });

  describe('multiple task switches', () => {
    it('should handle interleaved task switches correctly', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 30000 },
        { taskId: 'task2', timestamp: now - 20000 },
        { taskId: 'task1', timestamp: now - 15000 },
        { taskId: 'task3', timestamp: now - 5000 },
      ];

      const result = calculateTaskStats('task1', history, now);

      // First session: 30s - 20s = 10s
      // Second session: 15s - 5s = 10s
      expect(result.totalTime).toBe(20);
      expect(result.currentSessionTime).toBe(10);
      expect(result.lastSessionTime).toBe(10);
    });

    it('should handle task resumed after pause', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 30000 },
        { taskId: 'task2', timestamp: now - 20000 },
        { taskId: 'task3', timestamp: now - 15000 },
        { taskId: 'task1', timestamp: now - 10000 },
      ];

      const result = calculateTaskStats('task1', history, now);

      // First session: 30s - 20s = 10s
      // Second session: 10s - now = 10s
      expect(result.totalTime).toBe(20);
      expect(result.currentSessionTime).toBe(10);
      expect(result.lastSessionTime).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle very short sessions', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 1000 },
        { taskId: 'task2', timestamp: now - 999 },
      ];

      const result = calculateTaskStats('task1', history, now);

      expect(result.totalTime).toBe(0); // Rounds down
      expect(result.currentSessionTime).toBe(0);
    });

    it('should handle exactly 1 second', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 1000 },
        { taskId: 'task2', timestamp: now },
      ];

      const result = calculateTaskStats('task1', history, now);

      expect(result.currentSessionTime).toBe(1);
    });

    it('should handle very long sessions', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 86400000 }, // 24 hours
      ];

      const result = calculateTaskStats('task1', history, now);

      expect(result.currentSessionTime).toBe(86400);
    });

    it('should handle fractional seconds correctly (floor)', () => {
      const now = Date.now();
      const history: ClickEvent[] = [
        { taskId: 'task1', timestamp: now - 5500 },
        { taskId: 'task2', timestamp: now },
      ];

      const result = calculateTaskStats('task1', history, now);

      expect(result.currentSessionTime).toBe(5); // Should floor, not round
    });
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

  it('should return most recent even if same task repeated', () => {
    const now = Date.now();
    const history: ClickEvent[] = [
      { taskId: 'task1', timestamp: now - 10000 },
      { taskId: 'task1', timestamp: now - 5000 },
      { taskId: 'task1', timestamp: now - 1000 },
    ];

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

  it('should handle large numbers', () => {
    const tasks = [
      { totalTime: 1000000 },
      { totalTime: 2000000 },
      { totalTime: 3000000 },
    ];

    const result = calculateTotalElapsedTime(tasks);

    expect(result).toBe(6000000);
  });

  it('should handle single task', () => {
    const tasks = [{ totalTime: 42 }];

    const result = calculateTotalElapsedTime(tasks);

    expect(result).toBe(42);
  });
});

describe('taskDataToTask', () => {
  const now = Date.now();

  it('should convert task data with no running status', () => {
    const taskData: TaskData = { id: 'task1', name: 'Test Task' };
    const clickHistory: ClickEvent[] = [];

    const result = taskDataToTask(taskData, clickHistory, now);

    expect(result.id).toBe('task1');
    expect(result.name).toBe('Test Task');
    expect(result.isRunning).toBe(false);
    expect(result.currentSessionTime).toBe(0);
    expect(result.lastSessionTime).toBe(0);
    expect(result.totalTime).toBe(0);
  });

  it('should mark task as running if most recent click', () => {
    const taskData: TaskData = { id: 'task1', name: 'Test Task' };
    const clickHistory: ClickEvent[] = [
      { taskId: 'task1', timestamp: now - 5000 },
    ];

    const result = taskDataToTask(taskData, clickHistory, now);

    expect(result.isRunning).toBe(true);
    expect(result.currentSessionTime).toBe(5);
  });

  it('should set last session time when task is not running', () => {
    const taskData: TaskData = { id: 'task1', name: 'Test Task' };
    const clickHistory: ClickEvent[] = [
      { taskId: 'task1', timestamp: now - 15000 },
      { taskId: 'task2', timestamp: now - 10000 },
      { taskId: 'task1', timestamp: now - 5000 },
      { taskId: 'task2', timestamp: now - 1000 },
    ];

    const result = taskDataToTask(taskData, clickHistory, now);

    expect(result.isRunning).toBe(false);
    expect(result.lastSessionTime).toBe(5);
    expect(result.currentSessionTime).toBe(0);
  });

  it('should calculate total time correctly', () => {
    const taskData: TaskData = { id: 'task1', name: 'Test Task' };
    const clickHistory: ClickEvent[] = [
      { taskId: 'task1', timestamp: now - 20000 },
      { taskId: 'task2', timestamp: now - 15000 },
      { taskId: 'task1', timestamp: now - 10000 },
    ];

    const result = taskDataToTask(taskData, clickHistory, now);

    expect(result.totalTime).toBe(15); // 5 + 10
  });

  it('should preserve task properties', () => {
    const taskData: TaskData = { id: 'unique-id', name: 'My Task Name' };
    const clickHistory: ClickEvent[] = [];

    const result = taskDataToTask(taskData, clickHistory, now);

    expect(result.id).toBe('unique-id');
    expect(result.name).toBe('My Task Name');
  });
});

describe('convertTaskDataList', () => {
  const now = Date.now();

  it('should convert empty list', () => {
    const result = convertTaskDataList([], [], now);
    expect(result).toEqual([]);
  });

  it('should convert multiple tasks', () => {
    const taskDataList: TaskData[] = [
      { id: 'task1', name: 'Task 1' },
      { id: 'task2', name: 'Task 2' },
    ];
    const clickHistory: ClickEvent[] = [
      { taskId: 'task1', timestamp: now - 10000 },
      { taskId: 'task2', timestamp: now - 5000 },
    ];

    const result = convertTaskDataList(taskDataList, clickHistory, now);

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

    const result = convertTaskDataList(taskDataList, [], now);

    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('should convert with no click history', () => {
    const taskDataList: TaskData[] = [
      { id: 'task1', name: 'Task 1' },
      { id: 'task2', name: 'Task 2' },
    ];

    const result = convertTaskDataList(taskDataList, [], now);

    expect(result).toHaveLength(2);
    expect(result.every(t => !t.isRunning)).toBe(true);
    expect(result.every(t => t.totalTime === 0)).toBe(true);
  });

  it('should handle tasks with click history but none running', () => {
    const taskDataList: TaskData[] = [
      { id: 'task1', name: 'Task 1' },
      { id: 'task2', name: 'Task 2' },
      { id: 'task3', name: 'Task 3' },
    ];
    const clickHistory: ClickEvent[] = [
      { taskId: 'task1', timestamp: now - 5000 },
      { taskId: 'task2', timestamp: now - 4000 },
      { taskId: 'task3', timestamp: now - 3000 },
    ];

    const result = convertTaskDataList(taskDataList, clickHistory, now);

    const runningTasks = result.filter(t => t.isRunning);
    expect(runningTasks).toHaveLength(1);
    expect(runningTasks[0].id).toBe('task3');
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

  it('should handle 0 task time', () => {
    const result = calculateTaskPercentage(0, 100);
    expect(result).toBe('0.0');
  });

  it('should handle very large numbers', () => {
    const result = calculateTaskPercentage(1000000, 2000000);
    expect(result).toBe('50.0');
  });

  it('should handle rounding edge cases', () => {
    const result = calculateTaskPercentage(2, 3);
    expect(result).toBe('66.7');
  });

  it('should handle task time greater than grand total (edge case)', () => {
    const result = calculateTaskPercentage(150, 100);
    expect(result).toBe('150.0');
  });
});
