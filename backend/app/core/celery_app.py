"""
Celery Application Configuration
Handles async task processing for book content extraction and OCR
"""
import os
from celery import Celery
from kombu import Queue

# Get Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Create Celery app
celery_app = Celery(
    "educomfort",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["app.tasks.book_processing"]  # Import task modules
)

# Celery configuration
celery_app.conf.update(
    # Task execution settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task routing
    task_routes={
        "app.tasks.book_processing.process_text_extraction": {"queue": "text_extraction"},
        "app.tasks.book_processing.process_ocr": {"queue": "ocr"},
    },
    
    # Define queues with priorities
    task_queues=(
        Queue("text_extraction", routing_key="text_extraction", priority=5),
        Queue("ocr", routing_key="ocr", priority=3),
        Queue("default", routing_key="default", priority=1),
    ),
    
    # Retry settings
    task_acks_late=True,  # Acknowledge task after completion
    task_reject_on_worker_lost=True,  # Retry if worker crashes
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        "master_name": "mymaster",
        "retry_on_timeout": True,
    },
    
    # Worker settings
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks (prevent memory leaks)
    
    # Monitoring
    task_send_sent_event=True,
    worker_send_task_events=True,
)

# Task retry configuration
celery_app.conf.task_default_retry_delay = 60  # Retry after 60 seconds
celery_app.conf.task_max_retries = 3  # Max 3 retries

if __name__ == "__main__":
    celery_app.start()
