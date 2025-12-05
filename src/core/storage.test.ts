import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageBackend, InMemoryBackend, loadFromLocalStorage, saveToLocalStorage, clearLocalStorage } from './storage';
import type { StoredData } from './types';

describe('LocalStorageBackend', () => {
  let backend: LocalStorageBackend;

  beforeEach(() => {
    localStorage.clear();
    backend = new LocalStorageBackend();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('load', () => {
    it('should return default state when nothing is saved', async () => {
      const result = await backend.load();

      expect(result.tasks).toEqual([]);
      expect(result.history).toEqual([]);
      expect(result.lastModified).toBeGreaterThan(0);
    });

    it('should load saved data', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task 1' }],
        history: [{ taskId: '1', timestamp: 1000 }],
        lastModified: 2000,
      };

      localStorage.setItem('clockTasks', JSON.stringify(data));

      const result = await backend.load();

      expect(result.tasks).toEqual(data.tasks);
      expect(result.history).toEqual(data.history);
      expect(result.lastModified).toBe(2000);
    });

    it('should handle corrupted JSON gracefully', async () => {
      localStorage.setItem('clockTasks', 'invalid json {]');

      const result = await backend.load();

      expect(result.tasks).toEqual([]);
      expect(result.history).toEqual([]);
    });

    it('should handle missing tasks property', async () => {
      const data = { history: [{ taskId: '1', timestamp: 1000 }] };
      localStorage.setItem('clockTasks', JSON.stringify(data));

      const result = await backend.load();

      expect(result.tasks).toEqual([]);
      expect(result.history).toEqual(data.history);
    });

    it('should handle missing history property', async () => {
      const data = { tasks: [{ id: '1', name: 'Task' }] };
      localStorage.setItem('clockTasks', JSON.stringify(data));

      const result = await backend.load();

      expect(result.tasks).toEqual(data.tasks);
      expect(result.history).toEqual([]);
    });
  });

  describe('save', () => {
    it('should save data to localStorage', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task 1' }],
        history: [{ taskId: '1', timestamp: 1000 }],
        lastModified: 2000,
      };

      await backend.save(data);

      const saved = localStorage.getItem('clockTasks');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.tasks).toEqual(data.tasks);
    });

    it('should overwrite previous data', async () => {
      const data1: StoredData = {
        tasks: [{ id: '1', name: 'Task 1' }],
        history: [],
        lastModified: 1000,
      };

      const data2: StoredData = {
        tasks: [{ id: '2', name: 'Task 2' }],
        history: [],
        lastModified: 2000,
      };

      await backend.save(data1);
      await backend.save(data2);

      const result = await backend.load();
      expect(result.tasks).toEqual(data2.tasks);
    });

    it('should handle multiple saves', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [],
        lastModified: Date.now(),
      };

      await backend.save(data);
      await backend.save(data);
      await backend.save(data);

      const result = await backend.load();
      expect(result.tasks).toEqual(data.tasks);
    });
  });

  describe('clear', () => {
    it('should clear all saved data', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [],
        lastModified: Date.now(),
      };

      await backend.save(data);
      await backend.clear();

      expect(localStorage.getItem('clockTasks')).toBeNull();
    });

    it('should result in default state after clear', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [],
        lastModified: Date.now(),
      };

      await backend.save(data);
      await backend.clear();

      const result = await backend.load();
      expect(result.tasks).toEqual([]);
      expect(result.history).toEqual([]);
    });
  });
});

describe('InMemoryBackend', () => {
  let backend: InMemoryBackend;

  beforeEach(() => {
    backend = new InMemoryBackend();
  });

  describe('load', () => {
    it('should return default state initially', async () => {
      const result = await backend.load();

      expect(result.tasks).toEqual([]);
      expect(result.history).toEqual([]);
    });

    it('should return deep copy of data', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [{ taskId: '1', timestamp: 1000 }],
        lastModified: 2000,
      };

      await backend.save(data);

      const result1 = await backend.load();
      const result2 = await backend.load();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Should be different objects
    });
  });

  describe('save', () => {
    it('should save data', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [],
        lastModified: 1000,
      };

      await backend.save(data);

      const result = await backend.load();
      expect(result.tasks).toEqual(data.tasks);
    });

    it('should handle multiple saves', async () => {
      const data1: StoredData = {
        tasks: [{ id: '1', name: 'Task 1' }],
        history: [],
        lastModified: 1000,
      };

      const data2: StoredData = {
        tasks: [{ id: '2', name: 'Task 2' }],
        history: [],
        lastModified: 2000,
      };

      await backend.save(data1);
      let result = await backend.load();
      expect(result.tasks[0].id).toBe('1');

      await backend.save(data2);
      result = await backend.load();
      expect(result.tasks[0].id).toBe('2');
    });
  });

  describe('clear', () => {
    it('should clear saved data', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [],
        lastModified: 1000,
      };

      await backend.save(data);
      await backend.clear();

      const result = await backend.load();
      expect(result.tasks).toEqual([]);
      expect(result.history).toEqual([]);
    });

    it('should reset to default state after clear', async () => {
      const data: StoredData = {
        tasks: [{ id: '1', name: 'Task' }],
        history: [{ taskId: '1', timestamp: 500 }],
        lastModified: 1000,
      };

      await backend.save(data);
      await backend.clear();

      const result = await backend.load();
      expect(result).toEqual({
        tasks: [],
        history: [],
        lastModified: result.lastModified, // Will be a new timestamp
      });
    });
  });
});

describe('loadFromLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return empty state when nothing is saved', () => {
    const result = loadFromLocalStorage();

    expect(result.tasks).toEqual([]);
    expect(result.history).toEqual([]);
    expect(typeof result.lastModified).toBe('number');
  });

  it('should load saved data', () => {
    const data: StoredData = {
      tasks: [{ id: '1', name: 'Task 1' }],
      history: [{ taskId: '1', timestamp: 1000 }],
      lastModified: 2000,
    };

    localStorage.setItem('clockTasks', JSON.stringify(data));

    const result = loadFromLocalStorage();

    expect(result.tasks).toEqual(data.tasks);
    expect(result.history).toEqual(data.history);
  });

  it('should handle corrupted JSON gracefully', () => {
    localStorage.setItem('clockTasks', 'invalid json {]');

    const result = loadFromLocalStorage();

    expect(result.tasks).toEqual([]);
    expect(result.history).toEqual([]);
    expect(typeof result.lastModified).toBe('number');
  });

  it('should handle missing properties', () => {
    const data = { tasks: [{ id: '1', name: 'Task' }] };
    localStorage.setItem('clockTasks', JSON.stringify(data));

    const result = loadFromLocalStorage();

    expect(result.tasks).toEqual(data.tasks);
    expect(result.history).toEqual([]);
  });
});

describe('saveToLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save data to localStorage', () => {
    const data: StoredData = {
      tasks: [{ id: '1', name: 'Task 1' }],
      history: [{ taskId: '1', timestamp: 1000 }],
      lastModified: 2000,
    };

    saveToLocalStorage(data);

    const saved = localStorage.getItem('clockTasks');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.tasks).toEqual(data.tasks);
    expect(parsed.history).toEqual(data.history);
  });

  it('should save empty data structure', () => {
    const data: StoredData = {
      tasks: [],
      history: [],
      lastModified: Date.now(),
    };

    saveToLocalStorage(data);

    const result = loadFromLocalStorage();
    expect(result.tasks).toEqual([]);
    expect(result.history).toEqual([]);
  });

  it('should overwrite previous data', () => {
    const data1: StoredData = {
      tasks: [{ id: '1', name: 'Task 1' }],
      history: [],
      lastModified: 1000,
    };

    const data2: StoredData = {
      tasks: [{ id: '2', name: 'Task 2' }],
      history: [],
      lastModified: 2000,
    };

    saveToLocalStorage(data1);
    saveToLocalStorage(data2);

    const result = loadFromLocalStorage();
    expect(result.tasks[0].id).toBe('2');
  });
});

describe('clearLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should clear all saved data', () => {
    const data: StoredData = {
      tasks: [{ id: '1', name: 'Task' }],
      history: [],
      lastModified: Date.now(),
    };

    saveToLocalStorage(data);
    clearLocalStorage();

    expect(localStorage.getItem('clockTasks')).toBeNull();
  });

  it('should result in empty state after clear', () => {
    saveToLocalStorage({ tasks: [{ id: '1', name: 'Task' }], history: [], lastModified: Date.now() });
    clearLocalStorage();

    const result = loadFromLocalStorage();
    expect(result.tasks).toEqual([]);
    expect(result.history).toEqual([]);
    expect(typeof result.lastModified).toBe('number');
  });

  it('should be safe to call multiple times', () => {
    const data: StoredData = {
      tasks: [{ id: '1', name: 'Task' }],
      history: [],
      lastModified: Date.now(),
    };

    saveToLocalStorage(data);
    clearLocalStorage();
    clearLocalStorage();
    clearLocalStorage();

    expect(localStorage.getItem('clockTasks')).toBeNull();
  });
});
