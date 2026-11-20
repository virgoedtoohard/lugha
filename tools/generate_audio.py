"""
Generate pronunciation audio for every Lugha word with Meta's open MMS text-to-speech
models (https://huggingface.co/facebook/mms-tts). Files go to audio/<course>/<item-id>.wav
and are listed in audio/manifest.json, which the app reads at start-up.

Setup (once):
    python -m pip install -r tools/requirements.txt
Each run:
    tsc
    node tools/export-content.mjs
    python tools/generate_audio.py                  # every course
    python tools/generate_audio.py --course kik     # one course
    python tools/generate_audio.py --model kik=gateremark/kikuyu-tts-v1   # try another model

Words already generated with the same spelling are skipped, so re-runs are quick.
If a reviewer corrects a word's spelling, the old file is ignored by the app and this
script makes a new one next time.

LICENCE NOTE: the facebook/mms-tts models are CC BY-NC 4.0 (non-commercial). Fine for
testing; replace them with native-speaker recordings (or a commercially licensed voice)
before charging for the app.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "tools" / "content.json"
AUDIO = ROOT / "audio"
MANIFEST = AUDIO / "manifest.json"

# Candidate models per course, tried in order. Not every language has an MMS voice;
# the script reports which ones it couldn't find.
MODELS = {
    "kik": ["facebook/mms-tts-kik"],
    "luo": ["facebook/mms-tts-luo"],
    "kam": ["facebook/mms-tts-kam"],
    "luy": ["facebook/mms-tts-luy", "facebook/mms-tts-bxk", "facebook/mms-tts-lri"],
    "luy-bxk": ["facebook/mms-tts-bxk"],
    "luy-wan": ["facebook/mms-tts-lwg", "facebook/mms-tts-bxk"],
    "luy-rag": ["facebook/mms-tts-rag", "facebook/mms-tts-lri"],
    "luy-nyd": ["facebook/mms-tts-nyd"],
    "kln": ["facebook/mms-tts-kln", "facebook/mms-tts-sgc", "facebook/mms-tts-niq"],
    "kln-sgc": ["facebook/mms-tts-sgc", "facebook/mms-tts-kln"],
    "kln-niq": ["facebook/mms-tts-niq", "facebook/mms-tts-sgc", "facebook/mms-tts-kln"],
}


def load_model(names):
    from transformers import AutoTokenizer, VitsModel
    for name in names:
        try:
            print(f"  loading {name} …", flush=True)
            return name, VitsModel.from_pretrained(name), AutoTokenizer.from_pretrained(name)
        except Exception as e:  # model doesn't exist or can't be downloaded
            print(f"  ✗ {name}: {type(e).__name__}", flush=True)
    return None, None, None


def synth(model, tok, text):
    import numpy as np
    import torch
    clean = re.sub(r"[?!.,]", "", text).strip()
    inputs = tok(clean, return_tensors="pt")
    if inputs["input_ids"].shape[-1] == 0:
        return None
    torch.manual_seed(555)  # MMS-TTS is non-deterministic; fix the seed for stable output
    with torch.no_grad():
        wav = model(**inputs).waveform[0].cpu().numpy()
    peak = float(np.abs(wav).max()) or 1.0
    wav = wav / peak * 0.9
    # trim leading/trailing near-silence
    idx = np.where(np.abs(wav) > 0.02)[0]
    if len(idx):
        pad = int(0.05 * model.config.sampling_rate)
        wav = wav[max(0, idx[0] - pad): idx[-1] + pad]
    return (wav * 32767).astype("int16")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--course", action="append", help="course code(s), e.g. kik luo (default: all)")
    ap.add_argument("--model", action="append", default=[], help="override: code=huggingface/model-name")
    ap.add_argument("--force", action="store_true", help="regenerate even if the file exists")
    args = ap.parse_args()

    if not CONTENT.exists():
        sys.exit("tools/content.json not found — run `node tools/export-content.mjs` first.")
    from scipy.io import wavfile

    for o in args.model:
        code, name = o.split("=", 1)
        MODELS[code] = [name] + MODELS.get(code, [])

    courses = json.loads(CONTENT.read_text(encoding="utf-8"))
    if args.course:
        courses = [c for c in courses if c["code"] in args.course]
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    loaded = {}
    report = []

    for c in courses:
        code = c["code"]
        print(f"\n{c['name']} ({code}) — {len(c['items'])} words")
        key = tuple(MODELS.get(code, []))
        if key not in loaded:
            loaded[key] = load_model(key)
        name, model, tok = loaded[key]
        if model is None:
            report.append((code, "no voice model found", 0))
            continue
        made = skipped = 0
        out_dir = AUDIO / code
        out_dir.mkdir(parents=True, exist_ok=True)
        for item in c["items"]:
            rel = f"audio/{code}/{item['id']}.wav"
            prev = manifest.get(item["id"])
            if not args.force and prev and prev["text"] == item["target"] and (ROOT / rel).exists():
                skipped += 1
                continue
            pcm = synth(model, tok, item["target"])
            if pcm is None:
                print(f"  ! could not voice “{item['target']}”")
                continue
            wavfile.write(ROOT / rel, model.config.sampling_rate, pcm)
            manifest[item["id"]] = {"file": rel, "text": item["target"], "model": name}
            made += 1
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
        report.append((code, name, made))
        print(f"  ✓ {made} new, {skipped} already done")

    print("\nSummary")
    for code, name, made in report:
        print(f"  {code:8} {name:35} {made} new files")


if __name__ == "__main__":
    main()
