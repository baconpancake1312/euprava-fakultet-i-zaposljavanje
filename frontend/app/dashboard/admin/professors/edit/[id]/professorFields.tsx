import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import type { Subject, Professor } from "@/lib/types"

type Department = {
  id: string
  name: string
}

type Props = {
  professor: Professor
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  dateOfBirth: string
  jmbg: string
  onProfileChange: (field: string, value: string) => void
  departments: Department[]
  departmentIds: string[]
  onDepartmentIdsChange: (ids: string[]) => void
  subjects: Subject[]
  subjectIds: string[]
  onSubjectIdsChange: (ids: string[]) => void
  submitLabel: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  onCancel: () => void
}

export function ProfessorEditFields({
  professor,
  firstName,
  lastName,
  email,
  phone,
  address,
  dateOfBirth,
  jmbg,
  onProfileChange,
  departments,
  departmentIds,
  onDepartmentIdsChange,
  subjects,
  subjectIds,
  onSubjectIdsChange,
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  onCancel,
}: Props) {
  const toggleDepartment = (id: string) => {
    if (departmentIds.includes(id)) {
      onDepartmentIdsChange(departmentIds.filter((d) => d !== id))
    } else {
      onDepartmentIdsChange([...departmentIds, id])
    }
  }

  const toggleSubject = (id: string) => {
    if (subjectIds.includes(id)) {
      onSubjectIdsChange(subjectIds.filter((s) => s !== id))
    } else {
      onSubjectIdsChange([...subjectIds, id])
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Professor</p>
        <p className="font-medium">
          {professor.first_name} {professor.last_name}
        </p>
        <p className="text-xs text-muted-foreground">{professor.email}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <input
            id="first_name"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={firstName}
            onChange={(e) => onProfileChange("first_name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <input
            id="last_name"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={lastName}
            onChange={(e) => onProfileChange("last_name", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <input
          id="email"
          type="email"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={email}
          onChange={(e) => onProfileChange("email", e.target.value)}
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <input
            id="phone"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={phone}
            onChange={(e) => onProfileChange("phone", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jmbg">JMBG</Label>
          <input
            id="jmbg"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={jmbg}
            onChange={(e) => onProfileChange("jmbg", e.target.value)}
            maxLength={13}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <input
          id="address"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={address}
          onChange={(e) => onProfileChange("address", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_of_birth">Date of Birth</Label>
        <input
          id="date_of_birth"
          type="date"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={dateOfBirth}
          onChange={(e) => onProfileChange("date_of_birth", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Departments</Label>
        <ScrollArea className="h-[200px] rounded-md border p-3">
          <div className="space-y-2">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments available.</p>
            ) : (
              departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={departmentIds.includes(dept.id)}
                    onCheckedChange={() => toggleDepartment(dept.id)}
                  />
                  <span className="text-sm">{dept.name}</span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <Label>Subjects</Label>
        <ScrollArea className="h-[200px] rounded-md border p-3">
          <div className="space-y-2">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects available.</p>
            ) : (
              subjects.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={subjectIds.includes(s.id)}
                    onCheckedChange={() => toggleSubject(s.id)}
                  />
                  <span className="text-sm">
                    {s.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitDisabled}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

