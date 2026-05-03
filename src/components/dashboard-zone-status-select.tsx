"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ZoneStatusOption = {
  value: string;
  label: string;
  description: string;
  color: string;
};

type Props = {
  value: string;
  options: ZoneStatusOption[];
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
};

export default function ZoneStatusSelect({ value, options, onChange, label = "Trạng thái khu vực", hint = "Trạng thái dùng chung cho mọi loại khu vực." }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((item) => item.value === value) ?? options[0], [options, value]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="zone-select-card" ref={wrapRef}>
      <span className="zone-select-label">{label}</span>
      <button type="button" className="zone-select-trigger" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="zone-select-trigger-main">
          <span className="zone-status-pill" style={{ background: selected.color }} />
          <span className="zone-select-trigger-text">
            <strong>{selected.label}</strong>
            <small>{selected.description}</small>
          </span>
        </span>
        <span className="zone-select-caret">▾</span>
      </button>

      {open && (
        <div className="zone-select-menu card" role="listbox" aria-label={label}>
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={value === item.value}
              className={`zone-select-option ${value === item.value ? "is-active" : ""}`}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              <span className="zone-status-pill" style={{ background: item.color }} />
              <span className="zone-select-option-text">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      <span className="zone-select-hint">{hint}</span>
    </div>
  );
}
