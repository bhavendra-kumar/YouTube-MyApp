import * as translateModule from "google-translate-api-x";
import { AppError } from "../utils/AppError.js";

const translate = translateModule.default || translateModule;

export async function translateText({ text, targetLang }) {
  if (!text?.trim()) {
    throw new AppError("Text is required", 400);
  }

  if (!targetLang?.trim()) {
    throw new AppError("targetLang is required", 400);
  }

  try {
    const result = await translate(text, { to: targetLang });

    if (!result?.text) {
      throw new AppError("Invalid translation response", 502);
    }

    return result.text;

  } catch (error) {
    console.error("REAL TRANSLATION ERROR:", error);
    throw new AppError(error?.message || "Translation service unavailable", 502);
  }
}