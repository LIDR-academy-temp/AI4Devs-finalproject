type Props = {
  name: string
  onEdit: () => void
  onDelete: () => void
}

export function AdminCatalogRowActions({ name, onEdit, onDelete }: Props) {
  return (
    <td className="text-center cq-actions">
      <button type="button" className="btn btn-link btn-sm" onClick={onEdit} aria-label={`Editar ${name}`}>
        <i className="mdi mdi-pencil" />
      </button>
      <button type="button" className="btn btn-link btn-sm text-danger" onClick={onDelete} aria-label={`Eliminar ${name}`}>
        <i className="mdi mdi-delete" />
      </button>
    </td>
  )
}
