import { strings } from '../layout/strings'
import { PageMessage } from './PageMessage'

export function ForbiddenPage() {
  return <PageMessage title={strings.forbiddenTitle} body={strings.forbiddenBody} />
}
