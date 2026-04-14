import React from 'react'
import { format, isPast, isToday } from 'date-fns'
import './TodoItem.css'

export default function TodoItem({ todo, onSelect, onToggle, onEdit, onDelete, isSelected }) {
  const deadline = todo.deadline ? new Date(todo.deadline) : null
  const isOverdue = deadline && isPast(deadline) && !todo.completed
  const isDueToday = deadline && isToday(deadline) && !todo.completed

  const getDeadlineClass = () => {
    if (todo.completed) return 'deadline-done'
    if (isOverdue) return 'deadline-overdue'
    if (isDueToday) return 'deadline-today'
    return 'deadline-normal'
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (window.confirm('Delete this todo?')) {
      onDelete(todo.id)
    }
  }

  return (
    <div
      className={`todo-item ${isSelected ? 'selected' : ''} ${todo.completed ? 'completed' : ''}`}
      onClick={() => onSelect(todo)}
    >
      <button
        className={`checkbox ${todo.completed ? 'checked' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggle(todo) }}
        title={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {todo.completed && '✓'}
      </button>

      <div className="todo-content">
        <h3 className="todo-title">{todo.title}</h3>
        {todo.description && (
          <p className="todo-desc">{todo.description}</p>
        )}
        {deadline && (
          <span className={`todo-deadline ${getDeadlineClass()}`}>
            {isOverdue && '⚠ Overdue · '}
            {isDueToday && '⏰ Due today · '}
            {format(deadline, 'MMM dd, yyyy HH:mm')}
          </span>
        )}
      </div>

      <div className="todo-actions" onClick={e => e.stopPropagation()}>
        <button className="action-btn edit-btn" onClick={() => onEdit(todo)} title="Edit">
          ✏
        </button>
        <button className="action-btn delete-btn" onClick={handleDelete} title="Delete">
          🗑
        </button>
      </div>
    </div>
  )
}
