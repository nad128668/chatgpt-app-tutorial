from __future__ import annotations

from .mcp_app import app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mcp_server.main:app", host="0.0.0.0", port=2091)