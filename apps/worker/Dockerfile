FROM python:3.12-slim

WORKDIR /app/apps/worker

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends gcc \
  && rm -rf /var/lib/apt/lists/*

COPY apps/worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

COPY apps/worker ./

ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]