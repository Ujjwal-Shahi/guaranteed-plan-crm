FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data/photos

EXPOSE 8000
CMD ["sh", "-c", "mkdir -p /tmp/photos && export DATABASE_URL=${DATABASE_URL:-sqlite:////tmp/guaranteed_plan.db} && export UPLOAD_DIR=${UPLOAD_DIR:-/tmp/photos} && (python seed.py && python seed_deals.py) & uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
