#!/usr/bin/env node

export class ProjectValidator {
  async runAllChecks() {
    if (!this.essentialEnvVars)
      throw Error('❗️ ERROR: some env variables are missing, please check based on your .env file.')
  }

  get essentialEnvVars() {
    return (
      process.env.DISCORD_TOKEN &&
      process.env.DISCORD_CLIENT_ID &&
      process.env.DATABASE_URL &&
      process.env.CRYPTO_KEY &&
      process.env.CRYPTO_IV
    )
  }
}
