$ErrorActionPreference = 'Stop'
$infraDirectory = [System.IO.Path]::GetFullPath($PSScriptRoot)
$environmentFile = Join-Path $infraDirectory '.env'
$templateFile = Join-Path $infraDirectory '.env.example'

if (Test-Path -LiteralPath $environmentFile) {
    Write-Output 'infra/.env already exists. Preserving all credentials and settings.'
    exit 0
}

function New-LocalSecret {
    $secretBytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($secretBytes) } finally { $generator.Dispose() }
    return ([System.BitConverter]::ToString($secretBytes)).Replace('-', '').ToLowerInvariant()
}

$environmentText = [System.IO.File]::ReadAllText($templateFile)
foreach ($secretName in @(
    'AI_POSTGRES_PASSWORD', 'QDRANT_API_KEY', 'GRAFANA_ADMIN_PASSWORD'
)) {
    $secretValue = New-LocalSecret
    $environmentText = $environmentText.Replace('__GENERATE_' + $secretName + '__', $secretValue)
}

# CreateNew prevents a concurrent setup from overwriting an existing secret file.
$environmentStream = [System.IO.File]::Open(
    $environmentFile, [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::Write, [System.IO.FileShare]::None
)
try {
    $environmentBytes = (New-Object System.Text.UTF8Encoding($false)).GetBytes($environmentText)
    $environmentStream.Write($environmentBytes, 0, $environmentBytes.Length)
} finally {
    $environmentStream.Dispose()
}
Write-Output 'Created infra/.env with local credentials. No containers have been started.'
