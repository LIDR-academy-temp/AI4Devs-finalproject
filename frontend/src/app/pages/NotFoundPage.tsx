import { strings } from '../layout/strings'
import { PageMessage } from './PageMessage'

export function NotFoundPage() {
  return <PageMessage title={strings.notFoundTitle} body={strings.notFoundBody} />
}
