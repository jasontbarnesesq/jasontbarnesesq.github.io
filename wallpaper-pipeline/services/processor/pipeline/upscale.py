"""Real-ESRGAN super-resolution, lazily loaded and cached per model."""
import logging
import math

import cv2
import numpy as np
from PIL import Image

_MODEL_CONFIGS = {
    "x4plus": dict(
        scale=4,
        weights="weights/RealESRGAN_x4plus.pth",
        num_block=23,
    ),
    "x4plus_anime": dict(
        scale=4,
        weights="weights/RealESRGAN_x4plus_anime_6B.pth",
        num_block=6,
    ),
}


class Upscaler:
    def __init__(self):
        self._instances = {}

    def _get(self, model_name: str):
        cfg = _MODEL_CONFIGS.get(model_name, _MODEL_CONFIGS["x4plus"])
        if model_name not in _MODEL_CONFIGS:
            model_name = "x4plus"

        if model_name in self._instances:
            return self._instances[model_name], cfg

        import torch
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer

        arch = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=cfg["num_block"],
            num_grow_ch=32,
            scale=cfg["scale"],
        )
        gpu_available = torch.cuda.is_available()
        upsampler = RealESRGANer(
            scale=cfg["scale"],
            model_path=cfg["weights"],
            model=arch,
            tile=0 if gpu_available else 512,
            tile_pad=10,
            pre_pad=0,
            half=gpu_available,
        )
        self._instances[model_name] = upsampler
        logging.info("loaded Real-ESRGAN model=%s gpu=%s", model_name, gpu_available)
        return upsampler, cfg

    def upscale(self, image: Image.Image, min_scale: float, model_name: str) -> Image.Image:
        """Run enough Real-ESRGAN passes to reach at least `min_scale`x."""
        upsampler, cfg = self._get(model_name)
        model_scale = cfg["scale"]
        passes = max(1, math.ceil(math.log(max(min_scale, 1.0001), model_scale)))

        # RealESRGANer expects/returns BGR arrays (it's built around cv2.imread).
        arr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        start_w, start_h = image.width, image.height

        for _ in range(passes):
            arr, _ = upsampler.enhance(arr, outscale=model_scale)
            if arr.shape[1] >= start_w * min_scale and arr.shape[0] >= start_h * min_scale:
                break

        return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
