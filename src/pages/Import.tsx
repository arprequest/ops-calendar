import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { clsx } from 'clsx'

interface ParsedTask {
  category: string
  title: string
  when: string
}

export default function ImportPage() {
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [yearStart, setYearStart] = useState(new Date().getFullYear())
  const [yearEnd, setYearEnd] = useState(new Date().getFullYear() + 1)

  const queryClient = useQueryClient()

  const importMutation = useMutation({
    mutationFn: async (tasks: ParsedTask[]) => {
      const response = await fetch('/api/import/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, yearStart, yearEnd }),
      })
      if (!response.ok) throw new Error('Import failed')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      setParsedTasks([])
    },
  })

  const handleFile = useCallback((file: File) => {
    setError(null)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

        // Map to our format
        const tasks: ParsedTask[] = json.map((row) => ({
          category: String(row.category || row.Category || '').trim(),
          title: String(row.Task || row.task || row.Title || row.title || '').trim(),
          when: String(row.When || row.when || row.Recurrence || row.recurrence || '').trim(),
        })).filter((task) => task.title && task.when)

        setParsedTasks(tasks)
      } catch {
        setError('Failed to parse Excel file. Please ensure it has columns: category, Task, When')
      }
    }

    reader.onerror = () => {
      setError('Failed to read file')
    }

    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFile(file)
    } else {
      setError('Please drop an Excel file (.xlsx or .xls)')
    }
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Import Tasks from Excel</h1>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'card p-8 text-center border-2 border-dashed transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-gray-600">
              Drop your Excel file here, or{' '}
              <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                browse
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Expected columns: category, Task, When
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Preview */}
      {parsedTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Preview ({parsedTasks.length} tasks found)
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Generate instances from</label>
                <select
                  value={yearStart}
                  onChange={(e) => setYearStart(Number(e.target.value))}
                  className="input w-24"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 1).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <span className="text-gray-600">to</span>
                <select
                  value={yearEnd}
                  onChange={(e) => setYearEnd(Number(e.target.value))}
                  className="input w-24"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Recurrence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedTasks.slice(0, 20).map((task, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">{task.category}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{task.title}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{task.when}</td>
                  </tr>
                ))}
                {parsedTasks.length > 20 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-500 text-center">
                      ... and {parsedTasks.length - 20} more tasks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setParsedTasks([])}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => importMutation.mutate(parsedTasks)}
              disabled={importMutation.isPending}
              className="btn btn-primary"
            >
              {importMutation.isPending ? 'Importing...' : `Import ${parsedTasks.length} Tasks`}
            </button>
          </div>
        </div>
      )}

      {importMutation.isSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
          Successfully imported tasks!
        </div>
      )}
    </div>
  )
}
