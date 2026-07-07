import { useCallback, useState } from 'react';
import type { ToastConfig } from '@/components/ui/Toast';

export function useToast() {
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const showToast = useCallback((config: ToastConfig) => {
    setToast(config);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}
