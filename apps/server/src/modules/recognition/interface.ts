import type { RecognitionSuggestion } from './entities/recognition-job.entity'
export const RECOGNITION_PROVIDER = Symbol('RECOGNITION_PROVIDER')
export interface RecognitionProvider {
  readonly name: string
  recognize(userId: string, mediaAssetId: string): Promise<RecognitionSuggestion>
}
