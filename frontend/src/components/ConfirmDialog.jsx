import { createContext, useContext, useCallback, useRef, useState } from 'react';
import { AlertTriangle, Trash2, LogOut, CheckCircle, X } from 'lucide-react';

// ─── Context ─────────────────────────────────────────────────────────────────
const ConfirmCtx = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx.confirm;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);   // { title, message, variant, resolve }
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, message, variant = 'danger', confirmText, cancelText } = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setState({ title, message, variant, confirmText, cancelText });
    });
  }, []);

  const handleConfirm = () => {
    setState(null);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setState(null);
    resolveRef.current?.(false);
  };

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmDialog
          title={state.title}
          message={state.message}
          variant={state.variant}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmCtx.Provider>
  );
}

// ─── Dialog UI ────────────────────────────────────────────────────────────────
const VARIANTS = {
  danger:  { icon: Trash2,         iconBg: 'bg-red-100',    iconColor: 'text-red-600',    btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
  warning: { icon: AlertTriangle,  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  btn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400' },
  logout:  { icon: LogOut,         iconBg: 'bg-red-100',    iconColor: 'text-red-600',    btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
  success: { icon: CheckCircle,    iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' },
  confirm: { icon: CheckCircle,    iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' },
};

function ConfirmDialog({ title, message, variant = 'danger', confirmText, cancelText, onConfirm, onCancel }) {
  const v = VARIANTS[variant] || VARIANTS.danger;
  const Icon = v.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onCancel()}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog card */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm
        border border-gray-100 dark:border-gray-800
        animate-[scale-in_0.15s_ease-out]">

        {/* Close X */}
        <button onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
            hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X size={16} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full ${v.iconBg} flex items-center justify-center mb-4`}>
            <Icon size={22} className={v.iconColor} />
          </div>

          {/* Text */}
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
            {title || 'Are you sure?'}
          </h3>
          {message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200
              hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            {cancelText || 'Cancel'}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
              ${v.btn} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}>
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
