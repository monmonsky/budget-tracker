import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, Settings, X } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface WidgetWrapperProps {
  id: string
  title: string
  description?: string
  icon?: LucideIcon
  children: ReactNode
  onRemove?: () => void
  onSettings?: () => void
  isDraggable?: boolean
  className?: string
}

export function WidgetWrapper({
  id,
  title,
  description,
  icon: Icon,
  children,
  onRemove,
  onSettings,
  isDraggable = false,
  className = ''
}: WidgetWrapperProps) {
  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isDraggable && (
              <div className="drag-handle cursor-move text-muted-foreground hover:text-foreground transition-colors">
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{title}</CardTitle>
              {description && (
                <CardDescription className="text-xs truncate">{description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettings}
                className="h-7 w-7 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {children}
      </CardContent>
    </Card>
  )
}
