"use client";
import { cn } from "@/lib/utils";
import type { CustomField } from "@/lib/templates/types";

export interface CustomerFormData {
  name:         string;
  phone:        string;
  email:        string;
  customFields: Record<string, unknown>;
}

interface CustomerFormProps {
  value:           CustomerFormData;
  onChange:        (data: CustomerFormData) => void;
  templateFields?: CustomField[];  // from business.custom_config.customer_fields
  errors?:         Record<string, string>;
}

export function CustomerForm({
  value,
  onChange,
  templateFields = [],
  errors = {},
}: CustomerFormProps) {
  function set(field: keyof Omit<CustomerFormData, "customFields">, val: string) {
    onChange({ ...value, [field]: val });
  }

  function setCustom(id: string, val: unknown) {
    onChange({ ...value, customFields: { ...value.customFields, [id]: val } });
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Your Details</h2>
      <div className="space-y-4">
        {/* Name */}
        <Field label="Full Name" required error={errors.name}>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Meera Shah"
            className={inputCls(!!errors.name)}
          />
        </Field>

        {/* Phone */}
        <Field label="Mobile Number" required error={errors.phone}>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+1 234 567 8900, +91 98765 43210, +65 9123 4567"
            className={inputCls(!!errors.phone)}
          />
        </Field>

        {/* Email */}
        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="optional"
            className={inputCls(!!errors.email)}
          />
        </Field>

        {/* Dynamic industry-specific fields */}
        {templateFields.map((field) => (
          <DynamicField
            key={field.id}
            field={field}
            value={value.customFields[field.id]}
            onChange={(val) => setCustom(field.id, val)}
            error={errors[`customFields.${field.id}`]}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Dynamic field renderer
// ─────────────────────────────────────────
function DynamicField({
  field, value, onChange, error,
}: {
  field:    CustomField;
  value:    unknown;
  onChange: (v: unknown) => void;
  error?:   string;
}) {
  const { type, label, options = [], placeholder, required } = field;

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
            <option key={o} value={o}>{o}</option>
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
                  onChange(selected ? cur.filter((v) => v !== o) : [...cur, o]);
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border-2 transition-all",
                  selected
                    ? "bg-violet-600 border-violet-600 text-white"
                    : "border-gray-200 text-gray-600 hover:border-violet-300"
                )}
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
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "border-gray-200 text-gray-600 hover:border-violet-300"
              )}
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

// ─────────────────────────────────────────
// Shared field wrapper
// ─────────────────────────────────────────
function Field({
  label, required, error, children,
}: {
  label:    string;
  required?: boolean;
  error?:   string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}{" "}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400",
    hasError
      ? "border-red-300 bg-red-50"
      : "border-gray-200 bg-white focus:border-violet-400"
  );
}
