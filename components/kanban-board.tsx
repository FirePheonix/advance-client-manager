"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, MoreHorizontal, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddTaskDialog } from "@/components/add-task-dialog"

interface Task {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  platform: string
  dateRange: string
  assignees: string[]
  comments: number
  status: "todo" | "in-progress" | "review" | "completed"
}

interface KanbanBoardProps {
  clientName: string
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: Task["status"]) => void
  onAddTask: (task: Omit<Task, "id">) => void
}

const columns = [
  { id: "todo", title: "To Do", color: "border-blue-500" },
  { id: "in-progress", title: "Work In Progress", color: "border-green-500" },
  { id: "review", title: "Under Review", color: "border-orange-500" },
  { id: "completed", title: "Completed", color: "border-gray-500" },
] as const

const priorityColors = {
  low: "bg-gray-600",
  medium: "bg-yellow-600",
  high: "bg-red-600",
}

const platformColors = {
  Twitter: "bg-blue-600",
  LinkedIn: "bg-blue-700",
  Instagram: "bg-pink-600",
  Facebook: "bg-blue-800",
  YouTube: "bg-red-600",
  Reddit: "bg-orange-600",
  Analytics: "bg-purple-600",
}

export function KanbanBoard({ clientName, tasks, onTaskMove, onAddTask }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<Task["status"] | null>(null)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, status: Task["status"]) => {
    e.preventDefault()
    if (draggedTask) {
      onTaskMove(draggedTask, status)
      setDraggedTask(null)
    }
  }

  const getTasksByStatus = (status: Task["status"]) => {
    return tasks.filter((task) => task.status === status)
  }

  const handleAddTaskClick = (status: Task["status"]) => {
    setSelectedColumn(status)
    setShowAddTaskDialog(true)
  }

  const handleTaskSubmit = (taskData: Omit<Task, "id" | "status">) => {
    const newTask = {
      ...taskData,
      status: selectedColumn!,
    }
    onAddTask(newTask)
    setShowAddTaskDialog(false)
    setSelectedColumn(null)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{clientName} - Project Board</h2>
            <p className="text-gray-400 mt-1">Manage tasks and track progress</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => handleAddTaskClick("todo")} className="bg-white text-black hover:bg-gray-200">
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id as Task["status"])
            return (
              <div
                key={column.id}
                className={cn("space-y-4", column.color, "border-t-4 rounded-t-lg")}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id as Task["status"])}
              >
                <div className="flex items-center justify-between p-4 bg-black rounded-t-lg">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-white">{column.title}</h3>
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddTaskClick(column.id as Task["status"])}
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 px-2 pb-4">
                  {columnTasks.map((task) => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={cn(
                        "bg-black border-gray-800 cursor-move hover:border-gray-600 transition-colors",
                        draggedTask === task.id && "opacity-50",
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-wrap gap-1">
                            <Badge className={priorityColors[task.priority]} variant="default">
                              {task.priority}
                            </Badge>
                            <Badge
                              className={platformColors[task.platform as keyof typeof platformColors] || "bg-gray-600"}
                              variant="default"
                            >
                              {task.platform}
                            </Badge>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-white text-sm">{task.title}</h4>
                            <p className="text-xs text-gray-400 mt-1">{task.description}</p>
                          </div>

                          <p className="text-xs text-gray-500">{task.dateRange}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-2">
                              {task.assignees.map((assignee, index) => (
                                <div
                                  key={index}
                                  className="w-6 h-6 rounded-full bg-gray-600 border-2 border-black flex items-center justify-center"
                                >
                                  <span className="text-xs text-white font-medium">
                                    {assignee.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {task.comments > 0 && (
                              <div className="flex items-center space-x-1 text-gray-400">
                                <MessageCircle className="h-3 w-3" />
                                <span className="text-xs">{task.comments}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AddTaskDialog
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
        onSubmit={handleTaskSubmit}
        defaultStatus={selectedColumn}
      />
    </>
  )
}
