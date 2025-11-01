"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import { getNotes, createNote, updateNote, deleteNote } from "@/lib/database"
import { toast } from "sonner"
import './notes.css'

interface Note {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [newNote, setNewNote] = useState({ title: "", content: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [])

  async function loadNotes() {
    try {
      setLoading(true)
      const data = await getNotes()
      setNotes(data)
    } catch (error) {
      console.error("Error loading notes:", error)
      toast.error("Failed to load notes")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast.error("Please fill in both title and content")
      return
    }

    try {
      setIsSubmitting(true)
      const createdNote = await createNote(newNote)
      setNotes([createdNote, ...notes])
      setNewNote({ title: "", content: "" })
      setShowCreateDialog(false)
      toast.success("Note created successfully!")
    } catch (error) {
      console.error("Error creating note:", error)
      toast.error("Failed to create note")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.title.trim() || !editingNote.content.trim()) {
      toast.error("Please fill in both title and content")
      return
    }

    try {
      setIsSubmitting(true)
      const updatedNote = await updateNote(editingNote.id, {
        title: editingNote.title,
        content: editingNote.content
      })
      setNotes(notes.map(note => note.id === editingNote.id ? updatedNote : note))
      setEditingNote(null)
      toast.success("Note updated successfully!")
    } catch (error) {
      console.error("Error updating note:", error)
      toast.error("Failed to update note")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      await deleteNote(noteId)
      setNotes(notes.filter(note => note.id !== noteId))
      toast.success("Note deleted successfully!")
    } catch (error) {
      console.error("Error deleting note:", error)
      toast.error("Failed to delete note")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="notes-container">
      <div className="notes-header">
        <div className="notes-title-section">
          <h1>Notes</h1>
          <p>Create and manage your notes</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <button className="new-note-button">
              <Plus className="h-4 w-4" />
              New Note
            </button>
          </DialogTrigger>
          <DialogContent className="notes-dialog">
            <div className="notes-dialog-header">
              <h2 className="notes-dialog-title">Create New Note</h2>
            </div>
            <div className="notes-dialog-content">
              <div className="notes-form-group">
                <label className="notes-form-label">Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter note title"
                  className="notes-form-input"
                />
              </div>
              <div className="notes-form-group">
                <label className="notes-form-label">Content</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter note content"
                  rows={6}
                  className="notes-form-textarea"
                />
              </div>
            </div>
            <div className="notes-dialog-footer">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="notes-button-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={isSubmitting}
                className="notes-button-primary"
              >
                {isSubmitting ? "Creating..." : "Create Note"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="loading-card">
              <div className="loading-card-header">
                <div className="loading-skeleton">
                  <div className="loading-title"></div>
                  <div className="loading-meta"></div>
                </div>
              </div>
              <div className="loading-card-content">
                <div className="loading-skeleton">
                  <div className="loading-line"></div>
                  <div className="loading-line short"></div>
                  <div className="loading-line medium"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-content">
            <p className="empty-state-title">No notes yet</p>
            <p className="empty-state-description">Create your first note to get started</p>
          </div>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <div className="note-card-title-section">
                  <h3 className="note-card-title">{note.title}</h3>
                  <div className="note-card-actions">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="note-action-button edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="note-action-button delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="note-card-meta">
                  Created: {formatDate(note.created_at)}
                  {note.updated_at !== note.created_at && (
                    <span> • Updated: {formatDate(note.updated_at)}</span>
                  )}
                </p>
              </div>
              <div className="note-card-content">
                <p className="note-card-text">{note.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Note Dialog */}
      {editingNote && (
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent className="notes-dialog">
            <div className="notes-dialog-header">
              <h2 className="notes-dialog-title">Edit Note</h2>
            </div>
            <div className="notes-dialog-content">
              <div className="notes-form-group">
                <label className="notes-form-label">Title</label>
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter note title"
                  className="notes-form-input"
                />
              </div>
              <div className="notes-form-group">
                <label className="notes-form-label">Content</label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                  placeholder="Enter note content"
                  rows={6}
                  className="notes-form-textarea"
                />
              </div>
            </div>
            <div className="notes-dialog-footer">
              <button
                onClick={() => setEditingNote(null)}
                className="notes-button-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNote}
                disabled={isSubmitting}
                className="notes-button-primary"
              >
                {isSubmitting ? "Updating..." : "Update Note"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
