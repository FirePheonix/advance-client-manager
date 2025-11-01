"use client"

import { useState, useEffect } from "react"
import { Plus, Search, DollarSign, Calendar, User, Trash2, Edit, X, Save } from "lucide-react"
import { 
  getTeamMembers, 
  createTeamMember, 
  updateTeamMember, 
  deleteTeamMember, 
  type TeamMember 
} from "@/lib/database"

export default function TeamsPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    salary: "",
    status: "active" as "active" | "inactive" | "on_leave",
    payment_date: "",
    notes: ""
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    loadTeamMembers()
  }, [])

  async function loadTeamMembers() {
    try {
      setLoading(true)
      const data = await getTeamMembers()
      setTeamMembers(data)
    } catch (error) {
      console.error("Error loading team members:", error)
      showToast("Failed to load team members", "error")
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast)
        }
      }, 300)
    }, 3000)
  }

  const filteredMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) errors.name = "Name is required"
    if (!formData.email.trim()) errors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Email is invalid"
    if (!formData.role.trim()) errors.role = "Role is required"
    if (!formData.salary.trim()) errors.salary = "Salary is required"
    else if (isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
      errors.salary = "Salary must be a positive number"
    }
    if (!formData.payment_date) errors.payment_date = "Payment date is required"
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      salary: "",
      status: "active",
      payment_date: "",
      notes: ""
    })
    setFormErrors({})
    setCurrentMember(null)
  }

  const openDialog = (member?: TeamMember) => {
    if (member) {
      setCurrentMember(member)
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone || "",
        role: member.role,
        salary: member.salary.toString(),
        status: member.status,
        payment_date: member.payment_date.split('T')[0], // Convert to YYYY-MM-DD format
        notes: member.notes || ""
      })
    } else {
      resetForm()
    }
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      setSubmitLoading(true)
      
      const memberData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        role: formData.role.trim(),
        salary: Number(formData.salary),
        status: formData.status,
        payment_date: formData.payment_date,
        notes: formData.notes.trim() || undefined
      }
      
      if (currentMember) {
        // Update existing member
        const updatedMember = await updateTeamMember(currentMember.id, memberData)
        setTeamMembers(teamMembers.map(member => 
          member.id === currentMember.id ? updatedMember : member
        ))
        showToast("Team member updated successfully")
      } else {
        // Create new member
        const newMember = await createTeamMember(memberData)
        setTeamMembers([newMember, ...teamMembers])
        showToast("Team member added successfully")
      }
      
      closeDialog()
    } catch (error) {
      console.error("Error saving team member:", error)
      showToast("Failed to save team member", "error")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return
    }
    
    try {
      await deleteTeamMember(id)
      setTeamMembers(teamMembers.filter(member => member.id !== id))
      showToast("Team member deleted successfully")
    } catch (error) {
      console.error("Error deleting team member:", error)
      showToast("Failed to delete team member", "error")
    }
  }

  const totalMonthlySalaries = teamMembers
    .filter(member => member.status === 'active')
    .reduce((sum, member) => sum + Number(member.salary), 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600'
      case 'inactive': return 'bg-gray-600'
      case 'on_leave': return 'bg-yellow-600'
      default: return 'bg-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'inactive': return 'Inactive'
      case 'on_leave': return 'On Leave'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black">Teams</h1>
              <p className="text-gray-600 mt-2">Manage your team members, their tasks, and payments</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black">Teams</h1>
            <p className="text-gray-600 mt-2">Manage your team members, their tasks, and payments</p>
          </div>
          <button 
            onClick={() => openDialog()} 
            className="bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Team Member
          </button>
        </div>

        {/* Team Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Total Team Members</p>
                <div className="text-2xl font-bold text-black">{teamMembers.length}</div>
                <p className="text-xs text-blue-600 mt-1">All members</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Monthly Salaries</p>
                <div className="text-2xl font-bold text-black">₹{totalMonthlySalaries.toLocaleString()}</div>
                <p className="text-xs text-green-600 mt-1">Active members only</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Average Salary</p>
                <div className="text-2xl font-bold text-black">
                  ₹{teamMembers.length > 0 ? Math.round(totalMonthlySalaries / teamMembers.filter(m => m.status === 'active').length || 0).toLocaleString() : 0}
                </div>
                <p className="text-xs text-purple-600 mt-1">Per active member</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-white border border-gray-300 text-black placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-black font-semibold text-lg">{member.name}</h3>
                  <p className="text-gray-600 mt-1">{member.role}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(member.status)}`}>
                  {getStatusText(member.status)}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mb-4">
                <p className="text-sm text-gray-700">{member.email}</p>
                {member.phone && <p className="text-sm text-gray-700">{member.phone}</p>}
              </div>

              {/* Payment Info */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                <div>
                  <p className="text-sm text-gray-700">Monthly Salary</p>
                  <p className="text-lg font-bold text-green-600">₹{Number(member.salary).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">Payment Date</p>
                  <p className="text-sm text-black">
                    {new Date(member.payment_date).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {member.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">Notes</p>
                  <p className="text-sm text-black mt-1">{member.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => openDialog(member)}
                  className="flex-1 bg-white border border-gray-300 text-black hover:bg-gray-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id, member.name)}
                  className="flex-1 bg-white border border-gray-300 text-black hover:bg-gray-50 hover:text-red-600 px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No team members found</h3>
            <p className="text-gray-500">
              {searchTerm ? "Try adjusting your search terms" : "Add your first team member to get started"}
            </p>
          </div>
        )}

        {/* Add/Edit Dialog */}
        {showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-black">
                  {currentMember ? "Edit Team Member" : "Add Team Member"}
                </h2>
                <button
                  onClick={closeDialog}
                  className="text-gray-600 hover:text-black transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                  {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Senior Developer, Designer"
                  />
                  {formErrors.role && <p className="text-red-500 text-sm mt-1">{formErrors.role}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Salary (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter monthly salary"
                    min="0"
                  />
                  {formErrors.salary && <p className="text-red-500 text-sm mt-1">{formErrors.salary}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as "active" | "inactive" | "on_leave"})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.payment_date && <p className="text-red-500 text-sm mt-1">{formErrors.payment_date}</p>}
                </div>


                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="flex-1 px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {submitLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {currentMember ? "Update" : "Add"} Member
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}