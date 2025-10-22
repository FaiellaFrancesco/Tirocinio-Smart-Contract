# 🚀 Using Google Colab for LLM Test Generation

This guide shows how to use Google Colab's powerful GPUs to run larger LLM models for better test generation, while keeping your existing TypeScript workflow.

## 🎯 Benefits

- **Powerful GPUs**: T4, A100, V100 (vs your local CPU)
- **More RAM**: 12-50GB (vs your 8GB)
- **Larger Models**: CodeLlama 34B, DeepSeek-Coder 33B, Llama 70B
- **Faster Generation**: GPU acceleration vs CPU
- **No Local Resource Usage**: Keep your Mac free for other work

## 📋 Setup Steps

### 1. Prepare Google Colab

1. Go to [Google Colab](https://colab.research.google.com/)
2. Create new notebook
3. Change runtime to **GPU** (Runtime → Change runtime type → GPU)
4. Get ngrok token from [ngrok.com/dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

### 2. Setup Ollama Server on Colab

Copy and paste the cells from `colab-ollama-server.py` into your Colab notebook:

```python
# Replace YOUR_NGROK_TOKEN with your actual token
ngrok_token = "YOUR_ACTUAL_TOKEN_HERE"
```

Run all cells. You'll get output like:
```
🌐 Ollama API available at: https://abc123.ngrok.io
```

### 3. Configure Local Script

Set the Colab URL as environment variable:

```bash
export OLLAMA_URL="https://abc123.ngrok.io"
```

Or modify the script directly by changing:
```typescript
const OLLAMA_BASE_URL = 'https://abc123.ngrok.io';
```

### 4. Run Your Tests

Now your existing script will use Colab's powerful GPUs:

```bash
# Test with powerful CodeLlama 13B model
npx ts-node scripts/llm/run-all.ts \
  --scaffold=tests/llm/MockERC20__MockERC20.scaffold.spec.ts \
  --out=tests/ai/gen/MockERC20.spec.ts \
  --model=codellama:13b-instruct \
  --template=prompts/templates/coverage-eng.txt \
  --verbose
```

## 🎯 Recommended Models (in order of quality)

1. **codellama:13b-instruct** - Best for coding, good speed (~7GB)
2. **deepseek-coder:6.7b-instruct** - Fast and capable (~4GB)  
3. **llama3.1:8b-instruct** - General purpose, good following (~5GB)
4. **codellama:34b-instruct** - Highest quality but slower (~19GB)

## 🔧 Troubleshooting

### Connection Issues
```bash
# Test if Colab server is reachable
curl https://your-ngrok-url.ngrok.io/api/tags
```

### Colab Session Timeout
- Keep the "Cell 7" running to prevent timeout
- Sessions last ~12 hours normally, ~24h with Colab Pro

### Model Download Fails
- Check Colab has enough storage (usually 100GB+)
- Try smaller models first
- Restart runtime if needed

## 💡 Tips

- **Use during off-peak hours** for better Colab performance
- **Start with smaller models** to test setup
- **Keep Colab tab active** to prevent disconnection  
- **Use Colab Pro** for longer sessions and better GPUs
- **Monitor GPU usage** in Colab (top-right corner)

## 🎪 Batch Processing

Process multiple scaffolds efficiently:

```bash
# Process all ERC20-like contracts
for scaffold in tests/llm/*ERC20*.scaffold.spec.ts; do
  name=$(basename "$scaffold" .scaffold.spec.ts)
  echo "Processing $name..."
  npx ts-node scripts/llm/run-all.ts \
    --scaffold="$scaffold" \
    --out="tests/ai/gen/$name.spec.ts" \
    --model=codellama:13b-instruct \
    --template=prompts/templates/coverage-eng.txt
done
```

## 📊 Expected Performance

| Model | Speed | Quality | Memory | Best For |
|-------|-------|---------|--------|----------|
| deepseek-coder:6.7b | ⚡⚡⚡ | ⭐⭐⭐ | 4GB | Fast iteration |
| codellama:13b | ⚡⚡ | ⭐⭐⭐⭐ | 7GB | **Recommended** |
| llama3.1:8b | ⚡⚡ | ⭐⭐⭐ | 5GB | General use |
| codellama:34b | ⚡ | ⭐⭐⭐⭐⭐ | 19GB | Best quality |

You should see **much better instruction following** and **fewer this.skip()** errors with the larger models! 🎯
