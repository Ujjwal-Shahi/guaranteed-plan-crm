FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data/photos

EXPOSE 8080
CMD ["/bin/sh", "-c", "mkdir -p /tmp/photos; (python seed.py && python seed_deals.py) & exec uvicorn main:app --host 0.0.0.0 --port 8080"]
