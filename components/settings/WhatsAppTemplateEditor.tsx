"use client";

// ============================================================
// WhatsAppTemplateEditor
// Owner UI to view and customise WhatsApp message templates.
//
// Features:
//  - Lists all message types (confirmation, reminder_24h, etc.)
//  - Live character count and placeholder validation
//  - Live preview rendered with SAMPLE_VARIABLES
//  - Save via PATCH /api/businesses/:id/apply-template
//  - Reset individual template to industry default
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  validateTemplate,
  renderTemplate,
  SAMPLE_VARIABLES,
} from "@/lib/whatsapp/template-renderer";

// ── Types ────────────────────────────────────────────────────
interface TemplateField {
  key: string;
  label: string;
  description: string;
}

const TEMPLATE_FIELDS: TemplateField[] = [
  {
    key:         "confirmation",
    label:       "Booking Confirmation",
    description: "Sent immediately after a booking is created.",
  },
  {
    key:         "reminder_24h",
    label:       "24-Hour Reminder",
    description: "Sent the day before the appointment.",
  },
  {
    key:         "reminder_2h",
    label:       "2-Hour Reminder",
    description: "Sent 2 hours before the appointment.",
  },
  {
    key:         "no_show",
    label:       "No-Show Follow-up",
    description: "Sent when a customer misses their appointment.",
  },
  {
    key:         "feedback",
    label:       "Feedback Request",
    description: "Sent after the appointment is completed.",
  },
  {
    key:         "loyalty_reward",
    label:       "Loyalty Reward",
    description: "Sent when a customer reaches a visit milestone.",
  },
  {
    key:         "staff_otp",
    label:       "Staff OTP",
    description: "Login code sent to staff via WhatsApp. Use {otp} placeholder.",
  },
];

const AVAILABLE_PLACEHOLDERS = [
  "{customer_name}",
  "{business_name}",
  "{service_name}",
  "{staff_name}",
  "{booking_date}",
  "{booking_time}",
  "{duration_minutes}",
  "{total_amount}",
  "{advance_paid}",
  "{remaining_amount}",
  "{business_address}",
  "{business_phone}",
  "{booking_url}",
  "{google_review_link}",
  "{visit_count}",
  "{loyalty_reward}",
  "{otp}",
];

interface Props {
  businessId:    string;
  industryType?: string;
  /** Current templates from DB, keyed by message type */
  initialTemplates?: Record<string, string>;
  /** Called after a successful save */
  onSaved?: () => void;
}

// ── Helper: debounce ─────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Component ────────────────────────────────────────────────
export default function WhatsAppTemplateEditor({
  businessId,
  initialTemplates = {},
  onSaved,
}: Props) {
  // ── State ─────────────────────────────────────────────────
  const [activeKey, setActiveKey]     = useState<string>(TEMPLATE_FIELDS[0].key);
  const [templates, setTemplates]     = useState<Record<string, string>>(initialTemplates);
  const [isDirty, setIsDirty]         = useState<Record<string, boolean>>({});
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  const activeTemplate = templates[activeKey] ?? "";
  const debouncedText  = useDebounce(activeTemplate, 300);

  // ── Derived: validation + preview ────────────────────────
  const validation = validateTemplate(debouncedText, AVAILABLE_PLACEHOLDERS.map(p => p.replace(/[{}]/g, "")));
  const rendered   = renderTemplate(debouncedText, SAMPLE_VARIABLES);

  // ── Handlers ─────────────────────────────────────────────
  const handleChange = useCallback((value: string) => {
    setTemplates(prev => ({ ...prev, [activeKey]: value }));
    setIsDirty(prev  => ({ ...prev, [activeKey]: true  }));
    setSaveSuccess(false);
  }, [activeKey]);

  const insertPlaceholder = useCallback((placeholder: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? activeTemplate.length;
    const end   = el.selectionEnd   ?? activeTemplate.length;
    const next  = activeTemplate.slice(0, start) + placeholder + activeTemplate.slice(end);
    handleChange(next);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + placeholder.length;
      el.setSelectionRange(pos, pos);
    });
  }, [activeTemplate, handleChange]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Only send keys that have been edited
    const dirtyTemplates: Record<string, string> = {};
    Object.entries(isDirty).forEach(([key, dirty]) => {
      if (dirty) dirtyTemplates[key] = templates[key] ?? "";
    });

    try {
      const res = await fetch(`/api/businesses/${businessId}/apply-template`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          config: { whatsapp_templates: dirtyTemplates },
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Save failed");
      }

      setIsDirty({});
      setSaveSuccess(true);
      onSaved?.();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTemplates(prev => {
      const next = { ...prev };
      delete next[activeKey];
      return next;
    });
    setIsDirty(prev => ({ ...prev, [activeKey]: true }));
    setSaveSuccess(false);
  };

  const anyDirty = Object.values(isDirty).some(Boolean);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">WhatsApp Message Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Customise the messages sent to customers. Use <code className="bg-gray-100 px-1 rounded text-xs">{"{placeholder}"}</code> syntax.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
          <button
            onClick={handleSave}
            disabled={!anyDirty || saving}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar: template list */}
        <nav className="flex lg:flex-col gap-1">
          {TEMPLATE_FIELDS.map(field => (
            <button
              key={field.key}
              onClick={() => setActiveKey(field.key)}
              className={[
                "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                activeKey === field.key
                  ? "bg-green-50 text-green-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100",
                isDirty[field.key] ? "after:content-['•'] after:ml-1 after:text-amber-500" : "",
              ].join(" ")}
            >
              {field.label}
            </button>
          ))}
        </nav>

        {/* Main area */}
        <div className="flex flex-col gap-4">
          {/* Description */}
          <div className="text-sm text-gray-500">
            {TEMPLATE_FIELDS.find(f => f.key === activeKey)?.description}
          </div>

          {/* Placeholder chips */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Insert placeholder</p>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PLACEHOLDERS.map(ph => (
                <button
                  key={ph}
                  onClick={() => insertPlaceholder(ph)}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs
                             text-gray-700 font-mono transition-colors"
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>

          {/* Editor + preview side-by-side on wide screens */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Editor */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Template</label>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{activeTemplate.length} chars</span>
                  {isDirty[activeKey] && (
                    <button
                      onClick={handleReset}
                      className="text-red-500 hover:text-red-700"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={activeTemplate}
                onChange={e => handleChange(e.target.value)}
                rows={10}
                spellCheck={false}
                placeholder="Enter your message template…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                           font-mono resize-y focus:outline-none focus:ring-2
                           focus:ring-green-500 focus:border-transparent"
              />

              {/* Validation errors */}
              {!validation.valid && (
                <ul className="space-y-1">
                  {validation.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                      <span>⚠</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Missing variables warning */}
              {rendered.missingVars.length > 0 && (
                <p className="text-xs text-amber-600">
                  Unknown placeholders:{" "}
                  {rendered.missingVars.map(v => `{${v}}`).join(", ")}
                </p>
              )}
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Preview</label>
              <div className="relative bg-[#ECE5DD] rounded-xl p-4 min-h-[14rem]">
                {/* WhatsApp-style chat bubble */}
                <div className="max-w-[85%] bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {rendered.message || (
                    <span className="text-gray-400 italic">No content</span>
                  )}
                  <span className="block text-right text-[10px] text-gray-400 mt-1">
                    10:30 AM ✓✓
                  </span>
                </div>

                {/* Character count hint */}
                {activeTemplate.length > 1600 && (
                  <p className="mt-2 text-xs text-red-600">
                    ⚠ Message exceeds 1,600 characters — Meta may split it.
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Preview uses sample data. Actual values will be substituted when sent.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
