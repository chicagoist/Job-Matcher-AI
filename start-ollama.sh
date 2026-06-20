#!/bin/bash
# Start ollama with custom llama-server (CPU-only build)
# Run this from the project root

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LLAMA_LIB_DIR="$PROJECT_DIR/build/lib/ollama"

export OLLAMA_MODELS="${OLLAMA_MODELS:-$HOME/.ollama/models}"
export OLLAMA_LLM_LIBRARY="$LLAMA_LIB_DIR"
export LD_LIBRARY_PATH="$LLAMA_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

echo "OLLAMA_MODELS=$OLLAMA_MODELS"
echo "OLLAMA_LLM_LIBRARY=$OLLAMA_LLM_LIBRARY"
echo "Starting ollama serve..."

exec /usr/local/bin/ollama serve
