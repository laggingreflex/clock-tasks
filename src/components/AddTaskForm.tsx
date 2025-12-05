import { useState } from 'react'

interface AddTaskFormProps {
  onAdd: (name: string) => void
}

export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(input)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-inputs">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add new task"
        />
        <button type="submit" title="Add new task">➕</button>
      </div>
    </form>
  )
}
