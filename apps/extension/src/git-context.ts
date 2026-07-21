/** Safe collection of staged Git context through an injected repository source. */

export interface StagedChange {
  path: string;
}

export interface StagedGitRepository {
  rootPath: string;
  getStagedChanges(): Promise<StagedChange[]>;
  getStagedDiff(path: string): Promise<string>;
}

export interface GitContextSource {
  getRepository(): Promise<StagedGitRepository | undefined>;
}

export interface GitContext {
  repositoryRoot: string;
  diff: string;
  changedFiles: string[];
}

export type GitContextCollectionResult =
  | { kind: "ready"; context: GitContext }
  | { kind: "empty"; message: string }
  | { kind: "unavailable"; message: string };

const ignoredDirectoryNames = new Set(["credentials", "secrets"]);

export class GitContextCollector {
  public constructor(private readonly source: GitContextSource) {}

  public async collect(): Promise<GitContextCollectionResult> {
    try {
      const repository = await this.source.getRepository();
      if (!repository) {
        return {
          kind: "unavailable",
          message: "No Git repository is available.",
        };
      }

      const stagedChanges = await repository.getStagedChanges();
      if (!stagedChanges.length) {
        return {
          kind: "empty",
          message: "No staged changes were found.",
        };
      }

      const safeChanges = stagedChanges.filter(
        (change) => !isSensitivePath(change.path),
      );
      if (!safeChanges.length) {
        return {
          kind: "empty",
          message: "No safe staged changes are available.",
        };
      }

      const entries = await Promise.all(
        safeChanges.map(async (change) => ({
          path: change.path,
          diff: await repository.getStagedDiff(change.path),
        })),
      );
      const textEntries = entries.filter(
        (entry) => entry.diff.trim() && !isBinaryDiff(entry.diff),
      );
      if (!textEntries.length) {
        return {
          kind: "empty",
          message: "No safe staged text changes are available.",
        };
      }

      return {
        kind: "ready",
        context: {
          repositoryRoot: repository.rootPath,
          diff: textEntries.map((entry) => entry.diff).join("\n"),
          changedFiles: textEntries.map((entry) => entry.path),
        },
      };
    } catch {
      return {
        kind: "unavailable",
        message: "Unable to collect staged Git changes.",
      };
    }
  }
}

function isSensitivePath(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/").toLowerCase();
  const parts = normalizedPath.split("/");
  const filename = parts.at(-1) ?? "";

  return (
    parts.slice(0, -1).some((part) => ignoredDirectoryNames.has(part)) ||
    filename.startsWith(".env") ||
    filename.endsWith(".key") ||
    filename.endsWith(".pem")
  );
}

function isBinaryDiff(diff: string): boolean {
  return /^(binary files |git binary patch)/im.test(diff);
}
