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

type MajorOption = { id: string; name: string }

type Props = {
  name: string
  onNameChange: (v: string) => void
  majorId: string
  onMajorIdChange: (v: string) => void
  majors: MajorOption[]
  year: string
  onYearChange: (v: string) => void
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
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  onCancel,
}: Props) {
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
