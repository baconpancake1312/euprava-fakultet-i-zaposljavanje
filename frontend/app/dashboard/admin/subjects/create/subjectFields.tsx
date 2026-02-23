import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

type MajorOption = { id: string; name: string }
type ProfessorOption = { id: string; name: string }

type Props = {
  name: string
  onNameChange: (v: string) => void
  majorId: string
  onMajorIdChange: (v: string) => void
  majors: MajorOption[]
  year: string
  onYearChange: (v: string) => void
  semester: string
  onSemesterChange: (v: string) => void
  professorIds: string[]
  onProfessorIdsChange: (ids: string[]) => void
  professors: ProfessorOption[]
  submitLabel: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  onCancel: () => void
}

export function SubjectFields({
  name,
  onNameChange,
  majorId,
  onMajorIdChange,
  majors,
  year,
  onYearChange,
  semester,
  onSemesterChange,
  professorIds,
  onProfessorIdsChange,
  professors,
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  onCancel,
}: Props) {
  function toggleProfessor(id: string) {
    if (professorIds.includes(id)) {
      onProfessorIdsChange(professorIds.filter((p) => p !== id))
    } else {
      onProfessorIdsChange([...professorIds, id])
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="subject-name">Subject Name</Label>
        <Input
          id="subject-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Introduction to Programming"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Major</Label>
        <Select value={majorId || undefined} onValueChange={onMajorIdChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a major" />
          </SelectTrigger>
          <SelectContent>
            {majors.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject-year">Year</Label>
        <Input
          id="subject-year"
          type="number"
          min={1}
          max={6}
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          placeholder="e.g. 1"
        />
      </div>

      <div className="space-y-2">
        <Label>Semester</Label>
        <Select value={semester || undefined} onValueChange={onSemesterChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">First semester</SelectItem>
            <SelectItem value="2">Second semester</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Professors</Label>
        <ScrollArea className="h-[180px] rounded-md border p-3">
          <div className="space-y-2">
            {professors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No professors available.
              </p>
            ) : (
              professors.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={professorIds.includes(p.id)}
                    onCheckedChange={() => toggleProfessor(p.id)}
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

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
