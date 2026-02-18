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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Subject } from "@/lib/types"

type DepartmentOption = { id: string; name: string }

type Props = {
    majorName: string
    onMajorNameChange: (v: string) => void
    departmentId: string
    onDepartmentIdChange: (v: string) => void
    duration: string
    onDurationChange: (v: string) => void
    description: string
    onDescriptionChange: (v: string) => void
    departments: DepartmentOption[]
    subjectIds: string[]
    onSubjectIdsChange: (ids: string[]) => void
    subjects: Subject[]
    submitLabel: string
    submitDisabled?: boolean
    isSubmitting?: boolean
    onCancel: () => void
}

export function MajorFields({
    majorName,
    onMajorNameChange,
    departmentId,
    onDepartmentIdChange,
    duration,
    onDurationChange,
    description,
    onDescriptionChange,
    departments,
    subjectIds,
    onSubjectIdsChange,
    subjects,
    submitLabel,
    submitDisabled = false,
    isSubmitting = false,
    onCancel,
}: Props) {
    function toggleSubject(id: string) {
        if (subjectIds.includes(id)) {
            onSubjectIdsChange(subjectIds.filter((s) => s !== id))
        } else {
            onSubjectIdsChange([...subjectIds, id])
        }
    }

    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="major-name">Major Name</Label>
                <Input
                    id="major-name"
                    value={majorName}
                    onChange={(e) => onMajorNameChange(e.target.value)}
                    placeholder="e.g. Computer Science"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentId || undefined} onValueChange={onDepartmentIdChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                                {d.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="major-duration">Duration (years)</Label>
                <Input
                    id="major-duration"
                    type="number"
                    min={1}
                    max={10}
                    value={duration}
                    onChange={(e) => onDurationChange(e.target.value)}
                    placeholder="e.g. 4"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="major-description">Description</Label>
                <Textarea
                    id="major-description"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Enter a description of the major..."
                    rows={4}
                />
            </div>

            <div className="space-y-2">
                <Label>Subjects</Label>
                <ScrollArea className="h-[180px] rounded-md border p-3">
                    <div className="space-y-2">
                        {subjects.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No subjects available.
                            </p>
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
                                    <span className="text-sm">{s.name}</span>
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
                    {isSubmitting ? "Saving…" : submitLabel}
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
