FROM node:22 AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build


FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY --from=frontend-build /app/frontend/build ./frontend/build

RUN python manage.py collectstatic --no-input

EXPOSE 8000

CMD ["gunicorn", "safety_system.wsgi:application"]