import React from "react";

interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownProps {
  label: string;
  value: string | number | null;
  onChange: (value: any) => void;
  options: DropdownOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export default function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "Please select",
  required = false,
  disabled = false,
  helperText,
}: DropdownProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[var(--ss-text)] mb-2">
        {label}
        {required && <span className="text-[var(--ss-error)] ml-1">*</span>}
      </label>
      <select
        value={value || ""}
        onChange={(e) => {
          const selectedValue = e.target.value;
          // Try to convert to number if it's a numeric string
          const numValue = Number(selectedValue);
          onChange(isNaN(numValue) ? selectedValue : numValue);
        }}
        disabled={disabled}
        className="ss-input"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && (
        <p className="text-xs text-[var(--ss-text-light)] mt-1">{helperText}</p>
      )}
    </div>
  );
}
