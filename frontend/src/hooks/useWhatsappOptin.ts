import { useState } from 'react';
import { whatsappApi, ApiError } from '../lib/api';

export function useWhatsappOptin() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const optin = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      await whatsappApi.optin();
      setStatus('success');
    } catch (e) {
      setStatus('error');
      if (e instanceof ApiError) {
        if (e.status === 400) {
          setErrorMessage('No phone number on your account. Please update your profile first.');
        } else if (e.status === 502) {
          setErrorMessage('Messaging service unavailable. Try again later.');
        } else {
          setErrorMessage(e.message || 'Something went wrong');
        }
      } else {
        setErrorMessage('Check your connection and try again.');
      }
    }
  };

  const reset = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  return { optin, status, errorMessage, reset };
}
