import io
import logging

import httpx
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel, Field

from pipeline.fit import fit_to_canvas
from pipeline.upscale import Upscaler

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="5K2K Wallpaper Processor")
upscaler = Upscaler()

HTTP_TIMEOUT = httpx.Timeout(120.0, read=120.0)


class ProcessRequest(BaseModel):
    job_id: str
    input_signed_url: str
    output_signed_url: str
    target_width: int = 5120
    target_height: int = 2160
    crop_mode: str = Field(default="cover", pattern="^(cover|pad)$")
    denoise: float = Field(default=0.0, ge=0.0, le=1.0)
    model: str = "x4plus"


class ProcessResponse(BaseModel):
    job_id: str
    width: int
    height: int
    bytes: int


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/process", response_model=ProcessResponse)
async def process(req: ProcessRequest):
    logging.info("job %s: downloading source", req.job_id)
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        try:
            r = await client.get(req.input_signed_url)
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(502, f"failed to download source: {e}") from e

    try:
        image = Image.open(io.BytesIO(r.content)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"unreadable image: {e}") from e

    logging.info(
        "job %s: fitting %dx%d -> %dx%d mode=%s denoise=%.2f model=%s",
        req.job_id, image.width, image.height,
        req.target_width, req.target_height, req.crop_mode, req.denoise, req.model,
    )

    result = fit_to_canvas(
        image=image,
        target_width=req.target_width,
        target_height=req.target_height,
        crop_mode=req.crop_mode,
        denoise=req.denoise,
        upscaler=upscaler,
        model_name=req.model,
    )

    buf = io.BytesIO()
    result.save(buf, format="PNG", optimize=True)
    payload = buf.getvalue()

    logging.info("job %s: uploading %d bytes", req.job_id, len(payload))
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        try:
            put = await client.put(
                req.output_signed_url,
                content=payload,
                headers={"Content-Type": "image/png"},
            )
            put.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(502, f"failed to upload result: {e}") from e

    return ProcessResponse(
        job_id=req.job_id,
        width=result.width,
        height=result.height,
        bytes=len(payload),
    )
