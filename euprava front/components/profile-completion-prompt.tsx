"use client"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ProfileCompletionPromptProps {
  title: string
  description: string
  missingFields: string[]
  onComplete: () => void
}

export function ProfileCompletionPrompt({
  title,
  description,
  missingFields,
  onComplete,
}: ProfileCompletionPromptProps) {
  return (
    <Alert className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Complete Your Profile</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{description}</p>
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">Missing information:</p>
          <ul className="list-disc list-inside">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
        <Button onClick={onComplete} size="sm" className="mt-2">
          Complete Profile
        </Button>
      </AlertDescription>
    </Alert>
  )
}
