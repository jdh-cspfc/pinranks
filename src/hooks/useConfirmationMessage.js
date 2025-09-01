import { useState, useRef, useCallback } from 'react';

export const useConfirmationMessage = (timeoutMs = 3000) => {
  const [message, setMessage] = useState(null);
  const timeoutRef = useRef(null);

  const showMessage = useCallback((newMessage) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setMessage(newMessage);
    
    // Set timeout to clear message
    timeoutRef.current = setTimeout(() => {
      setMessage(null);
    }, timeoutMs);
  }, [timeoutMs]);

  const clearMessage = useCallback(() => {
    setMessage(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    message,
    showMessage,
    clearMessage,
    cleanup
  };
}; 