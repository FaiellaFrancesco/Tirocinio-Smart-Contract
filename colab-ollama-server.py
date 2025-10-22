# 🚀 Ollama Server on Google Colab
# Use this notebook to run powerful LLM models on Colab GPU
# Your local TypeScript script will connect to this Colab instance

# Cell 1: Install dependencies
!curl -fsSL https://ollama.ai/install.sh | sh
!pip install pyngrok nest_asyncio

# Cell 2: Setup ngrok tunnel  
import os
from pyngrok import ngrok
import nest_asyncio
nest_asyncio.apply()

# Get your ngrok token from: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok_token = "YOUR_NGROK_TOKEN"  # Replace with your token
ngrok.set_auth_token(ngrok_token)

# Cell 3: Start Ollama server in background
import subprocess
import time
import threading

def run_ollama():
    """Run Ollama server in background"""
    subprocess.run(["ollama", "serve"], check=True)

# Start Ollama in background thread
thread = threading.Thread(target=run_ollama, daemon=True)
thread.start()
time.sleep(5)  # Wait for server to start

print("✅ Ollama server started")

# Cell 4: Create Flask proxy to bypass ngrok limitations
from flask import Flask, request, jsonify
import requests
import threading

app = Flask(__name__)

@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    # Forward request to local Ollama
    url = f"http://localhost:11434/{path}"
    
    # Copy headers but add CORS
    headers = dict(request.headers)
    headers.pop('Host', None)
    
    # Forward the request
    if request.method == 'POST':
        resp = requests.post(url, json=request.get_json(), headers=headers)
    elif request.method == 'GET':
        resp = requests.get(url, headers=headers)
    elif request.method == 'PUT':
        resp = requests.put(url, json=request.get_json(), headers=headers)
    elif request.method == 'DELETE':
        resp = requests.delete(url, headers=headers)
    
    # Return response with CORS headers
    response = jsonify(resp.json() if resp.content else {})
    response.status_code = resp.status_code
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = '*'
    
    return response

# Start Flask in background
def run_flask():
    app.run(host='0.0.0.0', port=8080, debug=False)

flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()
time.sleep(2)

print("✅ Flask proxy started on port 8080")

# Create ngrok tunnel to Flask proxy (not Ollama directly)
public_tunnel = ngrok.connect(8080)
public_url = public_tunnel.public_url

print(f"🌐 Ollama API available at: {public_url}")
print(f"📋 Use this URL in your local script:")
print(f"   export OLLAMA_URL='{public_url}'")

# Cell 5: Download powerful models
models_to_download = [
    "codellama:13b-instruct",  # 7GB - Good balance 
    "deepseek-coder:6.7b-instruct",  # 4GB - Fast and good
    "llama3.1:8b-instruct",  # 5GB - General purpose
]

print("📥 Downloading models (this will take 10-20 minutes)...")
for model in models_to_download:
    print(f"  Downloading {model}...")
    result = subprocess.run(["ollama", "pull", model], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  ✅ {model} downloaded successfully")
    else:
        print(f"  ❌ Failed to download {model}: {result.stderr}")

# Cell 6: Test the setup
print("\n🧪 Testing models...")
subprocess.run(["ollama", "list"])

print(f"\n🎯 Your Colab Ollama server is ready!")
print(f"🌐 API URL: {public_url}")
print(f"📱 This URL will stay active while this notebook runs")
print(f"💡 Copy the URL and use it in your local run-all.ts script")

# Cell 7: Keep alive (run this to prevent Colab from timing out)
import time

print("🔄 Keeping Colab session alive...")
print("💡 Leave this running while you use your local script")
print(f"🌐 Ollama API: {public_url}")

try:
    while True:
        print("❤️ Heartbeat - Colab is alive", flush=True)
        time.sleep(300)  # Print every 5 minutes
except KeyboardInterrupt:
    print("🛑 Stopped by user")
