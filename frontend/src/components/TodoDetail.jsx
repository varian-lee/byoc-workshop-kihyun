import React from 'react'
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns'
import './TodoDetail.css'

export default function TodoDetail({ todo, onClose, onEdit, onDelete, onToggle }) {
  const deadline = todo.deadline ? new Date(todo.deadline) : null
  const isOverdue = deadline && isPast(deadline) && !todo.completed
  const isDueToday = deadline && isToday(deadline) && !todo.completed

  const handleDelete = () => {
    if (window.confirm('Delete this todo?')) {
      onDelete(todo.id)
    }
  }

  return (
    <div className="todo-detail">
      <div className="detail-header">
        <h3>Details</h3>
        <button className="close-btn" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="detail-body">
        <div className="detail-status">
          <span className={`status-badge ${todo.completed ? 'done' : 'pending'}`}>
            {todo.completed ? '✓ Completed' : 'In Progress'}
          </span>
        </div>

        <h2 className={`detail-title ${todo.completed ? 'completed-text' : ''}`}>
          {todo.title}
        </h2>

        {todo.description && (
          <div className="detail-section">
            <label>Description</label>
            <p className="detail-desc">{todo.description}</p>
          </div>
        )}

        {deadline && (
          <div className="detail-section">
            <label>Deadline</label>
            <div className={`detail-deadline ${isOverdue ? 'overdue' : isDueToday ? 'today' : ''}`}>
              <span className="deadline-date">
                {format(deadline, 'MMM dd, yyyy HH:mm')}
              </span>
              {!todo.completed && (
                <span className="deadline-relative">
                  {isOverdue
                    ? `${formatDistanceToNow(deadline)} overdue`
                    : `${formatDistanceToNow(deadline)} remaining`
                  }
                </span>
              )}
            </div>
          </div>
        )}

        <div className="detail-section">
          <label>Created</label>
          <p className="detail-meta">
            {format(new Date(todo.created_at), 'MMM dd, yyyy HH:mm')}
          </p>
        </div>

        <div className="detail-section">
          <label>Last Updated</label>
          <p className="detail-meta">
            {format(new Date(todo.updated_at), 'MMM dd, yyyy HH:mm')}
          </p>
        </div>
      </div>

      <div className="detail-footer">
        <button
          className="action-toggle"
          onClick={() => onToggle(todo)}
        >
          {todo.completed ? '↩ Mark Incomplete' : '✓ Mark Complete'}
        </button>
        <div className="action-group">
          <button className="action-edit" onClick={() => onEdit(todo)}>
            ✏ Edit
          </button>
          <button className="action-delete" onClick={handleDelete}>
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  )
}
