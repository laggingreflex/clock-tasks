import type { Task } from '../types'
import { TaskItem } from './TaskItem'
import { calculateTaskPercentage } from '../utils/taskHelpers'

interface TaskListProps {
  tasks: Task[]
  deletionMode: boolean
  totalTasksTime: number
  onNameChange: (id: string, name: string) => void
  onFocus: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskList({
  tasks,
  deletionMode,
  totalTasksTime,
  onNameChange,
  onFocus,
  onDelete
}: TaskListProps) {
  return (
    <div className="tasks-list">
      {tasks.map(task => {
        const percentage = calculateTaskPercentage(task.totalTime, totalTasksTime)
        return (
          <TaskItem
            key={task.id}
            task={task}
            percentage={percentage}
            deletionMode={deletionMode}
            onNameChange={onNameChange}
            onFocus={onFocus}
            onDelete={onDelete}
          />
        )
      })}
    </div>
  )
}
