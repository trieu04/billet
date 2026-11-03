import { requireOptionalNativeModule } from 'expo'

import { parseOcrResult } from './contract'
import type { OcrResult } from './receipt-parser'

// JS side of the local `modules/billet-ocr` Expo module (Apple Vision on iOS, ML Kit Text
// Recognition v2 on Android). Expo Go and web do not ship the module: OCR is then skipped.

type BilletOcrNativeModule = { recognize(uri: string): Promise<unknown> }

let nativeModule: BilletOcrNativeModule | null | undefined

function loadNativeModule(): BilletOcrNativeModule | null {
  if (nativeModule === undefined) {
    try {
      nativeModule = requireOptionalNativeModule<BilletOcrNativeModule>('BilletOcr')
    } catch {
      nativeModule = null
    }
  }
  return nativeModule
}

export function isOcrAvailable(): boolean {
  return loadNativeModule() !== null
}

/** Recognized text of the original photo, or `null` when OCR is unavailable or fails. */
export async function recognizeText(uri: string): Promise<OcrResult | null> {
  const module = loadNativeModule()
  if (!module) return null
  try {
    return parseOcrResult(await module.recognize(uri))
  } catch {
    return null
  }
}
