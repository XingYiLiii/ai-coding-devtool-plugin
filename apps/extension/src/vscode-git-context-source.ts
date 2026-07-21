/** Adapter for VS Code's built-in Git extension API. */

import { relative } from "node:path";
import * as vscode from "vscode";

import type {
  GitContextSource,
  StagedChange,
  StagedGitRepository,
} from "./git-context";

interface VsCodeGitChange {
  uri: vscode.Uri;
}

interface VsCodeGitRepository {
  rootUri: vscode.Uri;
  state: {
    indexChanges: readonly VsCodeGitChange[];
  };
  diffIndexWithHEAD(path: string): Thenable<string>;
}

interface VsCodeGitApi {
  repositories: readonly VsCodeGitRepository[];
}

interface VsCodeGitExtension {
  enabled: boolean;
  getAPI(version: 1): VsCodeGitApi;
}

export class VsCodeGitContextSource implements GitContextSource {
  public async getRepository(): Promise<StagedGitRepository | undefined> {
    const extension = vscode.extensions.getExtension<VsCodeGitExtension>("vscode.git");
    if (!extension) {
      return undefined;
    }

    const gitExtension = extension.isActive
      ? extension.exports
      : await extension.activate();
    if (!gitExtension.enabled) {
      return undefined;
    }

    const repository = gitExtension.getAPI(1).repositories[0];
    if (!repository) {
      return undefined;
    }

    return new VsCodeStagedGitRepository(repository);
  }
}

class VsCodeStagedGitRepository implements StagedGitRepository {
  public constructor(private readonly repository: VsCodeGitRepository) {}

  public get rootPath(): string {
    return this.repository.rootUri.fsPath;
  }

  public async getStagedChanges(): Promise<StagedChange[]> {
    const paths = new Set(
      this.repository.state.indexChanges.map((change) =>
        relative(this.rootPath, change.uri.fsPath).replace(/\\/g, "/"),
      ),
    );
    return [...paths].map((path) => ({ path }));
  }

  public async getStagedDiff(path: string): Promise<string> {
    return this.repository.diffIndexWithHEAD(path);
  }
}
