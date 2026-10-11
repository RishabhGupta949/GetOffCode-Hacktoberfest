import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes import router
from backend.models.state import InvalidTransition
from backend.services.snapshot import cleanup_expired
from backend.storage.db import init_db

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    cleanup_expired()
    yield


app = FastAPI(title="TouchGrass backend", version="0.1.0", lifespan=lifespan)

# Only the Chrome extension origin (and the local dev tools) may call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^chrome-extension://[a-z]{32}$|^http://(127\.0\.0\.1|localhost)(:\d+)?$",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(InvalidTransition)
async def invalid_transition(_: Request, exc: InvalidTransition):
    return JSONResponse(status_code=409,
                        content={"error": str(exc), "code": "INVALID_TRANSITION"})


app.include_router(router)
