import { useRef } from "react";

const ACCEPTED = ".jpg,.jpeg,.png,.pdf";

export function FileDropzone({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    onChange([...files, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="cursor-pointer rounded-lg border-2 border-dashed border-ink-faint/40 bg-surface-subtle px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/40 transition-colors"
      >
        <p className="text-sm text-ink-light">
          <span className="font-medium text-brand-600">Click to upload</span> or drag and drop
        </p>
        <p className="mt-1 text-xs text-ink-faint">JPG, PNG, or PDF — up to 10MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-1.5 text-xs"
            >
              <span className="truncate text-ink">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-ink-faint hover:text-red-600 ml-2"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
