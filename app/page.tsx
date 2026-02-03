"use client";

import { useAppState } from "@/hooks/useAppState";
import Header from "@/components/shared/Header";
import StepIndicator from "@/components/shared/StepIndicator";
import FileUpload from "@/components/steps/FileUpload";
import ConfigureDefaults from "@/components/steps/ConfigureDefaults";
import ColumnMapper from "@/components/steps/ColumnMapper";
import GameQueue from "@/components/steps/GameQueue";
import SubmissionResults from "@/components/steps/SubmissionResults";

export default function Home() {
  const { state } = useAppState();

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <FileUpload />;
      case 2:
        return <ConfigureDefaults />;
      case 3:
        return <ColumnMapper />;
      case 4:
        return <GameQueue />;
      case 5:
        return <SubmissionResults />;
      default:
        return <FileUpload />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ss-background)]">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <StepIndicator currentStep={state.step} />
        {renderStep()}
      </main>
    </div>
  );
}

