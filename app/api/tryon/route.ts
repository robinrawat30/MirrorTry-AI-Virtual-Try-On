import Replicate from "replicate";

export const runtime = "nodejs";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const IDM_VTON_MODEL =
  "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985";
const DEFAULT_GARMENT_DESCRIPTION = "premium tailored shirt";
const DEFAULT_CATEGORY = "upper_body";

export async function POST(request: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return Response.json(
        {
          success: false,
          message: "Missing REPLICATE_API_TOKEN.",
        },
        {
          status: 503,
        },
      );
    }

    const formData = await request.formData();
    const humanImage = formData.get("image");
    const garmentImage = formData.get("garmentImage");
    const garmentDescription = formData.get("garmentDes");
    const category = formData.get("category");
    const crop = formData.get("crop");

    if (!(humanImage instanceof File)) {
      return Response.json(
        {
          success: false,
          message: "User image is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!ACCEPTED_IMAGE_TYPES.has(humanImage.type)) {
      return Response.json(
        {
          success: false,
          message: "Only JPG and PNG user images are supported.",
        },
        {
          status: 400,
        },
      );
    }

    if (!garmentImage || typeof garmentImage !== "string") {
      return Response.json(
        {
          success: false,
          message: "Garment image is required.",
        },
        {
          status: 400,
        },
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });

    const humanImageBase64 = await fileToDataUrl(humanImage);
    const result = await replicate.run(IDM_VTON_MODEL, {
      input: {
        human_img: humanImageBase64,
        garm_img: garmentImage,
        garment_des:
          typeof garmentDescription === "string" && garmentDescription.trim()
            ? garmentDescription.trim()
            : DEFAULT_GARMENT_DESCRIPTION,
        category:
          typeof category === "string" && category.trim()
            ? category.trim()
            : DEFAULT_CATEGORY,
        crop: crop === null ? true : crop !== "false",
      },
    });

    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    const routeError = getReplicateRouteError(error);
    console.error("Replicate IDM-VTON error:", routeError.message);

    return Response.json(
      {
        success: false,
        message: routeError.message,
      },
      {
        status: routeError.status,
      },
    );
  }
}

function getReplicateRouteError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("status 402 Payment Required")) {
    return {
      status: 402,
      message:
        "Replicate has insufficient credit to run IDM-VTON. Add billing credit, wait a few minutes, then try again.",
    };
  }

  if (message.includes("status 404 Not Found")) {
    return {
      status: 502,
      message: "Replicate could not find the IDM-VTON model version.",
    };
  }

  if (error instanceof Error) {
    return {
      status: 502,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: "Try-on generation failed.",
  };
}

async function fileToDataUrl(file: File) {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  return `data:${file.type};base64,${base64}`;
}
