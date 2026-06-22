import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  prefix?: string;
  suffix?: string;
  note?: string;
  example?: string;
};

export function TextField({ label, prefix, suffix, note, example, ...props }: TextFieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__control">
        {prefix && <span className="field__addon">{prefix}</span>}
        <input {...props} />
        {suffix && <span className="field__addon field__addon--suffix">{suffix}</span>}
      </span>
      {note && <small>{note}</small>}
      {example && <small className="field__example">{example}</small>}
    </label>
  );
}
