import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ValidationRunView } from './contract'
import type { RunValidations } from './mutations'
import { strings } from './strings'

const s = strings.run

/**
 * Run validations / Run again. Asks first only when something is lost: manual changes of the current run, or the
 * review of a validated import (design D4). Without either, it runs at once.
 */
export function RunButton({ view, runner }: { view: ValidationRunView; runner: RunValidations }) {
  const [open, setOpen] = useState(false)
  const lostChanges = view.run?.manualChangeCount ?? 0
  const invalidatesReview = view.importStatus === 'validated'

  const click = () => {
    if (lostChanges > 0 || invalidatesReview) setOpen(true)
    else void runner.run()
  }

  return (
    <>
      <Button size="sm" onClick={click} disabled={runner.running}>
        {view.run ? s.again : s.first}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{s.confirm.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                {lostChanges > 0 && <p>{s.confirm.lostChanges(lostChanges)}</p>}
                {invalidatesReview && <p>{s.confirm.invalidatesReview}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{s.confirm.keep}</AlertDialogCancel>
            <Button
              onClick={() => {
                setOpen(false)
                void runner.run()
              }}
            >
              {s.confirm.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
