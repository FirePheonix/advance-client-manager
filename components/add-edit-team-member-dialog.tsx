import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function AddEditTeamMemberDialog({
  open,
  onOpenChange,
  member,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: TeamMember | null
  onSave: (data: Omit<TeamMember, "id" | "created_at">) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("")
  const [salary, setSalary] = useState("")
  const [status, setStatus] = useState("active")
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (member) {
      setName(member.name)
      setEmail(member.email)
      setPhone(member.phone || "")
      setRole(member.role)
      setSalary(String(member.salary))
      setStatus(member.status)
      setPaymentDate(member.payment_date ? new Date(member.payment_date) : new Date())
      setNotes(member.notes || "")
    } else {
      resetForm()
    }
  }, [member])

  const resetForm = () => {
    setName("")
    setEmail("")
    setPhone("")
    setRole("")
    setSalary("")
    setStatus("active")
    setPaymentDate(new Date())
    setNotes("")
  }

  const handleSubmit = () => {
    if (!name || !email || !role || !salary || !paymentDate) {
      alert("Please fill all required fields")
      return
    }

    onSave({
      name,
      email,
      phone,
      role,
      salary: Number(salary),
      status,
      payment_date: paymentDate.toISOString(),
      notes,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Team Member" : "Add New Team Member"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Monthly Salary (₹) *</Label>
              <Input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="active" className="hover:bg-gray-700">Active</SelectItem>
                  <SelectItem value="inactive" className="hover:bg-gray-700">Inactive</SelectItem>
                  <SelectItem value="on_leave" className="hover:bg-gray-700">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-gray-800 border-gray-700",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-white text-black hover:bg-gray-200">
            {member ? "Update" : "Add"} Team Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}