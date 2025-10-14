import { useState, useRef, useCallback } from 'react';

export const useConfirmationMessage = (timeoutMs = 5000) => {
  const [message, setMessage] = useState(null);
  const timeoutRef = useRef(null);

  const showMessage = useCallback((newMessage) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Support both string and object formats
    // Object format: { text: string, onUndo?: function }
    const messageObj = typeof newMessage === 'string' 
      ? { text: newMessage } 
      : newMessage;
    
    setMessage(messageObj);
    
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