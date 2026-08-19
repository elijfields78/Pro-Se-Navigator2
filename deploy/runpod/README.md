# Add Huihui Gemma (agentic-fable5, abliterated) to RunPod + Open WebUI

This kit adds the GGUF model
[`huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF`](https://huggingface.co/huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF)
to a RunPod pod running **Open WebUI**.

It is an ~12B Gemma‑based model shipped in **GGUF** format, so it runs through
**llama.cpp** or **Ollama** (not vLLM / transformers). The easiest path with Open
WebUI is Ollama, because Open WebUI talks to Ollama natively and Ollama can pull a
GGUF straight from Hugging Face.

> Note: this model is *abliterated* ("uncensored"). Keep that in mind for anything
> user‑facing — it will answer prompts a normally‑aligned model would refuse.

---

## 0. What size GPU do you need?

The model is ~12B parameters. Pick a quant that fits your GPU VRAM with room for
context (KV cache):

| Quant       | ~File size | Fits comfortably on | Quality |
|-------------|-----------|---------------------|---------|
| `Q4_K_M`    | ~7–8 GB   | 16 GB (RTX 4080/A4000/A5000) | good default |
| `Q5_K_M`    | ~9 GB     | 16–24 GB            | better |
| `Q6_K`      | ~10 GB    | 24 GB (RTX 4090/A5000) | near-lossless |
| `Q8_0`      | ~13 GB    | 24 GB               | highest practical |

Sizes are approximate — confirm the exact filenames on the model's **Files** tab.
A 24 GB GPU (RTX 4090 / A5000 / L4) running `Q6_K` or `Q8_0` is a comfortable sweet
spot. On 16 GB use `Q4_K_M`.

---

## Path A — Ollama + Open WebUI (recommended)

Use this if your Open WebUI is already wired to Ollama (the common RunPod
`open-webui:ollama` image, or Open WebUI + a separate Ollama container). The model
will appear in the Open WebUI model dropdown automatically once Ollama has it.

**One command** (run inside the container/pod that runs Ollama):

```bash
ollama pull hf.co/huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF:Q4_K_M
```

- The `hf.co/<repo>:<QUANT>` form tells Ollama to pull that GGUF directly from
  Hugging Face. Swap `Q4_K_M` for whatever quant you chose above (the tag is the
  quant substring in the filename, case-insensitive).
- Drop the `:Q4_K_M` tag to let Ollama pick a default quant.

Or run the helper, which detects/starts Ollama, lets you choose the quant, pulls it,
and prints the exact next steps:

```bash
bash deploy/runpod/setup-ollama-openwebui.sh
```

Then in **Open WebUI → model selector** (top-left), pick
`hf.co/huihui-ai/Huihui-gemma-4-12B-agentic-fable5-abliterated-GGUF:Q4_K_M`.
If it isn't listed, open **Admin Panel → Settings → Connections**, confirm the
Ollama URL is `http://localhost:11434` (or your Ollama container URL), and click the
refresh icon.

Gemma's chat template ships inside the GGUF, so Ollama applies the right prompt
format automatically — no Modelfile needed for basic use. To pin generation
defaults (temperature, context length, system prompt), see
[`Modelfile.huihui-gemma`](./Modelfile.huihui-gemma).

---

## Path B — llama.cpp server + Open WebUI (OpenAI-compatible)

Use this if you'd rather run `llama-server` (llama.cpp) and connect Open WebUI to it
as an OpenAI-compatible endpoint — useful when you want fine control over llama.cpp
flags or don't run Ollama.

```bash
bash deploy/runpod/setup-llamacpp-openwebui.sh
```

This downloads one GGUF file and starts `llama-server` on port `8080` exposing an
OpenAI-compatible API at `http://localhost:8080/v1`.

Then in **Open WebUI → Admin Panel → Settings → Connections → OpenAI API**, add:

- **API Base URL:** `http://localhost:8080/v1` (or `http://<pod-ip>:8080/v1`)
- **API Key:** any non-empty string (e.g. `sk-local`) — llama.cpp ignores it
  unless you set `--api-key`.

The model then appears in the Open WebUI model list.

---

## Persistence on RunPod (don't re-download every restart)

RunPod pods are ephemeral except for the **network / persistent volume** (usually
mounted at `/workspace`). Point the model cache at it so a restart doesn't re-pull
several GB:

- **Ollama:** set `OLLAMA_MODELS=/workspace/ollama` before starting Ollama, and add
  it to the pod's environment variables so it survives restarts.
- **llama.cpp:** the setup script downloads to `/workspace/models` by default.

The setup scripts already default to `/workspace` when it exists.

---

## Exposing / reaching Open WebUI

Open WebUI listens on `8080` (bundled image) or `3000` depending on your template.
On RunPod, expose that port via **HTTP Ports** in the pod config and use the
generated `https://<pod-id>-<port>.proxy.runpod.net` URL. Ollama's `11434` should
**not** be exposed publicly — keep it internal to the pod.

---

## Troubleshooting

- **Model not in the dropdown (Path A):** run `ollama list` to confirm the pull
  finished; in Open WebUI, refresh Connections. Restart Open WebUI if it cached an
  empty list.
- **Pull is slow / fails:** Hugging Face rate-limits anonymous pulls of large files.
  Set a token: `export HF_TOKEN=hf_xxx` (Ollama and huggingface downloads both honor
  it).
- **Out of VRAM / model won't load:** drop to a smaller quant (e.g. `Q4_K_M`), or
  reduce context with `OLLAMA_CONTEXT_LENGTH` / llama.cpp `-c`. Confirm the GPU is
  visible with `nvidia-smi`.
- **Wrong/garbled prompt format:** you're likely bypassing the chat template. Use
  Ollama (Path A) or, on llama.cpp, use the `/v1/chat/completions` endpoint (Open
  WebUI does this by default) rather than raw `/completion`.
