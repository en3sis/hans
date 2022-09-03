import { OpenAiAPI } from '../../lib/open-ai'

export const getRecipe = async (ingredients: string) => {
  try {
    // https://beta.openai.com/examples/default-recipe-generator
    const { data } = await OpenAiAPI(
      'ada',
      'Write a recipe based on these ingredients and instructions',
      ingredients,
      100,
      0.3
    )

    return data
  } catch (error) {
    console.log('❌ getRecipe(): ', error)
  }
}
