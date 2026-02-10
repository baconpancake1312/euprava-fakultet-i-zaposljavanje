import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  submitLabel: string
  submitDisabled?: boolean
  isSubmitting?: boolean
  onCancel: () => void
}

export function ProfessorFields({
  firstName,
  lastName,
  email,
  password,
  phone,
  address,
  dateOfBirth,
  jmbg,
  onChange,
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  onCancel,
}: Props) {
  return (
    <>
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
          placeholder="professor@example.com"
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

