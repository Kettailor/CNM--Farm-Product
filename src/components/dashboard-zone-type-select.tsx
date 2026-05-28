"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ZoneTypeKey = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

export type ZoneTypeOption = {
  key: ZoneTypeKey;
  label: string;
  color: string;
  description: string;
};

type Props = {
  value: ZoneTypeKey;
  options: ZoneTypeOption[];
  onChange: (value: ZoneTypeKey) => void;
};

export default function ZoneTypeSelect({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((item) => item.key === value) ?? options[0], [options, value]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="zone-select-card" ref={wrapRef}>
      <span className="zone-select-label">Loại khu vực</span>
      <button type="button" className="zone-select-trigger" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="zone-select-trigger-main">
          <span className="zone-select-dot" style={{ background: selected.color }} />
          <span className="zone-select-trigger-text">
            <strong>{selected.label}</strong>
            <small>{selected.description}</small>
          </span>
        </span>
        <span className="zone-select-caret">▾</span>
      </button>

      {open && (
        <div className="zone-select-menu card" role="listbox" aria-label="Chọn loại khu vực">
          {options.map((item) => (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={value === item.key}
              className={`zone-select-option ${value === item.key ? "is-active" : ""}`}
              onClick={() => {
                onChange(item.key);
                setOpen(false);
              }}
            >
              <span className="zone-select-dot" style={{ background: item.color }} />
              <span className="zone-select-option-text">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      <span className="zone-select-hint">Chọn loại khu vực để tự nạp trường mặc định.</span>
    </div>
  );
}
