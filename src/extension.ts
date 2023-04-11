import * as vscode from 'vscode';
import * as path from 'path';

interface Configuration extends vscode.WorkspaceConfiguration {
  commitTypes: string[];
  impactedAreas: string[];
  defaultProjectLabel: string | undefined;
}

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'lora-commits.generateCommit',
    async () => {
      try {
        const configuration = vscode.workspace.getConfiguration(
          'loraCommits'
        ) as Configuration;
        const { commitTypes, impactedAreas, defaultProjectLabel } =
          configuration;

        let projectLabel = defaultProjectLabel;
        if (!projectLabel) {
          projectLabel = await vscode.window.showInputBox({
            prompt: 'Enter your project label',
            placeHolder: 'Project label...',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
              if (!value) {
                return 'Please enter a project Label';
              }
              if (value.length > 6) {
                return 'Label is too large';
              }
              return null;
            },
          });
        }

        if (!projectLabel) {
          return;
        }

        const commitType = await vscode.window.showQuickPick(commitTypes, {
          placeHolder: 'Select your commit type',
          ignoreFocusOut: true,
        });

        if (!commitType) {
          return;
        }

        const impactedArea = await vscode.window.showQuickPick(impactedAreas, {
          placeHolder: 'Select the impacted area',
          ignoreFocusOut: true,
        });

        if (!impactedArea) {
          return;
        }

        const ticketNumber = await vscode.window.showInputBox({
          prompt: 'Enter the ticket number',
          placeHolder: 'Ticker number...',
          ignoreFocusOut: true,
          validateInput: (value: string) => {
            if (!value) {
              return 'Please enter a valid ticket number';
            }
            if (isNaN(parseInt(value))) {
              return 'Please enter a valid ticket number';
            }
            if (parseInt(value) > 999999) {
              return 'Ticket number is too large';
            }
            return null;
          },
        });

        if (!ticketNumber) {
          return;
        }

        const commitMessage = await vscode.window.showInputBox({
          prompt: 'Enter your commit message',
          placeHolder: 'Commit message...',
          ignoreFocusOut: true,
          validateInput: (value: string) => {
            if (!value) {
              return 'Please enter a commit message';
            }
            return null;
          },
        });

        const formattedCommitMessage = `${commitType}(${projectLabel.toUpperCase()}-${ticketNumber}): ${impactedArea} - ${commitMessage}`;
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
          vscode.window.showErrorMessage('No workspace folders found');
          return;
        }

        const repositories: vscode.QuickPickItem[] = [];

        for (const folder of workspaceFolders) {
          const git = vscode.extensions.getExtension('vscode.git')?.exports;
          const repository = git?.getAPI(1).repositories.find((repo: any) => {
            const relativePath = path.relative(
              folder.uri.fsPath,
              repo.rootUri.fsPath
            );
            return (
              !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
            );
          });

          if (repository) {
            repositories.push({
              label: repository.rootUri.fsPath,
              description: repository.state.HEAD?.name || '',
              detail: repository.state.HEAD?.commit || '',
            });
          }
        }

        if (!repositories.length) {
          vscode.window.showErrorMessage('No Git repositories found');
          return;
        }

        const repository = await vscode.window.showQuickPick(repositories, {
          placeHolder: 'Select repository',
        });

        if (!repository) {
          return;
        }

        const git = vscode.extensions.getExtension('vscode.git')?.exports;
        const selectedRepository = git
          ?.getAPI(1)
          .repositories.find(
            (repo: any) => repo.rootUri.fsPath === repository.label
          );

        if (!selectedRepository) {
          vscode.window.showErrorMessage('Repository not found');
          return;
        }

        selectedRepository.inputBox.value = formattedCommitMessage;

        await vscode.commands.executeCommand('git.commit', selectedRepository);

        vscode.window.showInformationMessage('Commit successful');
        vscode.commands.executeCommand('workbench.view.scm');
      } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
