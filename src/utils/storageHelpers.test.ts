import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  clearLocalStorage,
} from './storageHelpers';
import type { StoredData, TaskData, ClickEvent } from '../types';

describe('storageHelpers', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveToLocalStorage and loadFromLocalStorage', () => {
    it('should save and load empty data', () => {
      const data: StoredData = {
        tasks: [],
        history: [],
        lastModified: Date.now(),
      };

      saveToLocalStorage(data);
      const loaded = loadFromLocalStorage();

      expect(loaded.tasks).toEqual([]);
      expect(loaded.history).toEqual([]);
    });

    it('should save and load tasks', () => {
      const tasks: TaskData[] = [
        { id: '1', name: 'Task 1' },
        { id: '2', name: 'Task 2' },
      ];
      const data: StoredData = {
        tasks,
        history: [],
        lastModified: Date.now(),
      };

      saveToLocalStorage(data);
      const loaded = loadFromLocalStorage();

      expect(loaded.tasks).toEqual(tasks);
    });

    it('should save and load click history', () => {
      const history: ClickEvent[] = [
        { taskId: '1', timestamp: 1000 },
        { taskId: '2', timestamp: 2000 },
      ];
      const data: StoredData = {
        tasks: [],
        history,
        lastModified: Date.now(),
      };

      saveToLocalStorage(data);
      const loaded = loadFromLocalStorage();

      expect(loaded.history).toEqual(history);
    });

    it('should save and load complete data structure', () => {
      const data: StoredData = {
        tasks: [
          { id: '1', name: 'Task 1' },
          { id: '2', name: 'Task 2' },
        ],
        history: [
          { taskId: '1', timestamp: 1000 },
          { taskId: '2', timestamp: 2000 },
        ],
        lastModified: 12345,
      };

      saveToLocalStorage(data);
      const loaded = loadFromLocalStorage();

      expect(loaded).toEqual({
        tasks: data.tasks,
        history: data.history,
      });
    });
  });

  describe('loadFromLocalStorage', () => {
    it('should return empty state when nothing is saved', () => {
      const result = loadFromLocalStorage();

      expect(result).toEqual({
        tasks: [],
        history: [],
      });
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('clockTasks', 'invalid json {]');

      const result = loadFromLocalStorage();

      expect(result).toEqual({
        tasks: [],
        history: [],
      });
    });

    it('should handle missing tasks property', () => {
      const data = { history: [{ taskId: '1', timestamp: 1000 }] };
      localStorage.setItem('clockTasks', JSON.stringify(data));

      const result = loadFromLocalStorage();

      expect(result.tasks).toEqual([]);
      expect(result.history).toEqual(data.history);
    });

    it('should handle missing history property', () => {
      const data = { tasks: [{ id: '1', name: 'Task' }] };
      localStorage.setItem('clockTasks', JSON.stringify(data));

      const result = loadFromLocalStorage();

      expect(result.tasks).toEqual(data.tasks);
      expect(result.history).toEqual([]);
    });
  });

  describe('clearLocalStorage', () => {
    it('should clear all stored data', () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [{ taskId: '1', timestamp: 1000 }],
        lastModified: Date.now(),
      };

      saveToLocalStorage(data);
      expect(localStorage.getItem('clockTasks')).not.toBeNull();

      clearLocalStorage();
      expect(localStorage.getItem('clockTasks')).toBeNull();
    });

    it('should result in empty state after clearing', () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [{ taskId: '1', timestamp: 1000 }],
        lastModified: Date.now(),
      };

      saveToLocalStorage(data);
      clearLocalStorage();

      const loaded = loadFromLocalStorage();
      expect(loaded).toEqual({
        tasks: [],
        history: [],
      });
    });
  });
});
