import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  length?: number;
  autoFocus?: boolean;
};

/** Six separate digit boxes that behave like one input (paste, backspace, arrows). */
export function OtpInput({ value, onChange, onComplete, length = 6, autoFocus }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setAt(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").replace(/\D/g, "").slice(0, length);
    onChange(joined);
    if (joined.length === length) onComplete?.();
  }

  return (
    <div className="mt-6 flex justify-between gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            if (!raw) return setAt(i, "");
            if (raw.length > 1) {
              // pasted or fast typing
              const joined = (value.slice(0, i) + raw).replace(/\D/g, "").slice(0, length);
              onChange(joined);
              refs.current[Math.min(joined.length, length - 1)]?.focus();
              if (joined.length === length) onComplete?.();
              return;
            }
            setAt(i, raw);
            refs.current[Math.min(i + 1, length - 1)]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              e.preventDefault();
              setAt(i - 1, "");
              refs.current[i - 1]?.focus();
            }
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          className="h-16 w-full min-w-0 rounded-2xl border border-border bg-card text-center font-display text-2xl outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      ))}
    </div>
  );
}
