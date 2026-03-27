'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from './toast'

function withoutKeys(params: URLSearchParams, keys: string[]) {
  const next = new URLSearchParams(params)
  keys.forEach((k) => next.delete(k))
  return next
}

export default function ToastRouterListener() {
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString())
    const handledKeys: string[] = []

    const binsCreated = sp.get('bins_created') === '1'
    const binsDeleted = sp.get('bins_deleted') === '1'
    const binsError = sp.get('bins_error') ?? ''
    const binsErrorDetail = sp.get('bins_error_detail') ?? ''

    if (binsCreated) {
      toast.success('Bin added.')
      handledKeys.push('bins_created')
    }
    if (binsDeleted) {
      toast.success('Bin deleted.')
      handledKeys.push('bins_deleted')
    }
    if (binsError) {
      if (binsError === 'duplicate') toast.error('That bin code already exists.')
      else if (binsError === 'not_admin')
        toast.error('Your account is not an admin. Promote your user, then try again.')
      else if (binsError === 'missing_address') toast.error('Address is required to add a bin.')
      else if (binsError === 'rls') toast.error('Bin write blocked by RLS. Apply the admin policies, then try again.')
      else toast.error(binsErrorDetail || 'Bin update failed.')
      handledKeys.push('bins_error', 'bins_error_detail')
    }

    const submitted = sp.get('submitted') === '1'
    if (submitted) {
      toast.success('Pickup request submitted.')
      handledKeys.push('submitted')
    }

    const error = sp.get('error') ?? ''
    if (error) {
      if (error === 'bin_code_mismatch') toast.error('Bin code mismatch. Please enter the correct bin code.')
      else if (error === 'must_verify_first') toast.error('Verify the pickup first, then complete it.')
      else if (error === 'invalid_weight') toast.error('Invalid weight. Enter a valid number.')
      else if (error === 'log_failed') toast.error('Could not create a pickup log entry. Apply pickup log schema first.')
      else toast.error(error)
      handledKeys.push('error')
    }

    const toastMessage = sp.get('toast') ?? ''
    const toastType = (sp.get('toast_type') ?? 'info') as 'success' | 'error' | 'warning' | 'info'
    const toastTitle = sp.get('toast_title') ?? ''
    if (toastMessage) {
      if (toastType === 'success') toast.success(toastMessage, toastTitle || undefined)
      else if (toastType === 'error') toast.error(toastMessage, toastTitle || undefined)
      else if (toastType === 'warning') toast.warning(toastMessage, toastTitle || undefined)
      else toast.info(toastMessage, toastTitle || undefined)
      handledKeys.push('toast', 'toast_type', 'toast_title')
    }

    if (handledKeys.length === 0) return

    const cleaned = withoutKeys(sp, handledKeys)
    const cleanedQuery = cleaned.toString()
    router.replace(cleanedQuery ? `${pathname}?${cleanedQuery}` : pathname, { scroll: false })
  }, [pathname, router, searchParams, toast])

  return null
}
