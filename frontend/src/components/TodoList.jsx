import React from 'react'
import TodoItem from './TodoItem'
import './TodoList.css'

export default function TodoList({ todos, onSelect, onToggle, onEdit, onDelete, selectedId }) {
  const pending = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)

  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <h3>No todos yet</h3>
        <p>Add a new todo to get started!</p>
      </div>
    )
  }

  return (
    <div className="todo-list">
      {pending.length > 0 && (
        <section>
          <div className="section-header">
            <h2>In Progress</h2>
            <span className="count-badge">{pending.length}</span>
          </div>
          <div className="todo-items">
            {pending.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onSelect={onSelect}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelected={todo.id === selectedId}
              />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="completed-section">
          <div className="section-header">
            <h2>Completed</h2>
            <span className="count-badge completed">{completed.length}</span>
          </div>
          <div className="todo-items">
            {completed.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onSelect={onSelect}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelected={todo.id === selectedId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
