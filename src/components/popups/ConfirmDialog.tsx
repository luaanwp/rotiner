/** Diálogo de confirmação, dirigido pelo useConfirm. Montado uma vez no shell. */
import { useConfirm } from '@/stores/useConfirm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export function ConfirmDialog() {
  const { open, title, message, confirmLabel, danger, accept, cancel } =
    useConfirm()

  return (
    <Modal open={open} onClose={cancel} title={title} maxWidth="max-w-sm">
      {message && <p className="mb-5 text-sm text-tinta/70">{message}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={cancel}>
          Cancelar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={accept}>
          {confirmLabel ?? 'Confirmar'}
        </Button>
      </div>
    </Modal>
  )
}
