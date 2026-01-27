# utils.py

from __future__ import annotations

import json
from typing import Any, Dict, List
import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLACES_DIR = os.path.join(BASE_DIR, "data", "places")

def _load_all_places() -> List[Dict[str, Any]]:
    """Load all JSON files from ./data/places"""
    places: List[Dict[str, Any]] = []

    if not os.path.isdir(PLACES_DIR):
        raise FileNotFoundError(f"Directory not found: {PLACES_DIR}")

    for filename in os.listdir(PLACES_DIR):
        if not filename.endswith(".json"):
            continue

        path = os.path.join(PLACES_DIR, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                places.append(json.load(f))
        except Exception as e:
            print(f"⚠️ Failed to load {filename}: {e}")

    return places