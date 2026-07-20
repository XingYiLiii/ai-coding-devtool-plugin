$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Push-Location (Join-Path $projectRoot "apps/api")
try {
    uv run pytest
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    uv run ruff check .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    uv run ruff format --check .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}

Push-Location (Join-Path $projectRoot "apps/extension")
try {
    npm run compile
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run lint
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run format:check
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}