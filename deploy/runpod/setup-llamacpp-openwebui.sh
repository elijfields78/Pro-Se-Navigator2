#!/usr/bin/env bash
#
# Alternative to Ollama: run llama.cpp's OpenAI-compatible server for
# huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF, then connect
# Open WebUI to it as an OpenAI API endpoint.
#
# Run this INSIDE the pod. Requires a GPU and internet access to Hugging Face.
#
#   bash deploy/runpod/setup-llamacpp-openwebui.sh
#   QUANT=Q6_K PORT=8080 bash deploy/runpod/setup-llamacpp-openwebui.sh
#
# Env:
#   QUANT     GGUF quant substring to download (default Q4_K_M)
#   PORT      llama-server port (default 8080)
#   CTX       context length (default 8192)
#   NGL       GPU layers to offload (default 999 = all)
#   HF_TOKEN  Hugging Face token, if you hit rate limits
#
set -euo pipefail

REPO="huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF"
QUANT="${QUANT:-Q4_K_M}"
PORT="${PORT:-8080}"
CTX="${CTX:-8192}"
NGL="${NGL:-999}"

MODEL_DIR="${MODEL_DIR:-$([ -d /workspace ] && echo /workspace/models || echo "$HOME/models")}"
mkdir -p "$MODEL_DIR"

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }

command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || true

# --- Get llama.cpp (prebuilt via pip is simplest) ---------------------------
# llama-cpp-python ships a server; but the native llama-server has the best
# OpenAI compatibility. We use the huggingface CLI to fetch the GGUF and the
# native server if available, otherwise fall back to python -m llama_cpp.server.
if ! command -v huggingface-cli >/dev/null 2>&1; then
  log "Installing huggingface_hub CLI..."
  pip install -q -U "huggingface_hub[cli]"
fi

log "Downloading a *${QUANT}* GGUF from ${REPO} into ${MODEL_DIR}"
log "(If multiple files match, the first is used. Check the repo Files tab for exact names.)"
huggingface-cli download "$REPO" \
  --include "*${QUANT}*.gguf" \
  --local-dir "$MODEL_DIR" \
  ${HF_TOKEN:+--token "$HF_TOKEN"}

GGUF_PATH="$(find "$MODEL_DIR" -iname "*${QUANT}*.gguf" | head -n1)"
if [ -z "$GGUF_PATH" ]; then
  echo "No GGUF matching *${QUANT}*.gguf was downloaded. Check the quant tag." >&2
  exit 1
fi
log "Model file: $GGUF_PATH"

# --- Start the server -------------------------------------------------------
if command -v llama-server >/dev/null 2>&1; then
  log "Starting native llama-server on :${PORT}"
  exec llama-server -m "$GGUF_PATH" --host 0.0.0.0 --port "$PORT" -c "$CTX" -ngl "$NGL"
else
  log "Native llama-server not found; using llama-cpp-python server."
  pip install -q -U "llama-cpp-python[server]"
  log "Starting python OpenAI server on :${PORT}"
  exec python -m llama_cpp.server --model "$GGUF_PATH" --host 0.0.0.0 --port "$PORT" \
    --n_ctx "$CTX" --n_gpu_layers "$NGL" --chat_format gemma
fi
