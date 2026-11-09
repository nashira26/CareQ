import React from 'react';

/** Shared, keyboard-friendly form pieces for onboarding and centre registration. */

export const inputClass = (invalid?: boolean) =>
  `h-12 w-full rounded-xl border ${
    invalid ? 'border-error bg-white' : 'border-line-strong bg-white'
  } px-3.5 text-base text-ink placeholder:text-ink-faint focus:border-brand focus:ring-[3px] focus:ring-brand/20 outline-none transition-[border-color,box-shadow] disabled:bg-stone disabled:text-ink-faint`;

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (aria: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ id, label, hint, error, optional, children }) => {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-[15px] font-bold text-ink mb-1.5">
        {label}
        {optional && <span className="ml-1 text-sm font-normal text-ink-soft">(optional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
};

/** Group of checkboxes with a visible legend and an error message. */
export const CheckboxGroup: React.FC<{
  legend: string;
  name: string;
  options: { label: string; value: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}> = ({ legend, name, options, value, onChange, error }) => (
  <fieldset aria-describedby={error ? `${name}-error` : undefined}>
    <legend className="block text-[15px] font-bold text-ink mb-1.5">{legend}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const checked = value.includes(o.value);
        return (
          <label
            key={o.value}
            className={`inline-flex items-center gap-2 min-h-11 rounded-xl border px-3.5 py-2 text-sm cursor-pointer transition-colors ${
              checked ? 'border-brand bg-mint text-brand font-bold' : 'border-line-strong bg-white text-ink hover:bg-mint-50'
            }`}
          >
            <input
              type="checkbox"
              name={name}
              checked={checked}
              onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
              className="w-[18px] h-[18px] accent-brand"
            />
            {o.label}
          </label>
        );
      })}
    </div>
    {error && (
      <p id={`${name}-error`} className="mt-1.5 text-xs font-semibold text-error">
        {error}
      </p>
    )}
  </fieldset>
);

/** Focus the first field that has an error (by id), after React renders the messages. */
export const focusFirstError = (ids: string[]) =>
  window.requestAnimationFrame(() => {
    for (const id of ids) {
      const el = document.getElementById(id) ?? document.querySelector<HTMLElement>(`[name="${id}"]`);
      if (el) {
        el.focus();
        return;
      }
    }
  });

export const ProgressDots: React.FC<{ step: number; total: number }> = ({ step, total }) => (
  <div className="flex items-center gap-3" aria-label={`Step ${step} of ${total}`}>
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 rounded-full transition-all duration-300 ${i + 1 === step ? 'w-6 bg-coral' : i + 1 < step ? 'w-2 bg-leaf' : 'w-2 bg-stone'}`} />
      ))}
    </div>
    <span className="text-xs font-semibold text-cq-muted">
      Step {step} of {total}
    </span>
  </div>
);

export const OnboardingShell: React.FC<{ children: React.ReactNode; onLogout: () => void }> = ({ children, onLogout }) => (
  <div className="min-h-screen bg-cq-page text-cq-ink-body antialiased">
    <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
      <span className="text-lg font-bold text-cq-brand">CareQ</span>
      <button type="button" onClick={onLogout} className="text-xs text-cq-muted hover:text-cq-ink underline cursor-pointer">
        Log out
      </button>
    </header>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    <footer className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 text-xs text-cq-soft">
      Demo account: everything you enter is saved only in this browser and removed by Reset demo. No email is sent.
    </footer>
  </div>
);
