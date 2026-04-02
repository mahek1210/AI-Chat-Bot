# OpenRouter Models Test Report

| Model | Status (No Tools) | Error (No Tools) | Status (With Tools) | Error (With Tools) |
|---|---|---|---|---|
| claude-3.5-sonnet | FAIL | HTTP 400: {"error":{"message":"Provider returned e... | UNSUPPORTED | HTTP 400: {"error":{"message":"Provider returned e... |
| llama-3.1-70b | FAIL | HTTP 400: {"error":{"message":"llama-3.1-70b is no... | UNSUPPORTED | HTTP 400: {"error":{"message":"llama-3.1-70b is no... |
| nvidia/nemotron-3-super-120b-a12b:free | FAIL | HTTP 429: {"error":{"message":"Rate limit exceeded... | UNSUPPORTED | HTTP 429: {"error":{"message":"Rate limit exceeded... |
| qwen/qwen3-next-80b-a3b-instruct:free | FAIL | HTTP 429: {"error":{"message":"Provider returned e... | FAIL | HTTP 429: {"error":{"message":"Provider returned e... |
| google/gemma-3n-e2b-it:free | FAIL | HTTP 429: {"error":{"message":"Rate limit exceeded... | UNSUPPORTED | HTTP 404: {"error":{"message":"No endpoints found ... |
| nousresearch/hermes-3-llama-3.1-405b:free | FAIL | HTTP 429: {"error":{"message":"Provider returned e... | UNSUPPORTED | HTTP 404: {"error":{"message":"No endpoints found ... |
| arcee-ai/maestro-reasoning | FAIL | HTTP 400: {"error":{"message":"Provider returned e... | UNSUPPORTED | HTTP 404: {"error":{"message":"No endpoints found ... |
| mistralai/mistral-small-3.1-24b-instruct:free | FAIL | HTTP 404: {"error":{"message":"No endpoints found ... | UNSUPPORTED | HTTP 404: {"error":{"message":"No endpoints found ... |
| arcee-ai/trinity-large-preview:free | FAIL | HTTP 429: {"error":{"message":"Rate limit exceeded... | UNSUPPORTED | HTTP 429: {"error":{"message":"Rate limit exceeded... |
| auto | OK | -... | OK (Tools Ignored) | -... |
| cognitivecomputations/dolphin-mistral-24b-venice-edition:free | FAIL | HTTP 429: {"error":{"message":"Provider returned e... | UNSUPPORTED | HTTP 404: {"error":{"message":"No endpoints found ... |
