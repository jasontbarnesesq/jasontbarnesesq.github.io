import { useCallback, useRef, useState } from "react";

interface Props {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
}

export default function UploadDropzone({ disabled, onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file && file.type.startsWith("image/")) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  return (
    <div
      className={`dropzone ${isDragging ? "dropzone--active" : ""} ${disabled ? "dropzone--disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p>Drag & drop a source image here, or click to browse</p>
      <p className="dropzone__hint">Output: 5120×2160 (64:27) · PNG</p>
    </div>
  );
}
