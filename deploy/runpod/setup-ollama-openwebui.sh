#!/usr/bin/env bash
#
# Add huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF to a RunPod pod
# running Ollama + Open WebUI.
#
# Run this INSIDE the pod/container that runs Ollama.
#
#   bash deploy/runpod/setup-ollama-openwebui.sh            # interactive quant pick
#   QUANT=Q6_K bash deploy/runpod/setup-ollama-openwebui.sh # non-interactive
#
set -euo pipefail

REPO="hf.co/huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF"
DEFAULT_QUANT="${QUANT:-Q4_K_M}"

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!  \033[0m %s\n' "$*"; }

# --- Persist models on the RunPod network volume if present ------------------
if [ -z "${OLLAMA_MODELS:-}" ] && [ -d /workspace ]; then
  export OLLAMA_MODELS=/workspace/ollama
  mkdir -p "$OLLAMA_MODELS"
  log "Using persistent model dir: OLLAMA_MODELS=$OLLAMA_MODELS"
  warn "Add OLLAMA_MODELS=$OLLAMA_MODELS to the pod's env vars so it survives restarts."
fi

# --- Ensure ollama is installed ---------------------------------------------
if ! command -v ollama >/dev/null 2>&1; then
  log "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

# --- Ensure the ollama server is running ------------------------------------
if ! curl -fsS http://localhost:11434/api/version >/dev/null 2>&1; then
  log "Starting Ollama server..."
  nohup ollama serve >/tmp/ollama.log 2>&1 &
  for _ in $(seq 1 30); do
    curl -fsS http://localhost:11434/api/version >/dev/null 2>&1 && break
    sleep 1
  done
fi
ollama --version || true
command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || warn "nvidia-smi not found — is a GPU attached?"

# --- Choose quant ------------------------------------------------------------
if [ -z "${QUANT:-}" ] && [ -t 0 ]; then
  echo
  echo "Choose a quantization (fits VRAM):"
  echo "  1) Q4_K_M  ~7-8GB   16GB GPU   (default)"
  echo "  2) Q5_K_M  ~9GB     16-24GB"
  echo "  3) Q6_K    ~10GB    24GB       (near-lossless)"
  echo "  4) Q8_0    ~13GB    24GB       (highest practical)"
  read -r -p "Selection [1-4, default 1]: " sel || true
  case "${sel:-1}" in
    2) DEFAULT_QUANT="Q5_K_M" ;;
    3) DEFAULT_QUANT="Q6_K" ;;
    4) DEFAULT_QUANT="Q8_0" ;;
    *) DEFAULT_QUANT="Q4_K_M" ;;
  esac
fi

TAG="${REPO}:${DEFAULT_QUANT}"
log "Pulling ${TAG}"
log "(Set HF_TOKEN=hf_xxx first if you hit Hugging Face rate limits.)"
ollama pull "$TAG"

echo
log "Done. Installed models:"
ollama list

cat <<EOF

Next steps in Open WebUI:
  1. Open the model selector (top-left) and pick:
       ${TAG}
  2. If it's missing: Admin Panel -> Settings -> Connections, confirm the Ollama
     URL is http://localhost:11434, then click the refresh icon.

Quick sanity check from the shell:
  ollama run ${TAG} "In one sentence, what can you help with?"
EOF
