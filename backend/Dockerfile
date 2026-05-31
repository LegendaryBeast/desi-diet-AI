FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js & npm (needed by Prisma Client Python internally to run CLI actions)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . .

# Generate Prisma Client Python with standard binary query engines
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
RUN python -m prisma py fetch
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" python -m prisma generate

# Make startup script executable
RUN chmod +x start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
