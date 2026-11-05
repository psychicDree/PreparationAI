#!/usr/bin/env bash
# Fine-tune a small local interviewer model with MLX LoRA and serve it through Ollama.
#
#   ./train.sh            # all steps
#   ./train.sh export     # only export the dataset (needs the database)
#   ./train.sh train|fuse|ollama
#
# Env: DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME for export, DATASET_SOURCE=all|bank|sessions,
#      BANK_EXAMPLES (default 400), MODEL_NAME (Ollama name, default preparation-ai),
#      TEMPLATE_FROM (Ollama model whose Llama 3 chat template is reused, default llama3.2:3b),
#      QUANTIZE (Ollama --quantize type, default int8; recent Ollama accepts int4/int8, older q4_K_M/q8_0).
set -euo pipefail

cd "$(dirname "$0")"
ML_DIR="$(pwd)"
STEP="${1:-all}"
BASE_MODEL="$(sed -n 's/^model: *"\(.*\)"/\1/p' lora_config.yaml)"
MODEL_NAME="${MODEL_NAME:-preparation-ai}"
TEMPLATE_FROM="${TEMPLATE_FROM:-llama3.2:3b}"
QUANTIZE="${QUANTIZE:-int8}"

venv() {
  if [ ! -x .venv/bin/python ]; then
    uv venv --python 3.12 .venv
    uv pip install --python .venv/bin/python -r requirements.txt
  fi
}

export_data() {
  (cd ../backend && go run ./cmd/dataset -out "$ML_DIR/data" -source "${DATASET_SOURCE:-all}" -bank-examples "${BANK_EXAMPLES:-400}")
}

train() {
  venv
  .venv/bin/mlx_lm.lora --config lora_config.yaml
}

fuse() {
  venv
  # The base is 4-bit; de-quantize so Ollama can import plain safetensors and re-quantize itself.
  .venv/bin/mlx_lm.fuse --model "$BASE_MODEL" --adapter-path adapters --save-path fused --dequantize
}

ollama_create() {
  {
    echo "FROM ./fused"
    echo "TEMPLATE \"\"\"$(ollama show "$TEMPLATE_FROM" --template)\"\"\""
    ollama show "$TEMPLATE_FROM" --parameters | grep '^stop' | sed 's/^/PARAMETER /'
    echo "PARAMETER temperature 0.7"
  } > Modelfile
  ollama create "$MODEL_NAME" -f Modelfile --quantize "$QUANTIZE"
  echo "Created Ollama model '$MODEL_NAME'. Use OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_MODEL=$MODEL_NAME"
}

case "$STEP" in
  export) export_data ;;
  train) train ;;
  fuse) fuse ;;
  ollama) ollama_create ;;
  all) export_data && train && fuse && ollama_create ;;
  *) echo "usage: $0 [all|export|train|fuse|ollama]" >&2; exit 1 ;;
esac
