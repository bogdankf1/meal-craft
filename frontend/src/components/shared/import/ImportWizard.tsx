"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types for the import wizard
export type ImportStep = "method" | "input" | "review" | "complete";

export interface ImportMethod {
  id: string;
  icon: ReactNode;
  titleKey: string;
  descriptionKey: string;
  disabled?: boolean;
  comingSoon?: boolean;
  primary?: boolean;
}

export interface ParsedItem {
  id: string;
  [key: string]: unknown;
}

// Context for sharing state between wizard components
interface ImportWizardContextType<T extends ParsedItem> {
  step: ImportStep;
  setStep: (step: ImportStep) => void;
  selectedMethod: string | null;
  setSelectedMethod: (method: string | null) => void;
  parsedItems: T[];
  setParsedItems: (items: T[]) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  reset: () => void;
}

const ImportWizardContext = createContext<ImportWizardContextType<ParsedItem> | null>(null);

export function useImportWizard<T extends ParsedItem>() {
  const context = useContext(ImportWizardContext);
  if (!context) {
    throw new Error("useImportWizard must be used within ImportWizardProvider");
  }
  return context as unknown as ImportWizardContextType<T>;
}

// Step indicator component
interface StepIndicatorProps {
  steps: { key: ImportStep; label: string }[];
  currentStep: ImportStep;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const stepOrder: ImportStep[] = ["method", "input", "review", "complete"];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const stepIndex = stepOrder.indexOf(step.key);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = step.key === currentStep;

        return (
          <div key={step.key} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:inline",
                  isCurrent ? "font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Main wizard provider component
interface ImportWizardProviderProps<T extends ParsedItem> {
  children: ReactNode;
  onComplete?: (items: T[]) => void;
  initialMethod?: string;
  initialStep?: ImportStep;
}

export function ImportWizardProvider<T extends ParsedItem>({
  children,
  initialMethod,
  initialStep,
}: ImportWizardProviderProps<T>) {
  const [step, setStep] = useState<ImportStep>(initialStep || "method");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(initialMethod || null);
  const [parsedItems, setParsedItems] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const reset = () => {
    setStep("method");
    setSelectedMethod(null);
    setParsedItems([]);
    setIsProcessing(false);
  };

  const contextValue: ImportWizardContextType<ParsedItem> = {
    step,
    setStep,
    selectedMethod,
    setSelectedMethod,
    parsedItems: parsedItems as ParsedItem[],
    setParsedItems: setParsedItems as (items: ParsedItem[]) => void,
    isProcessing,
    setIsProcessing,
    reset,
  };

  return (
    <ImportWizardContext.Provider value={contextValue}>
      {children}
    </ImportWizardContext.Provider>
  );
}

// Main wizard container
interface ImportWizardProps {
  children: ReactNode;
  showSteps?: boolean;
  stepLabels?: { method: string; input: string; review: string; complete: string };
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ImportWizard({
  children,
  showSteps = true,
  stepLabels,
  onBack,
  showBackButton = true,
}: ImportWizardProps) {
  const t = useTranslations("import");
  const { step, setStep, reset } = useImportWizard();

  const defaultLabels = {
    method: t("steps.method"),
    input: t("steps.input"),
    review: t("steps.review"),
    complete: t("steps.complete"),
  };

  const labels = stepLabels || defaultLabels;

  const steps: { key: ImportStep; label: string }[] = [
    { key: "method", label: labels.method },
    { key: "input", label: labels.input },
    { key: "review", label: labels.review },
    { key: "complete", label: labels.complete },
  ];

  const handleBack = () => {
    if (step === "input") {
      setStep("method");
    } else if (step === "review") {
      setStep("input");
    } else if (step === "complete") {
      reset();
    } else if (onBack) {
      onBack();
    }
  };

  const canGoBack = step !== "method" || onBack;

  return (
    <div className="space-y-4">
      {showSteps && <StepIndicator steps={steps} currentStep={step} />}

      {showBackButton && canGoBack && step !== "complete" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("back")}
        </Button>
      )}

      {children}
    </div>
  );
}

// Export step content wrapper
interface ImportStepContentProps {
  step: ImportStep;
  children: ReactNode;
}

export function ImportStepContent({ step, children }: ImportStepContentProps) {
  const { step: currentStep } = useImportWizard();

  if (currentStep !== step) {
    return null;
  }

  return <>{children}</>;
}
