FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir requests ddtrace python-json-logger
COPY loadgen.py .
CMD ["ddtrace-run", "python", "-u", "loadgen.py"]
