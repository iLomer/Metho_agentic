"use client";

import { useState } from "react";

export interface UrlEntry {
  key: string;
  value: string;
}

export interface ServiceEntry {
  name: string;
  cost: string;
}

export const labelClass = "block font-mono text-xs text-neutral-500 mb-1.5";
export const inputClass =
  "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm text-neutral-200 placeholder-neutral-700 focus:border-cyan-800 focus:outline-none focus:ring-1 focus:ring-cyan-800/50";
export const errorClass = "mt-1 font-mono text-xs text-red-400";

interface ProjectFormFieldsProps {
  errors: Record<string, string>;
  defaultValues?: {
    name?: string;
    description?: string;
    stack?: string;
    ai_tools?: string;
    notes?: string;
    status?: string;
    urls?: UrlEntry[];
    services?: ServiceEntry[];
  };
  showStatus?: boolean;
}

export function ProjectFormFields({
  errors,
  defaultValues,
  showStatus = false,
}: ProjectFormFieldsProps) {
  const [urls, setUrls] = useState<UrlEntry[]>(
    defaultValues?.urls ?? [{ key: "", value: "" }],
  );
  const [services, setServices] = useState<ServiceEntry[]>(
    defaultValues?.services ?? [{ name: "", cost: "" }],
  );

  function addUrlRow() {
    setUrls((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeUrlRow(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function updateUrl(index: number, field: "key" | "value", val: string) {
    setUrls((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: val } : entry,
      ),
    );
  }

  function addServiceRow() {
    setServices((prev) => [...prev, { name: "", cost: "" }]);
  }

  function removeServiceRow(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function updateService(
    index: number,
    field: "name" | "cost",
    val: string,
  ) {
    setServices((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: val } : entry,
      ),
    );
  }

  return (
    <>
      <div>
        <label htmlFor="name" className={labelClass}>
          name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="my-project"
          defaultValue={defaultValues?.name ?? ""}
          className={inputClass}
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="what does this project do?"
          defaultValue={defaultValues?.description ?? ""}
          className={inputClass}
        />
      </div>

      {showStatus && (
        <div>
          <label htmlFor="status" className={labelClass}>
            status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "active"}
            className={inputClass}
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="stack" className={labelClass}>
          stack
        </label>
        <input
          id="stack"
          name="stack"
          type="text"
          placeholder="Next.js, Supabase, Tailwind"
          defaultValue={defaultValues?.stack ?? ""}
          className={inputClass}
        />
        <p className="mt-1 font-mono text-[10px] text-neutral-700">
          comma-separated
        </p>
      </div>

      <div>
        <label htmlFor="ai_tools" className={labelClass}>
          ai tools
        </label>
        <input
          id="ai_tools"
          name="ai_tools"
          type="text"
          placeholder="Claude Code, Cursor, v0"
          defaultValue={defaultValues?.ai_tools ?? ""}
          className={inputClass}
        />
        <p className="mt-1 font-mono text-[10px] text-neutral-700">
          comma-separated
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 font-mono text-xs text-neutral-500">
          urls
        </legend>
        <div className="space-y-2">
          {urls.map((entry, index) => (
            <div key={index} className="flex items-start gap-2">
              <input
                name="url_key"
                type="text"
                placeholder="label"
                value={entry.key}
                onChange={(e) => updateUrl(index, "key", e.target.value)}
                className={`${inputClass} max-w-32`}
              />
              <input
                name="url_value"
                type="text"
                placeholder="https://..."
                value={entry.value}
                onChange={(e) => updateUrl(index, "value", e.target.value)}
                className={inputClass}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrlRow(index)}
                  className="shrink-0 px-1.5 py-2 font-mono text-xs text-neutral-700 hover:text-red-400"
                  aria-label="Remove URL row"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addUrlRow}
          className="mt-1.5 font-mono text-xs text-cyan-600 hover:text-cyan-400"
        >
          + add url
        </button>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-xs text-neutral-500">
          connected services
        </legend>
        <div className="space-y-2">
          {services.map((entry, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-start gap-2">
                <input
                  name="service_name"
                  type="text"
                  placeholder="service"
                  value={entry.name}
                  onChange={(e) =>
                    updateService(index, "name", e.target.value)
                  }
                  className={inputClass}
                />
                <input
                  name="service_cost"
                  type="text"
                  inputMode="decimal"
                  placeholder="$/mo"
                  value={entry.cost}
                  onChange={(e) =>
                    updateService(index, "cost", e.target.value)
                  }
                  className={`${inputClass} max-w-24`}
                />
                {services.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeServiceRow(index)}
                    className="shrink-0 px-1.5 py-2 font-mono text-xs text-neutral-700 hover:text-red-400"
                    aria-label="Remove service row"
                  >
                    ×
                  </button>
                )}
              </div>
              {errors[`service_cost_${String(index)}`] && (
                <p className={errorClass}>
                  {errors[`service_cost_${String(index)}`]}
                </p>
              )}
              {errors[`service_name_${String(index)}`] && (
                <p className={errorClass}>
                  {errors[`service_name_${String(index)}`]}
                </p>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addServiceRow}
          className="mt-1.5 font-mono text-xs text-cyan-600 hover:text-cyan-400"
        >
          + add service
        </button>
      </fieldset>

      <div>
        <label htmlFor="notes" className={labelClass}>
          notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="anything else..."
          defaultValue={defaultValues?.notes ?? ""}
          className={inputClass}
        />
      </div>
    </>
  );
}
