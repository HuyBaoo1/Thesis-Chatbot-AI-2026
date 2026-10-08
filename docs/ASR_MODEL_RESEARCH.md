# ASR Model Research for Chatbot Speech-to-Text

Date: 2026-09-30

## Decision

`openai/whisper-large-v3` is accurate and supports Vietnamese, but it is not a
practical interactive ASR model for the current development machine or the
existing Railway API runtime. `vinai/PhoWhisper-small` through faster-whisper
and CTranslate2 `int8` on CPU is selected for controlled prototype integration.
No production deployment is approved yet.

## Repository audit

- The repository has no speech-to-text endpoint, ASR service, browser recorder,
  or Whisper runtime dependency.
- `vite-app/public/widget.js` already grants the iframe `microphone` permission,
  but this is only browser capability configuration.
- Existing dependencies include `openai` and `python-multipart`; they do not
  constitute an ASR or speech-to-text implementation.
- The local machine has an Intel i7-1165G7, 7.7 GB RAM, and an NVIDIA MX330 with
  2 GB VRAM.

## Large-v3 demo evidence

A disposable demo outside the repository used `faster-whisper`, CPU `int8`, and
the exact `large-v3` checkpoint. It transcribed one short synthetic Vietnamese
utterance successfully.

- Model load: 54.90 seconds
- Transcription: 90.93 seconds
- Total: 145.83 seconds
- Expected proper noun: `VGU`
- Model output: `VJU`
- Peak private process memory observed: approximately 7 GB
- API tokens consumed: none

This is proof that the model can execute, not a quality benchmark. The latency,
memory pressure, and proper-noun error make it unsuitable for the current
interactive deployment target.

## Candidate assessment

| Candidate | Vietnamese | Size/compute | Assessment |
|---|---:|---:|---|
| Whisper large-v3 | Yes | 1,550M parameters; about 10 GB reference VRAM | Reject for current runtime |
| Whisper large-v3-turbo | Yes | 809M parameters; about 6 GB reference VRAM | Faster, but still too large for the current 2 GB GPU |
| Whisper small | Yes | 244M parameters; about 2 GB reference VRAM | Viable CPU fallback |
| PhoWhisper-small | Vietnamese-specific | Local checkpoint is about 0.9 GB | Selected prototype model |
| Distil-Whisper large-v3 | No, English-only | 756M parameters | Reject for this Vietnamese chatbot |

PhoWhisper is fine-tuned from multilingual Whisper on 844 hours covering
diverse Vietnamese accents. Its official `PhoWhisper-small` checkpoint is
already present in the local Hugging Face cache, avoiding another large model
download. The official model card does not provide a hosted inference provider,
so a demo must run locally.

## PhoWhisper-small demo result

A disposable CPU `float32` run loaded the cached official checkpoint once and
transcribed three synthetic Vietnamese samples.

- Model load: 1.16 seconds
- Three transcriptions: 23.87 seconds total
- Process memory after the run: approximately 1.08 GB
- Pure Vietnamese sentence: accurate
- `VGU` acronym: misrecognized as `VTU`
- Mixed Vietnamese-English sentence: materially inaccurate
- Domain prompt ablation: did not correct the acronym or mixed-language errors
- API tokens consumed: none

This passes the lightweight execution gate and the basic Vietnamese gate, but
does not pass a production accuracy gate. Synthetic speech is not a substitute
for testing real microphone input and regional accents.

## Corrected product requirement

ASR is the model capability; speech-to-text is the user-facing feature built on
top of it. The intended public-chat flow is:

```text
Microphone audio
-> speech-to-text API
-> PhoWhisper-small ASR inference
-> transcript
-> populate the existing draftMessage textarea
-> user reviews or edits the text
-> user explicitly sends through the existing handleSend flow
```

The transcript must not be submitted automatically. The existing conversation,
lead initialization, validation, and chat request contracts remain unchanged.
The frontend integration target is the composer in
`vite-app/src/features/home/components/home-chat-shell.tsx`.

## Recommended next validation

Run `PhoWhisper-small` with three short real microphone clips:

1. A clear Vietnamese admissions question.
2. A sentence containing `VGU` and `Đại học Việt Đức`.
3. A mixed Vietnamese-English sentence containing a program name.

Force the transcription language to Vietnamese, cap each clip at 15 seconds,
and measure transcript correctness and latency. Do not add the model to the API
Docker image or Railway until this gate passes.

## Real microphone validation

Validation date: 2026-10-04

Three user-recorded `.m4a` files were decoded locally and transcribed with the
cached official `vinai/PhoWhisper-small` checkpoint. No API tokens were used and
the source audio files were not modified.

Greedy decoding (`num_beams=1`) preserved both pure Vietnamese questions, but
changed `Computer Science and Engineering` to `Computer Science of Engineering`.
Beam search (`num_beams=5`) produced:

| File | Audio | CPU inference | Transcript |
|---|---:|---:|---|
| `Cau 1.m4a` | 7.68 s | 16.18 s | `ngành khoa học máy tính ở đại học việt đức.` |
| `Cau 2.m4a` | 4.46 s | 14.80 s | `đại học việt đức có bao nhiêu ngành tất cả.` |
| `Cau 3.m4a` | 5.91 s | 13.05 s | `học phí của ngành computer science and engineering.` |

The real-audio semantic and mixed-language gates pass with `num_beams=5`.
The acronym `VGU` was not present in the resulting transcripts, so its exact
real-microphone recognition remains unproven. Exact WER cannot be calculated
without written ground-truth transcripts from the speaker.

CPU latency remains too high for production interaction: the real-time factor
ranged from 2.11 to 3.32. This model remains approved for prototype work only,
not for Railway deployment or automatic submission into chat.

## CTranslate2 int8 latency benchmark

Benchmark date: 2026-10-05

The same official PhoWhisper-small checkpoint was converted locally to
CTranslate2 with `int8` weights and tested through `faster-whisper` on CPU with
`beam_size=5`. The conversion output was 236.71 MB.

| File | Audio | CT2 int8 inference | Real-time factor | Transcript result |
|---|---:|---:|---:|---|
| `Cau 1.m4a` | 7.68 s | 2.56 s | 0.33 | Preserved |
| `Cau 2.m4a` | 4.46 s | 2.59 s | 0.58 | Preserved |
| `Cau 3.m4a` | 5.91 s | 2.34 s | 0.40 | `and` regressed to `of` |

- Model load: 0.55 seconds
- Total inference: 7.49 seconds, versus 44.03 seconds for PyTorch float32
- Process memory after the run: approximately 384.6 MB, versus 1,087.7 MB
- API tokens consumed: none

The latency and memory gates pass. The mixed-language quality gate fails because
`Computer Science and Engineering` becomes `Computer Science of Engineering`.
Both `initial_prompt` and `hotwords` corrected the English phrase but corrupted
the Vietnamese prefix, so vocabulary bias is rejected for this sample.

`int8` is therefore not approved for integration. The next narrow validation is
a CTranslate2 precision ablation (`int16` and/or `float32`) to determine whether
the PyTorch-quality transcript can be retained without returning to the original
latency and memory cost.

## CTranslate2 precision quality ablation

Ablation date: 2026-10-05

The exact cached official PhoWhisper-small checkpoint was converted separately
to CTranslate2 `int16` and `float32`. Both runs used the same three real `.m4a`
files and the same settings: CPU, `language=vi`, `task=transcribe`,
`beam_size=5`, `condition_on_previous_text=false`, and `vad_filter=false`.
No prompt bias, hotwords, transcript correction, or string post-processing was
used.

| Precision | Converted size | Load | Total inference | Memory after run | Quality |
|---|---:|---:|---:|---:|---|
| CT2 int8 (previous) | 236.71 MB | 0.55 s | 7.49 s | 384.6 MB | Fails mixed-language sample |
| CT2 int16 | 467.75 MB | 1.18 s | 9.02 s | 524.8 MB | Fails mixed-language sample |
| CT2 float32 | 925.44 MB | 12.30 s | 22.88 s | 1,180.8 MB | Fails mixed-language sample |
| PyTorch float32 baseline | about 0.9 GB checkpoint | 1.69 s | 44.03 s | 1,087.7 MB | Passes all three samples |

| File | Audio | CT2 int16 inference / RTF | CT2 float32 inference / RTF | Result |
|---|---:|---:|---:|---|
| `Cau 1.m4a` | 7.68 s | 3.06 s / 0.40 | 11.15 s / 1.45 | Preserved in both |
| `Cau 2.m4a` | 4.46 s | 2.89 s / 0.65 | 6.70 s / 1.50 | Preserved in both |
| `Cau 3.m4a` | 5.91 s | 3.07 s / 0.52 | 5.02 s / 0.85 | `and` became `of` in both |

Both CT2 precisions returned `hoc phi cua nganh computer science of
engineering` for the third sample instead of the required `Computer Science
and Engineering`. Increasing CT2 precision therefore does not recover the
PyTorch transcript. This isolates the observed regression from integer weight
quantization, but does not by itself prove which CT2 conversion or decoding
difference causes it.

Under the original exact-transcript gate, neither precision passed. No
CTranslate2 precision was selected at that point, and integration remained
blocked pending the product-level acceptance decision below.

## Product-level parity disposition

Decision date: 2026-10-05

The exact-transcript gate above was intentionally stricter than the product
requirement. The owner subsequently approved an editable-draft interaction:
ASR output is placed in the existing chat input, the user may correct it, and
only the user's explicit send action submits the message. Automatic submission
remains prohibited.

For this controlled prototype, the acceptance floor is 80% normalized word
accuracy for every validation clip. This uses the higher end of the approved
70-80% range. Against the documented reference questions, the CT2 `int8`
outputs score:

| File | Reference words | Substitutions | Word accuracy | Gate |
|---|---:|---:|---:|---|
| `Cau 1.m4a` | 10 | 0 | 100% | Pass |
| `Cau 2.m4a` | 10 | 0 | 100% | Pass |
| `Cau 3.m4a` | 8 | 1 | 87.5% | Pass |

The three-clip corpus has one substitution across 28 reference words: 3.57%
WER and 96.43% word accuracy. The known substitution is `and` to `of` in the
English program name. It remains visible and editable before submission.

CT2 `float32`, `int16`, and `int8` all produced the same substitution, while
the PyTorch beam-search baseline did not. Quantization is therefore ruled out
as the cause. The narrower difference lies in the CT2 runtime path, such as
decoding or feature-processing parity, but exact causal isolation is no longer
required to unblock this editable prototype.

CT2 `int8` is selected because it meets the revised quality floor while having
the smallest measured artifact (236.71 MB), lowest measured memory use
(384.6 MB), and fastest measured three-file inference time (7.49 seconds).
This approval applies only to prototype integration. The three clips are not a
representative production benchmark, `VGU` acronym recognition remains
unproven, and production deployment still requires API, upload validation,
frontend review/edit behavior, resource-limit, and broader audio regression
gates.

## Backend API prototype

Implementation date: 2026-10-05

The backend prototype exposes `POST /api/asr/transcribe` as a multipart audio
upload. It returns a transcript draft and never calls the chat pipeline. The
response always sets `requires_user_review=true`; the eventual frontend must
place the transcript in the existing composer and preserve explicit user send.

The endpoint is disabled by default and protected by upload-size, duration,
media-type, and per-IP rate limits. Audio is decoded and processed in memory;
this path does not persist recordings or transcripts. The model is lazy-loaded
from a local converted-model directory only after the feature is enabled and a
valid request reaches inference.

Runtime configuration:

- `ASR_ENABLED=false` by default
- `ASR_MODEL_PATH` points to a converted PhoWhisper-small CT2 int8 directory
- maximum upload: 5 MB
- maximum duration: 15 seconds
- CPU threads: 4
- rate limit: 6 requests per minute per IP

Targeted API and service tests passed 8/8. A real service smoke used the exact
cached official checkpoint converted to CT2 int8 and transcribed all three
`.m4a` fixtures through the new `AsrService`. A real multipart request for
`Cau 3.m4a` returned HTTP 200 with the expected editable transcript, Vietnamese
language metadata, 5.91-second duration, and the PhoWhisper-small model label.

This closes the local backend API prototype only. The converted model is not
stored in Git, Docker has not been changed, Railway resource limits have not
been tested, and no frontend microphone control has been implemented.

## Docker runtime resource gate

Validation date: 2026-10-06

An isolated Linux image derived from the existing API image installed only the
optional packages in `requirements-asr.txt`. The production Dockerfile and
Railway deployment were not changed. The runtime imports successfully on
Python 3.12/Linux.

The first image resolved PyAV 19.0.1 and failed before inference because
`faster-whisper` 1.2.1 passes `metadata_errors` to `av.open`, while that keyword
is not accepted by PyAV 19. Pinning PyAV 18.1.0 restored decoding for the real
`.m4a` fixtures. This is a runtime compatibility pin, not an audio workaround.

The converted model must also include `tokenizer.json` and
`preprocessor_config.json` from the same official checkpoint. Without those
files, cold start attempted to contact Hugging Face Hub. With both files
mounted and container networking disabled, all three real-audio transcriptions
completed successfully without an external model or tokenizer request.

The offline container was limited to 2 CPU and 1 GiB RAM:

| File | Audio | Container elapsed | Transcript result |
|---|---:|---:|---|
| `Cau 1.m4a` | 7.68 s | 27.45 s cold | Preserved |
| `Cau 2.m4a` | 4.46 s | 8.47 s warm | Preserved |
| `Cau 3.m4a` | 5.91 s | 5.09 s warm | Preserved |

- ASR-only steady cgroup memory: approximately 645 MiB
- ASR-only peak cgroup memory: approximately 748 MiB
- Base API image size: approximately 498 MiB
- Clean optional-ASR image size: approximately 601 MiB (about 103 MiB added)
- Model artifact: approximately 240 MiB, mounted separately and not stored in
  the repository or image
- API tokens consumed: none

The current Railway Hobby plan ceiling and absence of a custom service limit
leave enough theoretical capacity for this prototype, but the existing API
process and ASR model have not yet been measured together in a production-like
container. A 1 GiB service limit would be too close to the observed ASR-only
peak; packaging should target at least 2 GiB before any deployment decision.

This gate approves Docker runtime feasibility only. It does not approve a
Railway deployment. The next stage must produce a clean optional ASR image,
package the self-contained model artifact through the existing deployment
workflow, and measure the combined API plus model process before a human
deployment gate.

## Self-contained packaging and combined runtime gate

Validation date: 2026-10-09

The existing Dockerfile now has an opt-in `INSTALL_ASR=true` build path. It
downloads the official `vinai/PhoWhisper-small` snapshot at revision
`a86b604c346caf7148c37512eafe783a16420adb`, converts that local snapshot to
CTranslate2 `int8`, and copies only the runtime model into the final image.
The final image contains `model.bin`, `config.json`, `tokenizer.json`, and
`preprocessor_config.json`; it does not contain the builder-only `torch`,
`transformers`, or `accelerate` packages.

The resulting local image evidence was:

- image digest: `sha256:4f7f760122768afc7cf79b910aa75e242a8508d7141f9ba1138c941460e9c6dd`
- image size: 831,144,825 bytes (about 793 MiB)
- runtime user: non-root UID 1000
- runtime model initialization with container networking disabled: pass
- targeted ASR API/service tests: 8 passed
- default non-ASR API behavior: health remains 200 and the disabled ASR route
  returns controlled HTTP 503

The self-contained image was then run as the complete FastAPI application with
one Uvicorn worker, two CPU cores, a 2 GiB memory limit, and the embedded RQ
worker disabled. It connected to the existing local PostgreSQL, Redis, and
Qdrant services without changing their data or configuration.

| Request | Audio | Endpoint latency | Transcript |
|---|---:|---:|---|
| `Cau 1.m4a` cold | 7.68 s | 24.67 s | `ngành khoa học máy tính ở đại học việt đức.` |
| `Cau 1.m4a` warm | 7.68 s | 7.42 s | `ngành khoa học máy tính ở đại học việt đức.` |
| `Cau 2.m4a` warm | 4.46 s | 3.33 s | `đại học việt đức có bao nhiêu ngành tất cả.` |
| `Cau 3.m4a` warm | 5.91 s | 3.39 s | `học phí của ngành computer science and engineering.` |

- baseline application memory: about 233 MiB
- post-load steady memory: about 898 MiB by Docker stats
- measured cgroup peak: 1,069,342,720 bytes (about 1,020 MiB)
- restarts: 0
- OOM kills: 0
- health before and after inference: HTTP 200
- audio and transcript persistence: none
- API tokens consumed: none

This gate passes for a controlled prototype at a minimum 2 GiB service memory
limit and exactly one API worker. The result does not approve production
deployment. Railway build/deploy, public frontend microphone controls, broader
audio coverage, and a human production gate remain separate work.

## Sources

- [OpenAI Whisper repository](https://github.com/openai/whisper)
- [OpenAI Whisper large-v3 model card](https://huggingface.co/openai/whisper-large-v3)
- [OpenAI Whisper large-v3-turbo model card](https://huggingface.co/openai/whisper-large-v3-turbo)
- [VinAI PhoWhisper-small model card](https://huggingface.co/vinai/PhoWhisper-small)
- [faster-whisper repository and benchmarks](https://github.com/SYSTRAN/faster-whisper)
- [Distil-Whisper repository](https://github.com/huggingface/distil-whisper)
- [Railway deployment resource limits](https://docs.railway.com/deployments/troubleshooting/slow-deployments)
- [Railway CPU and memory sizing](https://docs.railway.com/guides/right-size-cpu-memory)
