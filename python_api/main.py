"""
Weed Detection API (FastAPI + TFLite / LiteRT) - lightweight version for free hosting.

Endpoints:
    GET  /health   -> is the model loaded
    POST /predict  -> multipart/form-data, field name "file" (an image)

Needs two files next to this script (created by tools/convert_to_tflite.py):
    model.tflite, model_meta.json
"""
import io
import json
import os

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(BASE_DIR, "model.tflite"))
META_PATH = os.getenv("META_PATH", os.path.join(BASE_DIR, "model_meta.json"))
THRESHOLD = float(os.getenv("THRESHOLD", "0.5"))       # weed if prob >= this
INVERT_LABELS = os.getenv("INVERT_LABELS", "0") == "1"  # set 1 if labels reversed
MAX_MB = 10

for p in (MODEL_PATH, META_PATH):
    if not os.path.exists(p):
        raise RuntimeError(f"File not found: {p}. Run tools/convert_to_tflite.py first.")

with open(META_PATH) as f:
    meta = json.load(f)
IMG_SIZE = (int(meta["input_size"][0]), int(meta["input_size"][1]))  # (width, height)
SCALE_IN_API = bool(meta["divide_by_255"])

interpreter = Interpreter(model_path=MODEL_PATH, num_threads=1)
interpreter.allocate_tensors()
_inp = interpreter.get_input_details()[0]
_out = interpreter.get_output_details()[0]

print(f"[API] model={MODEL_PATH} input size={IMG_SIZE} divide by 255={SCALE_IN_API} "
      f"invert labels={INVERT_LABELS} threshold={THRESHOLD}")

app = FastAPI(title="Weed Detection in Rose Plants - CNN API (TFLite)", version="1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


def preprocess(data: bytes) -> np.ndarray:
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="File is not a valid image.")
    img = img.resize(IMG_SIZE)
    arr = np.asarray(img, dtype="float32")
    if SCALE_IN_API:
        arr = arr / 255.0
    return np.expand_dims(arr, axis=0).astype(_inp["dtype"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": True,
        "runtime": "tflite",
        "input_size": list(IMG_SIZE),
        "divide_by_255_in_api": SCALE_IN_API,
        "invert_labels": INVERT_LABELS,
        "threshold": THRESHOLD,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image larger than {MAX_MB} MB.")

    batch = preprocess(data)
    interpreter.set_tensor(_inp["index"], batch)
    interpreter.invoke()
    weed_prob = float(interpreter.get_tensor(_out["index"])[0][0])
    if INVERT_LABELS:
        weed_prob = 1.0 - weed_prob

    is_weed = weed_prob >= THRESHOLD
    confidence = weed_prob if is_weed else 1.0 - weed_prob
    return {
        "prediction": "Weed Detected" if is_weed else "No Weed Detected",
        "confidence": round(confidence, 4),
        "weed_probability": round(weed_prob, 4),
    }
