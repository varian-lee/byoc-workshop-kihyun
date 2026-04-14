import React, { useState, useEffect } from 'react'
import TodoList from './components/TodoList'
import TodoForm from './components/TodoForm'
import TodoDetail from './components/TodoDetail'
import { todoApi } from './api'
import './App.css'

export default function App() {
  const [todos, setTodos] = useState([])
  const [selectedTodo, setSelectedTodo] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTodo, setEditingTodo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const res = await todoApi.list()
      setTodos(res.data)
      setError(null)
    } catch (err) {
      setError('Failed to load todos.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  const handleCreate = async (data) => {
    try {
      await todoApi.create(data)
      await fetchTodos()
      setShowForm(false)
    } catch (err) {
      setError('Failed to create todo.')
      console.error(err)
    }
  }

  const handleUpdate = async (id, data) => {
    try {
      const res = await todoApi.update(id, data)
      setTodos(todos.map(t => t.id === id ? res.data : t))
      if (selectedTodo?.id === id) setSelectedTodo(res.data)
      setEditingTodo(null)
      setShowForm(false)
    } catch (err) {
      setError('Failed to update todo.')
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await todoApi.delete(id)
      setTodos(todos.filter(t => t.id !== id))
      if (selectedTodo?.id === id) setSelectedTodo(null)
    } catch (err) {
      setError('Failed to delete todo.')
      console.error(err)
    }
  }

  const handleToggleComplete = async (todo) => {
    await handleUpdate(todo.id, { completed: !todo.completed })
  }

  const handleSelectTodo = async (todo) => {
    try {
      const res = await todoApi.get(todo.id)
      setSelectedTodo(res.data)
    } catch (err) {
      setError('Failed to load todo details.')
    }
  }

  const handleEdit = (todo) => {
    setEditingTodo(todo)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTodo(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">✓</span> Todo App
          </h1>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingTodo(null); setShowForm(true) }}
          >
            + Add Todo
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <main className="app-main">
        <div className={`main-layout ${selectedTodo ? 'with-detail' : ''}`}>
          <div className="list-section">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <TodoList
                todos={todos}
                onSelect={handleSelectTodo}
                onToggle={handleToggleComplete}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedId={selectedTodo?.id}
              />
            )}
          </div>

          {selectedTodo && (
            <div className="detail-section">
              <TodoDetail
                todo={selectedTodo}
                onClose={() => setSelectedTodo(null)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggleComplete}
              />
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <TodoForm
              todo={editingTodo}
              onSubmit={editingTodo
                ? (data) => handleUpdate(editingTodo.id, data)
                : handleCreate
              }
              onCancel={handleCloseForm}
            />
          </div>
        </div>
      )}
    </div>
  )
}
