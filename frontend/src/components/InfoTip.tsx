import { Info } from 'lucide-react'
import { useId } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * An info button whose explanation shows in a tooltip on hover and on focus, and closes with Escape without moving the
 * focus (web-analysis-polish design D4). The explanation exists once where the button sits: a visually hidden span that
 * a screen reader reads when it goes through the surrounding card, and that the button points to as its description.
 * Our aria-describedby goes after the props of the trigger, so it replaces the one of Radix, which only exists while
 * the tooltip is open. The provider is local: this is the first tooltip of the app (#90 may lift it to App).
 */
export function InfoTip({ label, description }: { label: string; description: string }) {
  const descriptionId = useId()
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={label}
              aria-describedby={descriptionId}
              className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info aria-hidden="true" className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </>
  )
}
