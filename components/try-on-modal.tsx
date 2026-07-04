"use client";

import Image from "next/image";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { runTryOnFlow, type TryOnFlowStep } from "@/services/tryon";

type TryOnModalProps = {
  garmentImagePath: string;
  isOpen: boolean;
  onClose: () => void;
};

const acceptedTypes = ["image/jpeg", "image/png"];
const generationSteps: Array<{ id: TryOnFlowStep; label: string; detail: string }> =
  [
    {
      id: "uploading",
      label: "Preparing image",
      detail: "Packaging your photo for the try-on preview.",
    },
    {
      id: "generating",
      label: "Generating try-on",
      detail: "Compositing the garment with realistic fit and drape.",
    },
    {
      id: "finalizing",
      label: "Finalizing result",
      detail: "Polishing the preview and preparing the image.",
    },
  ];

export function TryOnModal({
  garmentImagePath,
  isOpen,
  onClose,
}: TryOnModalProps) {
  const inputId = useId();
  const activeRequest = useRef<AbortController | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState<TryOnFlowStep>("uploading");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [resultView, setResultView] = useState<"after" | "before">("after");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const portalRoot = typeof document === "undefined" ? null : document.body;

  if (!isOpen || !portalRoot) {
    return null;
  }

  function closeModal() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsGenerating(false);
    onClose();
  }

  function resetTryOn() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setSelectedFile(null);
    setFileName("");
    setError("");
    setIsPreviewLoading(false);
    setIsGenerating(false);
    setActiveStep("uploading");
    setGeneratedImageUrl("");
    setResultView("after");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  const selectFile = (file: File | undefined) => {
    setError("");
    setGeneratedImageUrl("");
    setResultView("after");

    if (!file) {
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setError("Please upload a JPG or PNG image.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setIsPreviewLoading(true);
    setFileName(file.name);

    const nextPreviewUrl = URL.createObjectURL(file);
    window.setTimeout(() => {
      setPreviewUrl(nextPreviewUrl);
      setIsPreviewLoading(false);
    }, 450);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  };

  const generatePreview = async () => {
    if (!selectedFile) {
      setError("Please upload a JPG or PNG image first.");
      return;
    }

    activeRequest.current?.abort();

    const controller = new AbortController();
    activeRequest.current = controller;
    setError("");
    setGeneratedImageUrl("");
    setIsGenerating(true);
    setActiveStep("uploading");

    const garmentImageUrl = new URL(
      garmentImagePath,
      window.location.origin,
    ).toString();

    const result = await runTryOnFlow(selectedFile, garmentImageUrl, {
      signal: controller.signal,
      timeoutMs: 120000,
      onStepChange: setActiveStep,
    });

    if (activeRequest.current === controller) {
      activeRequest.current = null;
    }

    setIsGenerating(false);

    if (result.status === "error" || !result.data?.imageUrl) {
      setError(result.error ?? "Try-on generation failed.");
      return;
    }

    setGeneratedImageUrl(result.data.imageUrl);
    setResultView("after");
  };

  const displayedResultImage =
    resultView === "after" ? generatedImageUrl : (previewUrl ?? generatedImageUrl);
  const hasResult = Boolean(generatedImageUrl);
  const activeStepIndex = generationSteps.findIndex(
    (step) => step.id === activeStep,
  );
  const progressWidth = `${((activeStepIndex + 1) / generationSteps.length) * 100}%`;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-md modal-backdrop-enter"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <section
        className="modal-panel-enter max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-white/70 bg-white shadow-2xl shadow-zinc-950/25"
        role="dialog"
        aria-modal="true"
        aria-labelledby="try-on-title"
      >
        <div className="flex items-start justify-between gap-6 border-b border-zinc-200 px-6 py-5 sm:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-teal-700">
              MirrorTry preview
            </p>
            <h2
              id="try-on-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950"
            >
              {hasResult ? "Your AI try-on result" : "AI virtual try-on"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
            aria-label="Close try on modal"
          >
            Close
          </button>
        </div>

        {hasResult ? (
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
            <div className="bg-zinc-950 p-4 sm:p-6">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-900 shadow-2xl shadow-zinc-950/30">
                {displayedResultImage ? (
                  <Image
                    key={displayedResultImage}
                    src={displayedResultImage}
                    alt={
                      resultView === "after"
                        ? "Generated AI try-on result"
                        : "Original uploaded photo"
                    }
                    fill
                    unoptimized
                    className="object-cover transition duration-500"
                  />
                ) : null}
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-950 shadow-sm backdrop-blur">
                  {resultView === "after" ? "After" : "Before"}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-teal-700">
                  Styled preview
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                  Sculpted Everyday Shirt
                </h3>
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  Review the AI-generated fit, compare it with your original
                  photo, then save the image or complete your purchase.
                </p>

                <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                  <div className="grid grid-cols-2 gap-1">
                    {(["after", "before"] as const).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setResultView(view)}
                        className={`rounded-md px-4 py-3 text-sm font-semibold capitalize transition ${
                          resultView === view
                            ? "bg-white text-zinc-950 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-950"
                        }`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <a
                  href={generatedImageUrl}
                  download="mirrortry-ai-result.jpg"
                  className="flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:border-zinc-950 hover:shadow-lg"
                >
                  Download image
                </a>
                <button
                  type="button"
                  onClick={resetTryOn}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:border-teal-700 hover:text-teal-800 hover:shadow-lg hover:shadow-teal-900/10"
                >
                  Try another photo
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-lg"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[0.9fr_1.1fr]">
              <div>
            <label
              htmlFor={inputId}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
                isDragging
                  ? "border-teal-700 bg-teal-50"
                  : "border-zinc-300 bg-zinc-50 hover:border-zinc-950 hover:bg-white"
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                +
              </span>
              <span className="mt-5 text-base font-semibold text-zinc-950">
                Drop your photo here
              </span>
              <span className="mt-2 max-w-56 text-sm leading-6 text-zinc-500">
                or click to browse. JPG and PNG files only.
              </span>
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleInputChange}
                className="sr-only"
              />
            </label>
            {error ? (
              <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
            ) : null}
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-950">Image preview</p>
              {fileName ? (
                <p className="max-w-40 truncate text-xs text-zinc-500">
                  {fileName}
                </p>
              ) : null}
            </div>

            <div className="relative mt-4 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100">
              {isPreviewLoading ? (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-100" />
              ) : previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Uploaded try on preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-zinc-200" />
                  <p className="mt-5 text-sm font-medium text-zinc-700">
                    Your selected photo will appear here.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={generatePreview}
              disabled={!previewUrl || isPreviewLoading || isGenerating}
              className="mt-4 w-full rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isGenerating
                ? "Generating..."
                : error
                  ? "Retry try-on"
                : "Generate try-on"}
            </button>
              </div>
            </div>

            <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-6 sm:px-8">
          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-sm font-semibold text-zinc-950">AI result</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Generation runs through the reusable service layer with polling,
                retry, errors, and timeout handling.
              </p>
            </div>
            <div className="relative min-h-44 overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all duration-500">
              {isGenerating ? (
                <div className="relative min-h-80 overflow-hidden bg-zinc-950 p-5 text-white">
                  <div className="absolute inset-0 opacity-40 loading-grid" />
                  <div className="absolute -left-20 top-10 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl loading-glow" />
                  <div className="absolute -right-16 bottom-4 h-44 w-44 rounded-full bg-white/10 blur-3xl loading-glow-delayed" />

                  <div className="relative grid gap-5 sm:grid-cols-[0.85fr_1.15fr] sm:items-center">
                    <div className="space-y-3">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-white/10">
                        <div className="absolute inset-0 loading-shimmer" />
                        <div className="absolute left-4 right-4 top-4 h-5 rounded-full bg-white/15" />
                        <div className="absolute bottom-4 left-4 right-4 space-y-2">
                          <div className="h-3 w-3/4 rounded-full bg-white/15" />
                          <div className="h-3 w-1/2 rounded-full bg-white/10" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100 backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-teal-300 loading-pulse-dot" />
                        AI is working
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                        Creating your mirror preview
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        We are matching your uploaded image with the garment and
                        preparing a polished try-on result.
                      </p>

                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-teal-300 transition-all duration-700 ease-out"
                          style={{ width: progressWidth }}
                        />
                      </div>

                      <div className="mt-5 space-y-3">
                        {generationSteps.map((step, index) => {
                          const isComplete = index < activeStepIndex;
                          const isActive = index === activeStepIndex;

                          return (
                            <div
                              key={step.id}
                              className={`rounded-lg border p-3 transition duration-500 ${
                                isActive
                                  ? "border-teal-300/50 bg-white/10"
                                  : "border-white/10 bg-white/[0.03]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    isComplete
                                      ? "bg-teal-300 text-zinc-950"
                                      : isActive
                                        ? "border border-teal-300 text-teal-100 loading-step-ring"
                                        : "border border-white/20 text-zinc-400"
                                  }`}
                                >
                                  {isComplete ? "OK" : index + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {step.label}
                                  </p>
                                  <p className="text-xs text-zinc-400">
                                    {step.detail}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : generatedImageUrl ? (
                <Image
                  src={generatedImageUrl}
                  alt="Generated AI try-on result"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex min-h-44 items-center justify-center px-6 text-center text-sm text-zinc-500">
                  Your generated image will appear here.
                </div>
              )}
            </div>
          </div>
            </div>
          </>
        )}
      </section>
    </div>
  );

  return createPortal(modal, portalRoot);
}
