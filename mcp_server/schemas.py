from __future__ import annotations

from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class FindPlaceUsingKwInput(BaseModel):
    keyword: str
    cityName: str
    countryCode: str

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

FIND_BY_KW_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "keyword": {"type": "string"},
        "cityName": {"type": "string"},
        "countryCode": {"type": "string"},
    },
    "required": ["keyword", "cityName", "countryCode"],
    "additionalProperties": False,
}
