// Step Indicator Component

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
}

const STEPS = [
  { step: 1, label: "Upload" },
  { step: 2, label: "Defaults" },
  { step: 3, label: "Map Columns" },
  { step: 4, label: "Queue" },
  { step: 5, label: "Submit" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {STEPS.map(({ step, label }, index) => (
        <div key={step} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === currentStep
                  ? "bg-[var(--ss-primary)] text-white"
                  : step < currentStep
                  ? "bg-[var(--ss-success)] text-white"
                  : "bg-[var(--ss-border)] text-[var(--ss-text-light)]"
              }`}
            >
              {step}
            </div>
            <span
              className={`text-sm ${
                step === currentStep
                  ? "text-[var(--ss-text)] font-semibold"
                  : "text-[var(--ss-text-light)]"
              }`}
            >
              {label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div className="w-12 h-0.5 bg-[var(--ss-border)] mx-2" />
          )}
        </div>
      ))}
    </div>
  );
}
