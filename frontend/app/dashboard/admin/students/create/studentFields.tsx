import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import type { Major } from "@/lib/types"

type Props = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  address: string
  dateOfBirth: string
  jmbg: string
  onChange: (field: string, value: string) => void
  majors: Major[]
  majorId: string
  onMajorIdChange: (majorId: string) => void
  year: string
  onYearChange: (year: string) => void
  scholarship: boolean
  onScholarshipChange: (scholarship: boolean) => void
  submitLabel: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  onCancel: () => void
}

export function StudentFields({
  firstName,
  lastName,
  email,
  password,
  phone,
  address,
  dateOfBirth,
  jmbg,
  onChange,
  majors,
  majorId,
  onMajorIdChange,
  year,
  onYearChange,
  scholarship,
  onScholarshipChange,
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  onCancel,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={firstName}
            onChange={(e) => onChange("first_name", e.target.value)}
            placeholder="John"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={lastName}
            onChange={(e) => onChange("last_name", e.target.value)}
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="student@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onChange("password", e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+381..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jmbg">JMBG</Label>
          <Input
            id="jmbg"
            value={jmbg}
            onChange={(e) => onChange("jmbg", e.target.value)}
            placeholder="13-digit identifier"
            maxLength={13}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => onChange("address", e.target.value)}
          placeholder="Street, number, city"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_of_birth">Date of Birth</Label>
        <Input
          id="date_of_birth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => onChange("date_of_birth", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="major">Major</Label>
        <Select value={majorId || "__none__"} onValueChange={(value) => onMajorIdChange(value === "__none__" ? "" : value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a major (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No major assigned</SelectItem>
            {majors.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="year">Year</Label>
        <Input
          id="year"
          type="number"
          min={1}
          max={6}
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          placeholder="1"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={scholarship}
              onCheckedChange={(checked) => onScholarshipChange(checked === true)}
            />
            <span>Scholarship</span>
          </Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitDisabled}>
          {isSubmitting ? "Creating…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
