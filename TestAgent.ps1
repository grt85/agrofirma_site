# TestAgent.ps1 — мінімальний тестовий скрипт для перевірки чату

$baseUrl = "http://localhost:3000/fallback-agent"

function Send-Query($q) {
    Write-Host "`n=== $q ===" -ForegroundColor Cyan
    $body = @{ question = $q } | ConvertTo-Json -Depth 2
    $resp = Invoke-RestMethod -Uri $baseUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $body
    $resp | Format-List
}

