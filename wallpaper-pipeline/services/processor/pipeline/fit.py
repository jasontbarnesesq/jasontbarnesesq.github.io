"""Aspect-correct crop/pad, optional denoise, AI upscale, and final
pixel-exact Lanczos resize to the target canvas.
"""
import cv2
import numpy as np
from PIL import Image

from .upscale import Upscaler


def _crop_to_aspect(image: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Center-crop so the image exactly matches the target aspect ratio
    without stretching ("cover")."""
    target_ratio = target_w / target_h
    w, h = image.size
    src_ratio = w / h

    if abs(src_ratio - target_ratio) < 1e-6:
        return image
    if src_ratio > target_ratio:
        new_w = round(h * target_ratio)
        left = (w - new_w) // 2
        return image.crop((left, 0, left + new_w, h))
    new_h = round(w / target_ratio)
    top = (h - new_h) // 2
    return image.crop((0, top, w, top + new_h))


def _pad_to_aspect(image: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Letterbox-pad so the image exactly matches the target aspect ratio
    without stretching or cropping ("pad")."""
    target_ratio = target_w / target_h
    w, h = image.size
    src_ratio = w / h

    if abs(src_ratio - target_ratio) < 1e-6:
        return image
    if src_ratio > target_ratio:
        new_h = round(w / target_ratio)
        canvas = Image.new("RGB", (w, new_h), (0, 0, 0))
        canvas.paste(image, (0, (new_h - h) // 2))
        return canvas
    new_w = round(h * target_ratio)
    canvas = Image.new("RGB", (new_w, h), (0, 0, 0))
    canvas.paste(image, ((new_w - w) // 2, 0))
    return canvas


def _denoise(image: Image.Image, strength: float) -> Image.Image:
    if strength <= 0:
        return image
    h = max(1, round(strength * 15))
    arr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    arr = cv2.fastNlMeansDenoisingColored(arr, None, h, h, 7, 21)
    return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))


def fit_to_canvas(
    image: Image.Image,
    target_width: int,
    target_height: int,
    crop_mode: str,
    denoise: float,
    upscaler: Upscaler,
    model_name: str,
) -> Image.Image:
    shaped = (
        _crop_to_aspect(image, target_width, target_height)
        if crop_mode == "cover"
        else _pad_to_aspect(image, target_width, target_height)
    )

    shaped = _denoise(shaped, denoise)

    scale_needed = max(target_width / shaped.width, target_height / shaped.height)
    if scale_needed > 1.0:
        # Source is smaller than the target canvas: synthesize detail with
        # Real-ESRGAN before the final resize.
        shaped = upscaler.upscale(shaped, min_scale=scale_needed, model_name=model_name)

    # Pixel-exact final pass, whether we upscaled or the source was already
    # larger than the target (in which case this is a high-quality downscale).
    return shaped.resize((target_width, target_height), resample=Image.LANCZOS)
