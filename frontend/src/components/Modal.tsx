import { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className={`relative w-full ${width} card p-0 overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between border-b border-ink-faint/15 px-5 py-4">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-light hover:text-ink text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-ink-faint/15 px-5 py-3 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
