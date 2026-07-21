# ai-coding-devtool-plugin

AI coding developer tool for code explanation, Development Plan generation, commit messages and Git Diff Review.

## Package and install the VS Code Extension

The extension is packaged locally; it is not published to the VS Code Marketplace.

```powershell
cd apps/extension
npm ci
npm run package
code --install-extension dist/devpilot.vsix
```

Alternatively, install `dist/devpilot.vsix` through VS Code's **Extensions: Install from VSIX...** command. The Extension expects the local FastAPI backend to be running at the configured `devpilot.backendUrl`.
