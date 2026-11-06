import React from 'react';

/** Shared, keyboard-friendly form pieces for onboarding and centre registration. */

export const inputClass = (invalid?: boolean) =>
  `h-11 w-full rounded-xl border ${
    invalid ? 'border-[#C46E4E] bg-[#FDF6F2]' : 'border-[#E8E4D6] bg-[#FBFAF3]'
  } px-3.5 text-sm text-[#1E3F42] placeholder:text-[#9AA59F] focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 outline-none transition-all`;

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
      <label htmlFor={id} className="block text-sm font-medium text-[#3F5250] mb-1.5">
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-[#7A8A84]">(optional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-[#7A8A84]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-[#A4543A]">
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
    <legend className="block text-sm font-medium text-[#3F5250] mb-1.5">{legend}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const checked = value.includes(o.value);
        return (
          <label
            key={o.value}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
              checked ? 'border-[#0B4A52] bg-[#0B4A52]/5 text-[#0B4A52] font-semibold' : 'border-[#E8E4D6] bg-white text-[#3F5250]'
            }`}
          >
            <input
              type="checkbox"
              name={name}
              checked={checked}
              onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
              className="w-4 h-4"
            />
            {o.label}
          </label>
        );
      })}
    </div>
    {error && (
      <p id={`${name}-error`} className="mt-1 text-xs font-medium text-[#A4543A]">
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
        <span key={i} className={`h-2 rounded-full transition-all ${i + 1 === step ? 'w-6 bg-[#0B4A52]' : 'w-2 bg-[#CBD9C6]'}`} />
      ))}
    </div>
    <span className="text-xs font-semibold text-[#5B6B66]">
      Step {step} of {total}
    </span>
  </div>
);

export const OnboardingShell: React.FC<{ children: React.ReactNode; onLogout: () => void }> = ({ children, onLogout }) => (
  <div className="min-h-screen bg-[#FAF9F4] text-[#1E3F42] antialiased">
    <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
      <span className="text-lg font-bold text-[#0B4A52]">CareQ</span>
      <button type="button" onClick={onLogout} className="text-xs text-[#5B6B66] hover:text-[#173F42] underline cursor-pointer">
        Log out
      </button>
    </header>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    <footer className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 text-[11px] text-[#7A8A84]">
      Demo account: everything you enter is saved only in this browser and removed by Reset demo. No email is sent.
    </footer>
  </div>
);
