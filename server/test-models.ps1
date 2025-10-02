# Test script for AI Chat Bot model routing
Write-Host "Testing AI Chat Bot Model Routing..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test server health
Write-Host "1. Testing server health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000" -Method Get
    Write-Host "✓ Server is running" -ForegroundColor Green
    Write-Host "  Active Agents: $($response.activeAgents)`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Server is not responding" -ForegroundColor Red
    exit 1
}

# Get supported models
Write-Host "2. Getting supported models..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:3000/models" -Method Get
    Write-Host "✓ Supported models retrieved" -ForegroundColor Green
    Write-Host "  Default Model: $($models.defaultModel)" -ForegroundColor Gray
    Write-Host "  Available Models: $($models.supportedModels.Count)`n" -ForegroundColor Gray
    
    # Display models
    $models.supportedModels | ForEach-Object {
        Write-Host "    - $_" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "✗ Failed to get models: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test individual models
$testModels = @(
    @{ name = "gpt-4o-mini"; provider = "OpenAI" },
    @{ name = "gemini-1.5-flash"; provider = "Google Gemini" },
    @{ name = "meta-llama/llama-3-8b-instruct"; provider = "OpenRouter (LLaMA)" }
)

Write-Host "3. Testing model routing..." -ForegroundColor Yellow
foreach ($model in $testModels) {
    Write-Host "  Testing $($model.name) ($($model.provider))..." -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/test/$($model.name)" -Method Get
        if ($response.success) {
            Write-Host "  ✓ $($model.name): SUCCESS" -ForegroundColor Green
            Write-Host "    Response: $($response.response.Substring(0, [Math]::Min(50, $response.response.Length)))..." -ForegroundColor Gray
            Write-Host "    Latency: $($response.latency)`n" -ForegroundColor Gray
        } else {
            Write-Host "  ✗ $($model.name): FAILED" -ForegroundColor Red
            Write-Host "    Error: $($response.error)`n" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ✗ $($model.name): ERROR" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)`n" -ForegroundColor Gray
    }
}

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test complete! Check the results above." -ForegroundColor Cyan
Write-Host ""
Write-Host "To start using the application:" -ForegroundColor Yellow
Write-Host "1. Start the frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "2. Open browser at http://localhost:5173" -ForegroundColor White
Write-Host "3. Select a model from the dropdown" -ForegroundColor White
Write-Host "4. Click 'Connect' to start the AI agent" -ForegroundColor White
Write-Host "5. Send a message and verify it routes to the correct model" -ForegroundColor White
Write-Host ""
