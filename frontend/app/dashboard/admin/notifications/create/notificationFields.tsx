import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Major, Student, Professor } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
}

type Props = {
  title: string
  content: string
  recipientType: "id" | "role" | "department" | "major"
  recipientValue: string
  onChange: (field: string, value: string) => void
  departments: DepartmentRef[]
  majors: Major[]
  students: Student[]
  professors: Professor[]
  submitLabel: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  onCancel: () => void
}

const ROLES = [
  { value: "STUDENT", label: "Student" },
  { value: "PROFESSOR", label: "Professor" },
  { value: "ADMIN", label: "Admin" },
  { value: "EMPLOYER", label: "Employer" },
  { value: "CANDIDATE", label: "Candidate" },
  { value: "STUDENTSKA_SLUZBA", label: "Studentska Služba" },
]

export function NotificationFields({
  title,
  content,
  recipientType,
  recipientValue,
  onChange,
  departments,
  majors,
  students,
  professors,
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  onCancel,
}: Props) {
  const getRecipientOptions = () => {
    switch (recipientType) {
      case "department":
        return departments.map((dept) => ({
          value: dept.id,
          label: dept.name,
        }))
      case "major":
        return majors.map((major) => ({
          value: major.id,
          label: major.name,
        }))
      case "role":
        return ROLES
      case "id":
        return [
          ...students.map((student) => ({
            value: student.id,
            label: `${student.first_name} ${student.last_name} (Student)`,
          })),
          ...professors.map((professor) => ({
            value: professor.id,
            label: `${professor.first_name} ${professor.last_name} (Professor)`,
          })),
        ]
      default:
        return []
    }
  }

  const recipientOptions = getRecipientOptions()

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Notification title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => onChange("content", e.target.value)}
          placeholder="Notification content..."
          required
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipient_type">Recipient Type</Label>
        <Select
          value={recipientType}
          onValueChange={(value) => onChange("recipient_type", value)}
        >
          <SelectTrigger id="recipient_type" className="w-full">
            <SelectValue placeholder="Select recipient type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="major">Major</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="id">Specific User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recipientType && (
        <div className="space-y-2">
          <Label htmlFor="recipient_value">
            {recipientType === "department"
              ? "Department"
              : recipientType === "major"
              ? "Major"
              : recipientType === "role"
              ? "Role"
              : "User"}
          </Label>
          <Select
            value={recipientValue}
            onValueChange={(value) => onChange("recipient_value", value)}
          >
            <SelectTrigger id="recipient_value" className="w-full">
              <SelectValue placeholder={`Select ${recipientType === "id" ? "user" : recipientType}`} />
            </SelectTrigger>
            <SelectContent>
              {recipientOptions.length === 0 ? (
                <SelectItem value="" disabled>
                  No options available
                </SelectItem>
              ) : (
                recipientOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitDisabled}>
          {isSubmitting ? "Creating…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  )
}
