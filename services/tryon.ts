const TRYON_API_URL = "/api/tryon";
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const DEFAULT_REQUEST_TIMEOUT_MS = 120000;

export type TryOnRequestStatus = "idle" | "loading" | "success" | "error";

export type TryOnServiceState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  status: TryOnRequestStatus;
};

export type TryOnFlowResult = {
  imageUrl: string;
  result: unknown;
};

export type TryOnFlowStep = "uploading" | "generating" | "finalizing";

type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

type TryOnFlowOptions = RequestOptions & {
  onStepChange?: (step: TryOnFlowStep) => void;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

function createSuccessState<T>(data: T): TryOnServiceState<T> {
  return {
    data,
    error: null,
    isLoading: false,
    status: "success",
  };
}

function createErrorState<T>(error: unknown): TryOnServiceState<T> {
  return {
    data: null,
    error: getErrorMessage(error),
    isLoading: false,
    status: "error",
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request timed out. Please try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function mergeSignals(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const handleAbort = () => controller.abort();
  signal?.addEventListener("abort", handleAbort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
    },
  };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RequestOptions = {},
) {
  const { signal, cleanup } = mergeSignals(
    options.signal,
    options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  );

  try {
    return await fetch(input, {
      ...init,
      signal,
    });
  } finally {
    cleanup();
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & ApiErrorResponse)
    | null;

  if (!response.ok) {
    throw new Error(
      data?.message ?? data?.error ?? `Request failed with ${response.status}`,
    );
  }

  if (!data) {
    throw new Error("The server returned an empty response.");
  }

  return data;
}

export async function generateTryOn(
  image: File,
  garmentImageUrl: string,
  options: RequestOptions = {},
): Promise<TryOnServiceState<TryOnFlowResult>> {
  try {
    if (!ACCEPTED_IMAGE_TYPES.includes(image.type)) {
      throw new Error("Only JPG and PNG images are supported.");
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("garmentImage", garmentImageUrl);
    formData.append("garmentDes", "premium tailored shirt");
    formData.append("category", "upper_body");
    formData.append("crop", "true");

    const response = await fetchWithTimeout(
      TRYON_API_URL,
      {
        method: "POST",
        body: formData,
      },
      options,
    );

    const data = await parseApiResponse<TryOnApiResponse>(response);
    return createSuccessState({
      imageUrl: extractTryOnImageUrl(data.result),
      result: data.result,
    });
  } catch (error) {
    return createErrorState<TryOnFlowResult>(error);
  }
}

export async function runTryOnFlow(
  image: File,
  garmentImageUrl: string,
  options: TryOnFlowOptions = {},
): Promise<TryOnServiceState<TryOnFlowResult>> {
  options.onStepChange?.("uploading");
  options.onStepChange?.("generating");
  const result = await generateTryOn(image, garmentImageUrl, options);

  if (result.status === "error" || !result.data?.imageUrl) {
    return createErrorState<TryOnFlowResult>(
      new Error(result.error ?? "Try-on generation failed."),
    );
  }

  options.onStepChange?.("finalizing");
  return result;
}

type TryOnApiResponse = {
  success: true;
  result: unknown;
};

function extractTryOnImageUrl(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }

  if (Array.isArray(result)) {
    const imageUrl = result.find((item) => typeof item === "string");

    if (imageUrl) {
      return imageUrl;
    }
  }

  if (isRecord(result)) {
    const imageUrl = result.image ?? result.url ?? result.output;

    if (typeof imageUrl === "string") {
      return imageUrl;
    }

    if (Array.isArray(imageUrl)) {
      const firstUrl = imageUrl.find((item) => typeof item === "string");

      if (firstUrl) {
        return firstUrl;
      }
    }
  }

  throw new Error("The try-on finished without an image.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
