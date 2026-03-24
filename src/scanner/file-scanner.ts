import { access } from "node:fs/promises";
import fg from "fast-glob";

/**
 * Finds React source files in a project tree.
 *
 * This scanner is the pipeline entry point that discovers candidate files
 * for downstream parsing and token extraction.
 */
export class FileScanner {
  /**
   * Recursively finds .tsx and .jsx files from a root path.
   *
   * Excludes common generated and dependency directories to keep scans fast.
   * Permission-related file system errors are handled gracefully.
   */
  async findReactFiles(rootPath: string): Promise<string[]> {
    try {
      // Early access check gives a clearer failure for unreadable roots.
      await access(rootPath);
    } catch (error: unknown) {
      if (this.isPermissionError(error)) {
        return [];
      }
      throw error;
    }

    try {
      const files = await fg(["**/*.tsx", "**/*.jsx"], {
        cwd: rootPath,
        absolute: true,
        onlyFiles: true,
        unique: true,
        dot: false,
        followSymbolicLinks: false,
        suppressErrors: true,
        ignore: [
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/build/**",
          "**/coverage/**",
        ],
      });

      return files;
    } catch (error: unknown) {
      // If discovery hits permission issues in nested directories, fail soft.
      if (this.isPermissionError(error)) {
        return [];
      }
      throw error;
    }
  }

  private isPermissionError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const maybeCode = (error as { code?: unknown }).code;
    return maybeCode === "EACCES" || maybeCode === "EPERM";
  }
}
