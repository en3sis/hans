import { HfInference } from '@huggingface/inference'

export const inference = new HfInference(process.env.HUGGINGFACE_API_KEY)
