#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

// TODO: Check for environment variables
export class ProjectValidator {
  /** Makes sure a specific file exists
   * @param filePath relative to path of project
   * @returns boolean
   */
  private async checkConfigFiles(filePath: string): Promise<boolean> {
    return fs.existsSync(path.join(process.cwd(), filePath))
  }

  async runAllChecks() {
    if (!this.essentialEnvVars)
      throw new Error('Environment variables are missing, please check based on your env.')
  }

  get essentialEnvVars() {
    return (
      process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID && process.env.MONGODB_CONNECTION
    )
  }
}
