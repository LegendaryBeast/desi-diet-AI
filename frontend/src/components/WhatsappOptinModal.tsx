'use client'

import { useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { getToken } from '../lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  userPhone: string | null
  accessToken?: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function WhatsappOptinModal({ isOpen, onClose, userPhone, accessToken }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    setStatus('loading')
    try {
      const token = accessToken || getToken() || ''
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiUrl}/whatsapp/optin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Something went wrong')
      }

      setStatus('success')
      setTimeout(() => {
        onClose()
        setStatus('idle')
      }, 4000)

    } catch (e: any) {
      setErrorMsg(e.message || 'Could not send message. Try again.')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">

        {/* No phone number */}
        {!userPhone && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">No phone number found</h2>
            <p className="text-gray-500 text-sm mb-6">
              Please add a phone number to your profile before using WhatsApp chat.
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <a href="/profile" className="flex-1 py-2 bg-green-500 text-white rounded-lg text-center font-medium hover:bg-green-600">
                Go to Profile
              </a>
            </div>
          </>
        )}

        {/* Has phone - idle/loading/error */}
        {userPhone && status !== 'success' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FaWhatsapp className="text-green-500" size={22} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Start chatting on WhatsApp</h2>
            </div>

            <p className="text-gray-500 text-sm mb-2">We'll send your first message to:</p>
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-2 flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <span className="font-mono font-medium text-gray-800">{userPhone}</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Make sure this number is active on WhatsApp before confirming.
            </p>

            {status === 'error' && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={status === 'loading'}
                className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={status === 'loading'}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Sending...
                  </>
                ) : '✓ Send Message'}
              </button>
            </div>
          </>
        )}

        {/* Success state */}
        {status === 'success' && (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Message sent!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Check WhatsApp on <span className="font-medium text-gray-700">{userPhone}</span> — PushtiAI has sent you a message.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
              >
                Done
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
