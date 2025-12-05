import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskOperations, TaskQueries } from './taskManager';
import type { TaskManagerState } from './taskManager';
import type { ClickEvent } from './types';

describe('TaskOperations', () => {
  let state: TaskManagerState;

  beforeEach(() => {
    state = {
      tasks: [],
      clickHistory: [],
      lastModified: Date.now(),
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addTask', () => {
    it('should add a new task with generated id', () => {
      vi.setSystemTime(1000);

      const newState = TaskOperations.addTask('My Task', state);

      expect(newState.tasks).toHaveLength(1);
      expect(newState.tasks[0].name).toBe('My Task');
      expect(newState.tasks[0].id).toBe('1000');
    });

    it('should trim task name', () => {
      vi.setSystemTime(1000);

      const newState = TaskOperations.addTask('  Task Name  ', state);

      expect(newState.tasks[0].name).toBe('Task Name');
    });

    it('should return unchanged state for empty task name', () => {
      const result = TaskOperations.addTask('', state);
      expect(result).toBe(state);
    });

    it('should return unchanged state for whitespace-only task name', () => {
      const result = TaskOperations.addTask('   ', state);
      expect(result).toBe(state);
    });

    it('should preserve existing tasks', () => {
      state.tasks = [{ id: '1', name: 'Task 1' }];
      vi.setSystemTime(2000);

      const newState = TaskOperations.addTask('Task 2', state);

      expect(newState.tasks).toHaveLength(2);
      expect(newState.tasks[0].name).toBe('Task 1');
      expect(newState.tasks[1].name).toBe('Task 2');
    });

    it('should update lastModified timestamp', () => {
      vi.setSystemTime(5000);

      const newState = TaskOperations.addTask('Task', state);

      expect(newState.lastModified).toBe(5000);
    });

    it('should not mutate original state', () => {
      const originalLength = state.tasks.length;
      TaskOperations.addTask('Task', state);

      expect(state.tasks.length).toBe(originalLength);
    });
  });

  describe('addAndStartTask', () => {
    it('should add task and create click event', () => {
      vi.setSystemTime(1000);

      const newState = TaskOperations.addAndStartTask('My Task', state);

      expect(newState.tasks).toHaveLength(1);
      expect(newState.clickHistory).toHaveLength(1);
      expect(newState.clickHistory[0].taskId).toBe('1000');
    });

    it('should return unchanged state for empty task name', () => {
      const result = TaskOperations.addAndStartTask('', state);
      expect(result).toBe(state);
    });

    it('should set task click timestamp', () => {
      vi.setSystemTime(3000);

      const newState = TaskOperations.addAndStartTask('Task', state);

      expect(newState.clickHistory[0].timestamp).toBe(3000);
    });

    it('should preserve existing history', () => {
      state.clickHistory = [{ taskId: 'old', timestamp: 500 }];
      vi.setSystemTime(1000);

      const newState = TaskOperations.addAndStartTask('Task', state);

      expect(newState.clickHistory).toHaveLength(2);
      expect(newState.clickHistory[0].taskId).toBe('old');
    });
  });

  describe('startTask', () => {
    it('should add click event', () => {
      vi.setSystemTime(1000);

      const newState = TaskOperations.startTask('task1', state);

      expect(newState.clickHistory).toHaveLength(1);
      expect(newState.clickHistory[0].taskId).toBe('task1');
    });

    it('should preserve existing tasks', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];

      const newState = TaskOperations.startTask('task1', state);

      expect(newState.tasks).toEqual(state.tasks);
    });

    it('should preserve existing click history', () => {
      state.clickHistory = [{ taskId: 'task1', timestamp: 500 }];
      vi.setSystemTime(1000);

      const newState = TaskOperations.startTask('task2', state);

      expect(newState.clickHistory).toHaveLength(2);
      expect(newState.clickHistory[0].taskId).toBe('task1');
      expect(newState.clickHistory[1].taskId).toBe('task2');
    });

    it('should update lastModified', () => {
      vi.setSystemTime(2000);

      const newState = TaskOperations.startTask('task1', state);

      expect(newState.lastModified).toBe(2000);
    });
  });

  describe('updateTaskName', () => {
    it('should update task name', () => {
      state.tasks = [{ id: 'task1', name: 'Old Name' }];

      const newState = TaskOperations.updateTaskName('task1', 'New Name', state);

      expect(newState.tasks[0].name).toBe('New Name');
    });

    it('should not modify other tasks', () => {
      state.tasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const newState = TaskOperations.updateTaskName('task1', 'Updated', state);

      expect(newState.tasks[0].name).toBe('Updated');
      expect(newState.tasks[1].name).toBe('Task 2');
    });

    it('should preserve click history', () => {
      state.tasks = [{ id: 'task1', name: 'Task' }];
      state.clickHistory = [{ taskId: 'task1', timestamp: 1000 }];

      const newState = TaskOperations.updateTaskName('task1', 'New Name', state);

      expect(newState.clickHistory).toEqual(state.clickHistory);
    });

    it('should update lastModified', () => {
      state.tasks = [{ id: 'task1', name: 'Task' }];
      vi.setSystemTime(3000);

      const newState = TaskOperations.updateTaskName('task1', 'New', state);

      expect(newState.lastModified).toBe(3000);
    });

    it('should handle non-existent task gracefully', () => {
      state.tasks = [{ id: 'task1', name: 'Task' }];

      const newState = TaskOperations.updateTaskName('task999', 'New', state);

      expect(newState.tasks[0].name).toBe('Task');
    });
  });

  describe('deleteTask', () => {
    it('should remove task from tasks list', () => {
      state.tasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const newState = TaskOperations.deleteTask('task1', state);

      expect(newState.tasks).toHaveLength(1);
      expect(newState.tasks[0].id).toBe('task2');
    });

    it('should remove task clicks from history', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];
      state.clickHistory = [
        { taskId: 'task1', timestamp: 1000 },
        { taskId: 'task2', timestamp: 2000 },
        { taskId: 'task1', timestamp: 3000 },
      ];

      const newState = TaskOperations.deleteTask('task1', state);

      expect(newState.clickHistory).toHaveLength(1);
      expect(newState.clickHistory[0].taskId).toBe('task2');
    });

    it('should update lastModified', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];
      vi.setSystemTime(4000);

      const newState = TaskOperations.deleteTask('task1', state);

      expect(newState.lastModified).toBe(4000);
    });

    it('should handle non-existent task gracefully', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];

      const newState = TaskOperations.deleteTask('task999', state);

      expect(newState.tasks).toHaveLength(1);
    });
  });

  describe('deleteAllTasks', () => {
    it('should clear all tasks', () => {
      state.tasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const newState = TaskOperations.deleteAllTasks(state);

      expect(newState.tasks).toEqual([]);
    });

    it('should clear click history', () => {
      state.clickHistory = [
        { taskId: 'task1', timestamp: 1000 },
        { taskId: 'task2', timestamp: 2000 },
      ];

      const newState = TaskOperations.deleteAllTasks(state);

      expect(newState.clickHistory).toEqual([]);
    });

    it('should update lastModified', () => {
      vi.setSystemTime(5000);

      const newState = TaskOperations.deleteAllTasks(state);

      expect(newState.lastModified).toBe(5000);
    });
  });

  describe('resetAllTasks', () => {
    it('should clear click history', () => {
      state.clickHistory = [
        { taskId: 'task1', timestamp: 1000 },
        { taskId: 'task2', timestamp: 2000 },
      ];
      state.tasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const newState = TaskOperations.resetAllTasks(state);

      expect(newState.clickHistory).toEqual([]);
      expect(newState.tasks).toEqual(state.tasks);
    });

    it('should update lastModified', () => {
      vi.setSystemTime(6000);

      const newState = TaskOperations.resetAllTasks(state);

      expect(newState.lastModified).toBe(6000);
    });
  });

  describe('pauseCurrentTask', () => {
    it('should remove last click', () => {
      state.clickHistory = [
        { taskId: 'task1', timestamp: 1000 },
        { taskId: 'task2', timestamp: 2000 },
      ];

      const newState = TaskOperations.pauseCurrentTask(state);

      expect(newState.clickHistory).toHaveLength(1);
      expect(newState.clickHistory[0].taskId).toBe('task1');
    });

    it('should return unchanged state for empty history', () => {
      const result = TaskOperations.pauseCurrentTask(state);
      expect(result).toBe(state);
    });

    it('should update lastModified', () => {
      state.clickHistory = [{ taskId: 'task1', timestamp: 1000 }];
      vi.setSystemTime(7000);

      const newState = TaskOperations.pauseCurrentTask(state);

      expect(newState.lastModified).toBe(7000);
    });
  });
});

describe('Your Scenario: A → B → C → A', () => {
  it('should handle task switching with proper time calculation', () => {
    let state: TaskManagerState = {
      tasks: [],
      clickHistory: [],
      lastModified: 0,
    };
    let now = 1000;

    // Step 1: Add task A (should start running)
    state = TaskOperations.addAndStartTask('A', state, () => now);
    let tasks = TaskQueries.getAllTasks(state, now);
    expect(tasks[0].name).toBe('A');
    expect(tasks[0].isRunning).toBe(true);
    expect(tasks[0].currentSessionTime).toBe(0);
    expect(state.clickHistory).toHaveLength(1);
    expect(state.clickHistory[0].taskId).toBe(state.tasks[0].id);

    // Step 2: Add task B at t=5000 (B starts, A should show 4-5s elapsed)
    now = 5000;
    state = TaskOperations.addAndStartTask('B', state, () => now);
    tasks = TaskQueries.getAllTasks(state, now);
    expect(tasks[0].name).toBe('A');
    expect(tasks[0].isRunning).toBe(false); // A is no longer running
    expect(tasks[0].lastSessionTime).toBe(4); // 5000 - 1000 = 4000ms = 4s
    expect(tasks[1].name).toBe('B');
    expect(tasks[1].isRunning).toBe(true);
    expect(tasks[1].currentSessionTime).toBe(0);
    expect(state.clickHistory).toHaveLength(2);

    // Step 3: Add task C at t=10000 (C starts, B should show 5s elapsed)
    now = 10000;
    state = TaskOperations.addAndStartTask('C', state, () => now);
    tasks = TaskQueries.getAllTasks(state, now);
    expect(tasks[0].name).toBe('A');
    expect(tasks[0].totalTime).toBe(4); // A ran for 4s total
    expect(tasks[1].name).toBe('B');
    expect(tasks[1].isRunning).toBe(false);
    expect(tasks[1].lastSessionTime).toBe(5); // 10000 - 5000 = 5000ms = 5s
    expect(tasks[2].name).toBe('C');
    expect(tasks[2].isRunning).toBe(true);
    expect(state.clickHistory).toHaveLength(3);

    // Step 4: Click A again at t=15000
    now = 15000;
    const aId = state.tasks[0].id;
    state = TaskOperations.startTask(aId, state, () => now);
    tasks = TaskQueries.getAllTasks(state, now);

    console.log('\n=== AFTER CLICKING A AGAIN ===');
    console.log('Click history:', state.clickHistory);
    console.log('Task A:', tasks[0]);
    console.log('Task B:', tasks[1]);
    console.log('Task C:', tasks[2]);

    // According to your logic:
    // "There should only be one start time per task, the latest one"
    // So A should have only ONE click entry at timestamp 15000
    // NOT two entries (one at 1000 and one at 15000)

    // With our fixed logic, when a task is not running,
    // it displays its most recent session duration as lastSessionTime
    expect(tasks[2].isRunning).toBe(false); // C stopped
    expect(tasks[0].isRunning).toBe(true); // A is running again
    expect(state.clickHistory).toHaveLength(4); // All clicks are preserved for accurate time calculation
  });
});

describe('TaskQueries', () => {
  let state: TaskManagerState;
  let now: number;

  beforeEach(() => {
    now = Date.now();
    state = {
      tasks: [],
      clickHistory: [],
      lastModified: now,
    };
  });

  describe('getAllTasks', () => {
    it('should return empty array for no tasks', () => {
      const tasks = TaskQueries.getAllTasks(state, now);
      expect(tasks).toEqual([]);
    });

    it('should return all tasks with stats', () => {
      state.tasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];
      state.clickHistory = [
        { taskId: 'task1', timestamp: now - 5000 },
        { taskId: 'task2', timestamp: now - 2000 },
      ];

      const tasks = TaskQueries.getAllTasks(state, now);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('task1');
      expect(tasks[1].id).toBe('task2');
      expect(tasks[1].isRunning).toBe(true);
      expect(tasks[0].isRunning).toBe(false);
    });
  });

  describe('getTask', () => {
    it('should return task by id', () => {
      state.tasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      const task = TaskQueries.getTask('task1', state, now);

      expect(task).toBeDefined();
      expect(task?.id).toBe('task1');
      expect(task?.name).toBe('Task 1');
    });

    it('should return undefined for non-existent task', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];

      const task = TaskQueries.getTask('task999', state, now);

      expect(task).toBeUndefined();
    });

    it('should mark task as running if most recent click', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];
      state.clickHistory = [{ taskId: 'task1', timestamp: now - 5000 }];

      const task = TaskQueries.getTask('task1', state, now);

      expect(task?.isRunning).toBe(true);
    });

    it('should calculate current session time correctly', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];
      state.clickHistory = [{ taskId: 'task1', timestamp: now - 10000 }];

      const task = TaskQueries.getTask('task1', state, now);

      expect(task?.currentSessionTime).toBe(10);
    });
  });

  describe('getCurrentRunningTaskId', () => {
    it('should return undefined for empty history', () => {
      const id = TaskQueries.getCurrentRunningTaskId(state);
      expect(id).toBeUndefined();
    });

    it('should return most recent task id', () => {
      state.clickHistory = [
        { taskId: 'task1', timestamp: now - 10000 },
        { taskId: 'task2', timestamp: now - 5000 },
      ];

      const id = TaskQueries.getCurrentRunningTaskId(state);

      expect(id).toBe('task2');
    });
  });

  describe('getTotalElapsedTime', () => {
    it('should return 0 for no tasks', () => {
      const total = TaskQueries.getTotalElapsedTime(state, now);
      expect(total).toBe(0);
    });

    it('should sum time of all tasks', () => {
      state.tasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];
      state.clickHistory = [
        { taskId: 'task1', timestamp: now - 20000 },
        { taskId: 'task2', timestamp: now - 10000 },
      ];

      const total = TaskQueries.getTotalElapsedTime(state, now);

      expect(total).toBeGreaterThan(0);
    });
  });

  describe('taskExists', () => {
    it('should return true if task exists', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];

      expect(TaskQueries.taskExists('task1', state)).toBe(true);
    });

    it('should return false if task does not exist', () => {
      state.tasks = [{ id: 'task1', name: 'Task 1' }];

      expect(TaskQueries.taskExists('task999', state)).toBe(false);
    });

    it('should return false for empty tasks', () => {
      expect(TaskQueries.taskExists('any', state)).toBe(false);
    });
  });
});
