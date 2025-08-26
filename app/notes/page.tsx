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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Notes</h1>
          <p className="text-gray-400 mt-2">Create and manage your notes</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <Input
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter note title"
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <Textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter note content"
                  rows={6}
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateNote}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Creating..." : "Create Note"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-black border-gray-800 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-700 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card className="bg-black border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-400 text-center">
              <p className="text-lg mb-2">No notes yet</p>
              <p className="text-sm">Create your first note to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <Card key={note.id} className="bg-black border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white text-lg">{note.title}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingNote(note)}
                      className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-gray-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Created: {formatDate(note.created_at)}
                  {note.updated_at !== note.created_at && (
                    <span className="ml-2">• Updated: {formatDate(note.updated_at)}</span>
                  )}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Note Dialog */}
      {editingNote && (
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent className="bg-black border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <Input
                  value={editingNote.title}
                  onChange={(e) => setEditingNote(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter note title"
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <Textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                  placeholder="Enter note content"
                  rows={6}
                  className="bg-black border-gray-600 text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingNote(null)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateNote}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Updating..." : "Update Note"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
