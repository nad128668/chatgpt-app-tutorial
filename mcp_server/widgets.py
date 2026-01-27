from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, List


MIME_TYPE = "text/html+skybridge"


@dataclass(frozen=True)
class Widget:
    identifier: str
    title: str
    template_uri: str
    invoking: str
    invoked: str
    html: str
    response_text: str


ASSETS_DIR = (Path(__file__).resolve().parent / "../ui-js/dist").resolve()


@lru_cache(maxsize=None)
def load_widget_html(file_stem: str) -> str:
    html_path = ASSETS_DIR / f"{file_stem}/index.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf8")
    raise FileNotFoundError(f'Widget HTML "{html_path}" not found.')


def build_widgets() -> List[Widget]:
    return [
        Widget(
            identifier="places-map",
            title="Show Places Map",
            template_uri="ui://widget/places-map.html",
            invoking="Preparing a map",
            invoked="Map ready",
            html=load_widget_html("places-map"),
            response_text="Rendered a places map!",
        )
    ]


def widgets_by_id(widgets: List[Widget]) -> Dict[str, Widget]:
    return {w.identifier: w for w in widgets}


def widgets_by_uri(widgets: List[Widget]) -> Dict[str, Widget]:
    return {w.template_uri: w for w in widgets}


def resource_description(widget: Widget) -> str:
    return f"{widget.title} widget markup"


def tool_meta(widget: Widget) -> dict:
    return {
        "openai/outputTemplate": widget.template_uri,
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/toolInvocation/invoked": widget.invoked,
        "openai/widgetAccessible": True,
    }


def tool_invocation_meta(widget: Widget) -> dict:
    return {
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/toolInvocation/invoked": widget.invoked,
    }
