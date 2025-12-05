import type { Task } from '../types'
import { formatTime } from '../utils/timeFormatter'

interface TaskItemProps {
  task: Task
  percentage: string
  deletionMode: boolean
  onNameChange: (id: string, name: string) => void
  onFocus: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskItem({
  task,
  percentage,
  deletionMode,
  onNameChange,
  onFocus,
  onDelete
}: TaskItemProps) {
  return (
    <div className={`task-item ${task.isRunning ? 'running' : ''}`} id={`task-${task.id}`}>
      <div className="task-inputs">
        <input
          type="text"
          value={task.name}
          onChange={(e) => onNameChange(task.id, e.target.value)}
          onFocus={() => onFocus(task.id)}
          placeholder="Task name"
        />
        {deletionMode && (
          <button title="Delete task" className="delete-btn" onClick={() => onDelete(task.id)}>
            🗑
          </button>
        )}
      </div>
      <div className="task-stats">
        {task.isRunning ? (
          <span>Current: {formatTime(task.currentSessionTime)}</span>
        ) : (
          <span>Last: {formatTime(task.lastSessionTime)}</span>
        )}
        <span>Total: {formatTime(task.totalTime)} ({percentage}%)</span>
      </div>
    </div>
  )
}
