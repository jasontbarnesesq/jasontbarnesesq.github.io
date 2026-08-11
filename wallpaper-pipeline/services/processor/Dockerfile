# Cloud Run GPU (NVIDIA L4) container: Real-ESRGAN super-resolution +
# OpenCV/Pillow precision canvas fitting, served over FastAPI.
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3-pip python3.11-venv \
        libgl1 libglib2.0-0 wget \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

COPY requirements.txt .

# Install the CUDA-matched torch/torchvision build first, then the rest.
RUN pip install --index-url https://download.pytorch.org/whl/cu121 \
        torch==2.1.2 torchvision==0.16.2 \
    && pip install -r requirements.txt

# Bake model weights into the image so cold starts don't depend on
# outbound network access to GitHub.
RUN mkdir -p /app/weights \
    && wget -q -O /app/weights/RealESRGAN_x4plus.pth \
        https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth \
    && wget -q -O /app/weights/RealESRGAN_x4plus_anime_6B.pth \
        https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
