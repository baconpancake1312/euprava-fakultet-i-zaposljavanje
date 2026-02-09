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
import type { Major, Professor } from "@/lib/types"

type Props = {
    departmentName: string
    onDepartmentNameChange: (v: string) => void
    headId: string
    onHeadIdChange: (v: string) => void
    majorIds: string[]
    onMajorIdsChange: (ids: string[]) => void
    staffIds: string[]
    onStaffIdsChange: (ids: string[]) => void
    professors: Professor[]
    majors: Major[]
    submitLabel: string
    submitDisabled?: boolean
    isSubmitting?: boolean
    onCancel: () => void
}

export function DepartmentFields({
    departmentName,
    onDepartmentNameChange,
    headId,
    onHeadIdChange,
    majorIds,
    onMajorIdsChange,
    staffIds,
    onStaffIdsChange,
    professors,
    majors,
    submitLabel,
    submitDisabled = false,
    isSubmitting = false,
    onCancel,
}: Props) {
    function toggleMajor(id: string) {
        if (majorIds.includes(id)) {
            onMajorIdsChange(majorIds.filter((m) => m !== id))
        } else {
            onMajorIdsChange([...majorIds, id])
        }
    }

    function toggleStaff(id: string) {
        if (staffIds.includes(id)) {
            onStaffIdsChange(staffIds.filter((s) => s !== id))
        } else {
            onStaffIdsChange([...staffIds, id])
        }
    }

    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="department-name">Department Name</Label>
                <Input
                    id="department-name"
                    value={departmentName}
                    onChange={(e) => onDepartmentNameChange(e.target.value)}
                    placeholder="e.g. Department of Computer Science"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label>Department head</Label>
                <Select value={headId || undefined} onValueChange={onHeadIdChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a professor" />
                    </SelectTrigger>
                    <SelectContent>
                        {professors.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.first_name} {p.last_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Majors</Label>
                <ScrollArea className="h-[180px] rounded-md border p-3">
                    <div className="space-y-2">
                        {majors.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No majors available.
                            </p>
                        ) : (
                            majors.map((major) => (
                                <label
                                    key={major.id}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <Checkbox
                                        checked={majorIds.includes(major.id)}
                                        onCheckedChange={() =>
                                            toggleMajor(major.id)
                                        }
                                    />
                                    <span className="text-sm">{major.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="space-y-2">
                <Label>Staff (professors)</Label>
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
                                        checked={staffIds.includes(p.id)}
                                        onCheckedChange={() =>
                                            toggleStaff(p.id)
                                        }
                                    />
                                    <span className="text-sm">
                                        {p.first_name} {p.last_name}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="flex gap-2">
                <Button
                    type="submit"
                    disabled={submitDisabled}
                >
                    {isSubmitting ? "Creating…" : submitLabel}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
            </div>
        </>
    )
}
