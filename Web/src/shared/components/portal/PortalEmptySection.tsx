import { EmptyState, type EmptyStateProps } from '../admin/EmptyState'
import { PortalSection } from './PortalSection'

/** Empty state dentro del panel estándar del portal. */
export function PortalEmptySection(props: EmptyStateProps) {
  return (
    <PortalSection variant="padded">
      <EmptyState {...props} />
    </PortalSection>
  )
}
