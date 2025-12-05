import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addTask,
  startTask,
  updateTaskName,
  deleteTask,
  deleteAllTasks,
  resetAllTasks,
} from './taskOperations';
import type { TaskData, ClickEvent } from '../types';

describe('taskOperations', () => {
  let taskDataList: TaskData[];
  let clickHistory: ClickEvent[];
  let mockOnSync: ReturnType<typeof vi.fn>;
  let mockOnTaskAdded: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    taskDataList = [];
    clickHistory = [];
    mockOnSync = vi.fn().mockResolvedValue(undefined);
    mockOnTaskAdded = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addTask', () => {
    it('should create a new task with generated id', () => {
      vi.setSystemTime(1000);

      addTask('New Task', taskDataList, clickHistory, mockOnTaskAdded, mockOnSync);

      expect(mockOnTaskAdded).toHaveBeenCalledWith('1000');
      expect(mockOnSync).toHaveBeenCalled();

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.tasks).toHaveLength(1);
      expect(savedData.tasks[0]).toEqual({ id: '1000', name: 'New Task' });
    });

    it('should trim task name', () => {
      vi.setSystemTime(1000);

      addTask('  Task With Spaces  ', taskDataList, clickHistory, mockOnTaskAdded, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.tasks[0].name).toBe('Task With Spaces');
    });

    it('should start the task immediately', () => {
      vi.setSystemTime(1000);

      addTask('New Task', taskDataList, clickHistory, mockOnTaskAdded, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.clickHistory).toHaveLength(1);
      expect(savedData.clickHistory[0].taskId).toBe('1000');
      expect(savedData.clickHistory[0].timestamp).toBe(1000);
    });

    it('should preserve existing tasks', () => {
      taskDataList = [{ id: '1', name: 'Existing Task' }];
      vi.setSystemTime(2000);

      addTask('New Task', taskDataList, clickHistory, mockOnTaskAdded, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.tasks).toHaveLength(2);
      expect(savedData.tasks[0]).toEqual({ id: '1', name: 'Existing Task' });
    });

    it('should not add empty or whitespace-only task names', () => {
      addTask('', taskDataList, clickHistory, mockOnTaskAdded, mockOnSync);
      addTask('   ', taskDataList, clickHistory, mockOnTaskAdded, mockOnSync);

      expect(mockOnSync).not.toHaveBeenCalled();
      expect(mockOnTaskAdded).not.toHaveBeenCalled();
    });

    it('should preserve existing click history', () => {
      clickHistory = [
        { taskId: '1', timestamp: 500 },
        { taskId: '2', timestamp: 800 },
      ];
      vi.setSystemTime(1000);

      addTask('New Task', taskDataList, clickHistory, mockOnTaskAdded, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.clickHistory).toHaveLength(3);
      expect(savedData.clickHistory[0]).toEqual({ taskId: '1', timestamp: 500 });
      expect(savedData.clickHistory[2]).toEqual({ taskId: '1000', timestamp: 1000 });
    });
  });

  describe('startTask', () => {
    it('should add click to history', () => {
      vi.setSystemTime(1000);

      startTask('task1', taskDataList, clickHistory, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.clickHistory).toHaveLength(1);
      expect(savedData.clickHistory[0]).toEqual({ taskId: 'task1', timestamp: 1000 });
    });

    it('should preserve existing history', () => {
      clickHistory = [{ taskId: 'task1', timestamp: 500 }];
      vi.setSystemTime(1000);

      startTask('task2', taskDataList, clickHistory, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.clickHistory).toHaveLength(2);
      expect(savedData.clickHistory[0]).toEqual({ taskId: 'task1', timestamp: 500 });
      expect(savedData.clickHistory[1]).toEqual({ taskId: 'task2', timestamp: 1000 });
    });

    it('should preserve task data list', () => {
      taskDataList = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      startTask('task1', taskDataList, clickHistory, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.tasks).toEqual(taskDataList);
    });
  });

  describe('updateTaskName', () => {
    it('should update task name', () => {
      taskDataList = [{ id: 'task1', name: 'Old Name' }];

      const updated = updateTaskName('task1', 'New Name', taskDataList, clickHistory, mockOnSync);

      expect(updated[0].name).toBe('New Name');
      expect(mockOnSync).toHaveBeenCalled();
    });

    it('should not modify other tasks', () => {
      taskDataList = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const updated = updateTaskName('task1', 'Updated', taskDataList, clickHistory, mockOnSync);

      expect(updated[0].name).toBe('Updated');
      expect(updated[1].name).toBe('Task 2');
    });

    it('should return updated list', () => {
      taskDataList = [{ id: 'task1', name: 'Old' }];

      const result = updateTaskName('task1', 'New', taskDataList, clickHistory, mockOnSync);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('New');
    });
  });

  describe('deleteTask', () => {
    beforeEach(() => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    });

    it('should delete task when confirmed', () => {
      taskDataList = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const result = deleteTask('task1', taskDataList, clickHistory, mockOnSync);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('task2');
    });

    it('should remove task from click history', () => {
      taskDataList = [{ id: 'task1', name: 'Task 1' }];
      clickHistory = [
        { taskId: 'task1', timestamp: 1000 },
        { taskId: 'task2', timestamp: 2000 },
      ];

      const result = deleteTask('task1', taskDataList, clickHistory, mockOnSync);

      expect(result.history).toHaveLength(1);
      expect(result.history[0].taskId).toBe('task2');
    });

    it('should not delete when not confirmed', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
      taskDataList = [{ id: 'task1', name: 'Task 1' }];

      const result = deleteTask('task1', taskDataList, clickHistory, mockOnSync);

      expect(result.tasks).toEqual(taskDataList);
      expect(mockOnSync).not.toHaveBeenCalled();
    });

    it('should sync data after deletion', () => {
      taskDataList = [{ id: 'task1', name: 'Task 1' }];

      deleteTask('task1', taskDataList, clickHistory, mockOnSync);

      expect(mockOnSync).toHaveBeenCalled();
      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.tasks).toHaveLength(0);
    });
  });

  describe('deleteAllTasks', () => {
    beforeEach(() => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    });

    it('should delete all tasks when confirmed', () => {
      taskDataList = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const result = deleteAllTasks(taskDataList, clickHistory, mockOnSync);

      expect(result.tasks).toEqual([]);
    });

    it('should clear click history', () => {
      taskDataList = [{ id: 'task1', name: 'Task 1' }];
      clickHistory = [{ taskId: 'task1', timestamp: 1000 }];

      const result = deleteAllTasks(taskDataList, clickHistory, mockOnSync);

      expect(result.history).toEqual([]);
    });

    it('should not delete when not confirmed', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
      taskDataList = [{ id: 'task1', name: 'Task 1' }];

      const result = deleteAllTasks(taskDataList, clickHistory, mockOnSync);

      expect(result.tasks).toEqual(taskDataList);
      expect(mockOnSync).not.toHaveBeenCalled();
    });
  });

  describe('resetAllTasks', () => {
    it('should clear click history but keep tasks', () => {
      taskDataList = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];
      clickHistory = [
        { taskId: 'task1', timestamp: 1000 },
        { taskId: 'task2', timestamp: 2000 },
      ];

      resetAllTasks(taskDataList, mockOnSync);

      expect(mockOnSync).toHaveBeenCalled();
      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.tasks).toEqual(taskDataList);
      expect(savedData.clickHistory).toEqual([]);
    });

    it('should set lastModified timestamp', () => {
      vi.setSystemTime(5000);
      taskDataList = [{ id: 'task1', name: 'Task 1' }];

      resetAllTasks(taskDataList, mockOnSync);

      const savedData = mockOnSync.mock.calls[0][0];
      expect(savedData.lastModified).toBe(5000);
    });
  });
});
