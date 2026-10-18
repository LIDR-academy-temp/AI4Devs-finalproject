import { Card, CardContent } from '@/components/ui/card'
import { AccountPicker, useAccountChoice } from './AccountPicker'
import { DropZone } from './files/DropZone'
import { strings } from './strings'

/** Reconciliation › New Reconciliation: the account and the files of a new import (README §1.3, HU1). */
export function NewReconciliationPage() {
  const choice = useAccountChoice()
  const account = choice.account

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{strings.newTitle}</h1>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <AccountPicker choice={choice} />
          <DropZone
            disabled={!account}
            hint={account ? strings.upload.hint : strings.upload.chooseAccount}
            onFiles={() => {}}
          />
        </CardContent>
      </Card>
    </section>
  )
}
