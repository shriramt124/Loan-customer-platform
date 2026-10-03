export function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  testid,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  testid: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <label
          htmlFor={testid}
          className="text-sm font-bold text-secondary-foreground"
        >
          {label}
        </label>
        <output
          id={`${testid}-value`}
          htmlFor={testid}
          className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground"
          data-testid={`${testid}-value`}
        >
          {display}
        </output>
      </div>
      <input
        id={testid}
        className="w-full accent-primary"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
        data-testid={testid}
      />
      <div className="mt-1 flex justify-between text-[.68rem] text-muted-foreground">
        <span>{label.toLowerCase().includes('amount') ? '₹50,000' : min}</span>
        <span>{label.toLowerCase().includes('amount') ? '₹50 lakh' : max}</span>
      </div>
    </div>
  );
}