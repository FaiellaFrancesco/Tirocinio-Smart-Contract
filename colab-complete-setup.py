# 🚀 COMPLETE OLLAMA + FLASK PROXY SETUP FOR GOOGLE COLAB
# Copy and paste each cell individually into Google Colab

# ============================================================================
# CELL 1: Install Dependencies
# ============================================================================
!curl -fsSL https://ollama.ai/install.sh | sh
!pip install flask pyngrok requests

# ============================================================================
# CELL 2: Setup Authentication  
# ============================================================================
import os
from pyngrok import ngrok

# Replace with your actual ngrok token
ngrok_token = "34BoXz5v8MIdlEa8z01LXI2obOg_7NhPGGP5TitxoXemwGBm9"
ngrok.set_auth_token(ngrok_token)

# Kill any existing tunnels
ngrok.kill()

print("✅ Authentication setup complete")

# ============================================================================
# CELL 3: Start Ollama Server
# ============================================================================
import subprocess
import time
import threading

def run_ollama():
    """Run Ollama server in background"""
    subprocess.run(["ollama", "serve"], check=True)

# Start Ollama in background thread
ollama_thread = threading.Thread(target=run_ollama, daemon=True)
ollama_thread.start()
time.sleep(10)  # Wait for Ollama to start

print("✅ Ollama server started")

# Test Ollama locally
import requests
try:
    response = requests.get("http://localhost:11434/api/tags", timeout=5)
    print(f"✅ Ollama local test: {response.status_code}")
except Exception as e:
    print(f"❌ Ollama not ready: {e}")

# ============================================================================
# CELL 3.5: Diagnose Port Issues (Run this if you get port errors)
# ============================================================================
import subprocess
import os

def diagnose_ports():
    """Diagnose what's using port 8080 and nearby ports"""
    print("🔍 Diagnosing port usage...")
    
    # Check what's using ports 8080-8090
    for port in range(8080, 8091):
        try:
            result = subprocess.run(
                ["netstat", "-tlnp", f":{port}"], 
                capture_output=True, text=True
            )
            if result.stdout.strip():
                print(f"Port {port}: {result.stdout.strip()}")
        except:
            pass
    
    # Kill any lingering processes
    print("🧹 Cleaning up processes...")
    os.system("pkill -f 'python.*flask'")
    os.system("pkill -f 'python.*8080'")
    time.sleep(2)
    
    print("✅ Cleanup complete")

# Uncomment the next line if you have port issues:
# diagnose_ports()

# ============================================================================
# CELL 4: Create Flask Proxy Server
# ============================================================================
from flask import Flask, request, Response
import requests
import threading
import json
import socket

# Kill any existing Flask processes
import os
os.system("pkill -f flask")
time.sleep(2)

def find_free_port():
    """Find an available port starting from 8080"""
    for port in range(8080, 8090):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                continue
    return 8089  # Fallback

# Find available port
FLASK_PORT = find_free_port()
print(f"🔍 Using port {FLASK_PORT} for Flask proxy")

app = Flask(__name__)

@app.route('/api/tags', methods=['GET'])
def proxy_tags():
    """Proxy /api/tags endpoint"""
    try:
        response = requests.get('http://localhost:11434/api/tags', timeout=10)
        return Response(
            response.content, 
            status=response.status_code,
            headers={'Content-Type': 'application/json'}
        )
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/v1/chat/completions', methods=['POST'])
def proxy_chat():
    """Proxy chat completions endpoint"""
    try:
        response = requests.post(
            'http://localhost:11434/v1/chat/completions',
            json=request.get_json(),
            headers={'Content-Type': 'application/json'},
            timeout=300
        )
        return Response(
            response.content,
            status=response.status_code, 
            headers={'Content-Type': 'application/json'}
        )
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/<path:path>', methods=['GET', 'POST'])
def proxy_api(path):
    """Proxy all other Ollama API endpoints"""
    try:
        url = f'http://localhost:11434/api/{path}'
        if request.method == 'POST':
            response = requests.post(url, json=request.get_json(), timeout=60)
        else:
            response = requests.get(url, timeout=60)
        
        return Response(
            response.content,
            status=response.status_code,
            headers={'Content-Type': 'application/json'}
        )
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/')
def health_check():
    """Health check endpoint"""
    return {'status': 'Flask proxy running', 'ollama': 'localhost:11434'}, 200

# Global variable to track if Flask started successfully
flask_started = False

def run_flask():
    """Run Flask server with error handling"""
    global flask_started
    try:
        app.run(host='0.0.0.0', port=FLASK_PORT, debug=False, use_reloader=False)
        flask_started = True
    except Exception as e:
        print(f"❌ Flask failed to start: {e}")
        flask_started = False

# Start Flask server
flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()
time.sleep(5)  # Wait for Flask to start

# Verify Flask is actually running
try:
    test_response = requests.get(f"http://localhost:{FLASK_PORT}/", timeout=5)
    if test_response.status_code == 200:
        print(f"✅ Flask proxy server started successfully on port {FLASK_PORT}")
    else:
        print(f"❌ Flask proxy not responding correctly on port {FLASK_PORT}")
except Exception as e:
    print(f"❌ Flask proxy failed to start: {e}")
    print("🔧 Try killing processes: !pkill -f python")

# ============================================================================
# CELL 5: Download AI Models
# ============================================================================
models_to_download = [
    "deepseek-coder:6.7b-instruct",  # 4GB - Fast and good
    "codellama:13b-instruct",        # 7GB - Better quality
]

print("📥 Downloading AI models (this takes 10-20 minutes)...")
for model in models_to_download:
    print(f"  Downloading {model}...")
    result = subprocess.run(["ollama", "pull", model], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  ✅ {model} downloaded successfully")
    else:
        print(f"  ❌ Failed to download {model}: {result.stderr}")

print("✅ Model downloads complete")

# ============================================================================
# CELL 6: Create ngrok Tunnel for Flask Proxy
# ============================================================================
from pyngrok import ngrok

# Kill existing tunnels and create new one for Flask
ngrok.kill()
time.sleep(3)

# Create tunnel specifically for Flask proxy using dynamic port
proxy_tunnel = ngrok.connect(FLASK_PORT, "http", bind_tls=True)
public_url = proxy_tunnel.public_url

print(f"🌐 Flask Proxy URL: {public_url}")
print(f"📋 Use this URL in your TypeScript script:")
print(f"   export OLLAMA_URL='{public_url}'")

# ============================================================================
# CELL 7: Test Complete Setup
# ============================================================================
import requests
import time

print("🧪 Testing complete setup...")

# Test 1: Local Flask
try:
    response = requests.get(f"http://localhost:{FLASK_PORT}/api/tags", timeout=10)
    print(f"✅ Local Flask: {response.status_code}")
    if response.status_code == 200:
        models = response.json().get('models', [])
        print(f"   Models found: {len(models)}")
    else:
        print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"❌ Local Flask failed: {e}")

# Test 2: Public tunnel
try:
    response = requests.get(f"{public_url}/api/tags", timeout=15)
    print(f"✅ Public tunnel: {response.status_code}")
    if response.status_code == 200:
        models = response.json().get('models', [])
        print(f"   Models via tunnel: {len(models)}")
        for model in models:
            print(f"   - {model['name']} ({model['size']} bytes)")
except Exception as e:
    print(f"❌ Public tunnel failed: {e}")

print(f"\n🎯 READY! Use this URL: {public_url}")

# ============================================================================
# CELL 8: Keep Session Alive
# ============================================================================
import time

print("🔄 Keeping Colab session alive...")
print(f"🌐 Proxy URL: {public_url}")
print("💡 Leave this running while you use your local TypeScript script")

try:
    while True:
        print("❤️ Heartbeat - Colab session alive", flush=True)
        
        # Test that services are still running
        try:
            response = requests.get(f"http://localhost:{FLASK_PORT}/", timeout=5)
            if response.status_code == 200:
                print("   ✅ Flask proxy healthy")
            else:
                print("   ⚠️ Flask proxy issues")
        except:
            print("   ❌ Flask proxy down")
            
        time.sleep(300)  # Print every 5 minutes
except KeyboardInterrupt:
    print("🛑 Stopped by user")
