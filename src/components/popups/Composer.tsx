/**
 * Composer — popup de criar/editar tarefa (§05 RF-03) OU nota (RF-05). O tipo
 * vem do useComposer (`kind`). Fecha com Escape/clique fora (Modal). Salva via
 * useTasks / useNotes (otimista).
 */
import { useEffect, useState, type FormEvent } from 'react'
import { useComposer } from '@/stores/useComposer'
import { useTasks, type TaskInput } from '@/hooks/useTasks'
import { useNotes, type NoteInput } from '@/hooks/useNotes'
import { PRIORITY_META, PRIORITY_ORDER } from '@/lib/domainMeta'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Priority } from '@/types/models'

export function Composer() {
  const { open, kind, editingTask, editingNote, close } = useComposer()
  const label = kind === 'note' ? 'nota' : 'tarefa'
  const isEditing = kind === 'note' ? editingNote !== null : editingTask !== null

  return (
    <Modal open={open} onClose={close} title={`${isEditing ? 'Editar' : 'Nova'} ${label}`}>
      {kind === 'note' ? <NoteForm /> : <TaskForm />}
    </Modal>
  )
}

// ─── Tarefa ───────────────────────────────────────────────────────────────
function TaskForm() {
  const { open, editingTask, taskPrefill, close } = useComposer()
  const { createTask, updateTask } = useTasks()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<Priority>('media')

  useEffect(() => {
    if (!open) return
    if (editingTask) {
      setTitle(editingTask.title)
      setDate(editingTask.date ?? '')
      setTime(editingTask.time ?? '')
      setPriority(editingTask.priority)
    } else {
      setTitle(taskPrefill?.title ?? '')
      setDate(taskPrefill?.date ?? '')
      setTime(taskPrefill?.time ?? '')
      setPriority(taskPrefill?.priority ?? 'media')
    }
  }, [open, editingTask, taskPrefill])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const payload: TaskInput = {
      title: trimmed,
      date: date || null,
      time: time || null,
      priority,
      projectId: editingTask?.projectId ?? taskPrefill?.projectId ?? null,
    }
    if (editingTask) updateTask({ id: editingTask.id, patch: payload })
    else createTask(payload)
    close()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        autoFocus
        placeholder="O que precisa ser feito?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Título da tarefa"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-tinta/60">
          Data
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs text-tinta/60">
          Hora
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
        </label>
      </div>

      <div>
        <span className="text-xs text-tinta/60">Prioridade</span>
        <div className="mt-1 flex gap-2">
          {PRIORITY_ORDER.map((p) => {
            const meta = PRIORITY_META[p]
            const active = priority === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors',
                  active
                    ? 'border-roxo-claro bg-white/5 text-tinta'
                    : 'border-white/10 text-tinta/60 hover:bg-white/5',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!title.trim()}>
          {editingTask ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}

// ─── Nota ─────────────────────────────────────────────────────────────────
function NoteForm() {
  const { open, editingNote, notePrefill, close } = useComposer()
  const { createNote, updateNote } = useNotes()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editingNote) {
      setTitle(editingNote.title ?? '')
      setContent(editingNote.content ?? '')
      setDate(editingNote.date ?? '')
      setTime(editingNote.time ?? '')
      setPinned(editingNote.pinned)
    } else {
      setTitle(notePrefill?.title ?? '')
      setContent(notePrefill?.content ?? '')
      setDate(notePrefill?.date ?? '')
      setTime(notePrefill?.time ?? '')
      setPinned(notePrefill?.pinned ?? false)
    }
  }, [open, editingNote, notePrefill])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    const c = content.trim()
    if (!t && !c) return // nota precisa de título ou conteúdo
    const payload: NoteInput = {
      title: t || null,
      content: c || null,
      date: date || null,
      time: time || null,
      pinned,
    }
    if (editingNote) updateNote({ id: editingNote.id, patch: payload })
    else createNote(payload)
    close()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        autoFocus
        placeholder="Título (opcional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Título da nota"
      />
      <textarea
        placeholder="Escreva a nota…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        aria-label="Conteúdo da nota"
        rows={4}
        className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-tinta placeholder:text-tinta/40 focus-visible:border-roxo-claro focus-visible:outline-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-tinta/60">
          Data
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs text-tinta/60">
          Hora
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-tinta/70">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="h-4 w-4 accent-roxo"
        />
        Fixar nota
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!title.trim() && !content.trim()}>
          {editingNote ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
