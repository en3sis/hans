#!/usr/bin/env node

export class ProjectValidator {
  /** Makes sure a specific file exists
   * @param filePath relative to path of project
   * @returns boolean
   */
  // private async checkConfigFiles(filePath: string): Promise<boolean> {
  //   return fs.existsSync(path.join(process.cwd(), filePath))
  // }

  async runAllChecks() {
    if (!this.essentialEnvVars)
      throw Error('❗️ ERROR: some env variables are missing, please check based on your .env file.')
  }

  get essentialEnvVars() {
    return (
      process.env.DISCORD_TOKEN &&
      process.env.DISCORD_CLIENT_ID &&
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROL &&
      process.env.CRYPTO_KEY &&
      process.env.CRYPTO_IV
    )
  }
}
