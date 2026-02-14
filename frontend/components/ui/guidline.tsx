import { LucideIcon } from "lucide-react"

type GuidelineProps = {
    icon: LucideIcon
    title: string
    text: string
}

export function Guideline({ icon: Icon, title, text }: GuidelineProps) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{text}</p>
            </div>
        </div>
    )
}
