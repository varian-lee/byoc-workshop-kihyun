import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import './TodoForm.css'

export default function TodoForm({ todo, onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (todo) {
      setTitle(todo.title || '')
      setDescription(todo.description || '')
      if (todo.deadline) {
        const d = new Date(todo.deadline)
        setDeadline(format(d, "yyyy-MM-dd'T'HH:mm"))
      }
    }
  }, [todo])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="todo-form">
      <div className="form-header">
        <h2>{todo ? 'Edit Todo' : 'Add New Todo'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter todo title"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="deadline">Deadline</label>
          <input
            id="deadline"
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Saving...' : (todo ? 'Save Changes' : 'Add Todo')}
          </button>
        </div>
      </form>
    </div>
  )
}
