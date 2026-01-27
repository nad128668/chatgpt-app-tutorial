from __future__ import annotations

import random
from copy import deepcopy
from typing import List

import mcp.types as types
from mcp.server.fastmcp import FastMCP
from pydantic import ValidationError

from .utils import _load_all_places
from .schemas import (
    FindPlaceUsingKwInput,
    FIND_BY_KW_SCHEMA,
)
from .security import transport_security_settings
from .widgets import (
    MIME_TYPE,
    build_widgets,
    widgets_by_id,
    widgets_by_uri,
    resource_description,
    tool_meta,
    tool_invocation_meta,
)

# Build widgets once
WIDGETS = build_widgets()
WIDGETS_BY_ID = widgets_by_id(WIDGETS)
WIDGETS_BY_URI = widgets_by_uri(WIDGETS)

# One widget shared by both tools
MAP_WIDGET = WIDGETS_BY_ID["places-map"]


mcp = FastMCP(
    name="places-python",
    stateless_http=True,
    transport_security=transport_security_settings(),
)


@mcp._mcp_server.list_tools()
async def _list_tools() -> List[types.Tool]:
    return [
        types.Tool(
            name="find_places",
            title="Find places using keyword",
            description="Return places and render a map.",
            inputSchema=deepcopy(FIND_BY_KW_SCHEMA),
            _meta=tool_meta(MAP_WIDGET),
            annotations={
                "destructiveHint": False,
                "openWorldHint": False,
                "readOnlyHint": True,
            },
        ),
    ]


@mcp._mcp_server.list_resources()
async def _list_resources() -> List[types.Resource]:
    return [
        types.Resource(
            name=w.title,
            title=w.title,
            uri=w.template_uri,
            description=resource_description(w),
            mimeType=MIME_TYPE,
            _meta=tool_meta(w),
        )
        for w in WIDGETS
    ]


@mcp._mcp_server.list_resource_templates()
async def _list_resource_templates() -> List[types.ResourceTemplate]:
    return [
        types.ResourceTemplate(
            name=w.title,
            title=w.title,
            uriTemplate=w.template_uri,
            description=resource_description(w),
            mimeType=MIME_TYPE,
            _meta=tool_meta(w),
        )
        for w in WIDGETS
    ]


async def _handle_read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
    widget = WIDGETS_BY_URI.get(str(req.params.uri))
    if widget is None:
        return types.ServerResult(
            types.ReadResourceResult(
                contents=[],
                _meta={"error": f"Unknown resource: {req.params.uri}"},
            )
        )

    contents = [
        types.TextResourceContents(
            uri=widget.template_uri,
            mimeType=MIME_TYPE,
            text=widget.html,
            _meta=tool_meta(widget),
        )
    ]
    return types.ServerResult(types.ReadResourceResult(contents=contents))


async def _call_tool_request(req: types.CallToolRequest) -> types.ServerResult:
    tool_name = req.params.name
    args = req.params.arguments or {}
    meta = tool_invocation_meta(MAP_WIDGET)

    if tool_name == "find_places":
        try:
            payload = FindPlaceUsingKwInput.model_validate(args)
        except ValidationError as exc:
            return types.ServerResult(
                types.CallToolResult(
                    content=[types.TextContent(type="text", text=f"Input validation error: {exc.errors()}")],
                    isError=True,
                )
            )

        places = _load_all_places()
        return types.ServerResult(
            types.CallToolResult(
                content=[types.TextContent(type="text", text=MAP_WIDGET.response_text)],
                structuredContent={
                    "ok": True,
                    "keyword": payload.keyword,
                    "cityName": payload.cityName,
                    "countryCode": payload.countryCode,
                    "count": len(places),
                    "places": places,
                },
                _meta=meta,
            )
        )

    return types.ServerResult(
        types.CallToolResult(
            content=[types.TextContent(type="text", text=f"Unknown tool: {tool_name}")],
            isError=True,
        )
    )


# Wire handlers
mcp._mcp_server.request_handlers[types.CallToolRequest] = _call_tool_request
mcp._mcp_server.request_handlers[types.ReadResourceRequest] = _handle_read_resource


# Export ASGI app
app = mcp.streamable_http_app()

# Optional: CORS
try:
    from starlette.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )
except Exception:
    pass
