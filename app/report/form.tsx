'use client'

import { useActionState } from 'react'
import { submitReport } from './actions'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {pending ? 'Submitting...' : 'Submit Report'}
    </button>
  )
}

export function ReportForm() {
  const [state, formAction] = useActionState(submitReport, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {state.error}
        </div>
      )}
      
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Issue Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue=""
          className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-white dark:focus:ring-white"
        >
          <option value="" disabled>Select an issue type</option>
          <option value="illegal_dumping">Illegal Dumping</option>
          <option value="missed_pickup">Missed Pickup</option>
          <option value="overflowing_public_bin">Overflowing Public Bin</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-white dark:focus:ring-white"
          placeholder="Please describe the issue in detail..."
        />
      </div>

      <SubmitButton />
    </form>
  )
}
