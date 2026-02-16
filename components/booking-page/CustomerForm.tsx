"use client";

// ============================================================
// BookFlow — Customer Form with Dynamic Template Fields
// Standard: Name, phone, email
// Dynamic: from template.customer_fields (Hair type, Blood group, etc)
// ============================================================

import { cn } from "@/lib/utils";
import type { CustomField } from "@/lib/templates/types";

export interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  customFields: Record<string, unknown>;
}

interface CustomerFormProps {
  value: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  templateFields?: CustomField[];
  errors?: Record<string, string>;
  primaryColor?: string;
}

export function CustomerForm({
  value,
  onChange,
  templateFields = [],
  errors = {},
  primaryColor = "#7C3AED",
}: CustomerFormProps) {
  function set(
    field: keyof Omit<CustomerFormData, "customFields">,
    val: string
  ) {
    onChange({ ...value, [field]: val });
  }

  function setCustom(id: string, val: unknown) {
    onChange({
      ...value,
      customFields: { ...value.customFields, [id]: val },
    });
  }

  const inputCls = (hasError: boolean) =>
    cn(
      "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2",
      hasError
        ? "border-red-300 bg-red-50 focus:ring-red-400"
        : "border-gray-200 bg-white focus:border-gray-400"
    );

  const focusRingColor = { "--tw-ring-color": primaryColor } as React.CSSProperties;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Your Details</h2>
      <div className="space-y-4">
        <Field label="Full Name" required error={errors.name}>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Meera Shah"
            className={inputCls(!!errors.name)}
            style={!errors.name ? focusRingColor : undefined}
          />
        </Field>

        <Field label="Mobile Number" required error={errors.phone}>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+1 234 567 8900, +91 98765 43210, +65 9123 4567"
            className={inputCls(!!errors.phone)}
            style={!errors.phone ? focusRingColor : undefined}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="optional"
            className={inputCls(!!errors.email)}
            style={!errors.email ? focusRingColor : undefined}
          />
        </Field>

        {templateFields.map((field) => (
          <DynamicField
            key={field.id}
            field={field}
            value={value.customFields[field.id]}
            onChange={(val) => setCustom(field.id, val)}
            error={errors[`customFields.${field.id}`]}
            primaryColor={primaryColor}
          />
        ))}
      </div>
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
  error,
  primaryColor,
}: {
  field: CustomField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  primaryColor: string;
}) {
  const { type, label, options = [], placeholder, required } = field;
  const inputCls = (hasErr: boolean) =>
    cn(
      "w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2",
      hasErr
        ? "border-red-300 bg-red-50"
        : "border-gray-200 bg-white focus:border-gray-400"
    );

  return (
    <Field label={label} required={required} error={error}>
      {type === "text" || type === "phone" ? (
        <input
          type={type === "phone" ? "tel" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls(!!error)}
        />
      ) : type === "textarea" ? (
        <textarea
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(inputCls(!!error), "resize-none")}
        />
      ) : type === "select" ? (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(!!error)}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : type === "multiselect" ? (
        <div className="flex flex-wrap gap-2 mt-1">
          {options.map((o) => {
            const selected = ((value as string[]) ?? []).includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  const cur = (value as string[]) ?? [];
                  onChange(
                    selected ? cur.filter((v) => v !== o) : [...cur, o]
                  );
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border-2 transition-all",
                  selected
                    ? "text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
                style={selected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
              >
                {o}
              </button>
            );
          })}
        </div>
      ) : type === "boolean" ? (
        <div className="flex gap-3 mt-1">
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt === "Yes")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium border-2 transition-all",
                value === (opt === "Yes")
                  ? "text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
              style={
                value === (opt === "Yes")
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : undefined
              }
            >
              {opt}
            </button>
          ))}
        </div>
      ) : type === "date" ? (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(!!error)}
        />
      ) : null}
    </Field>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
