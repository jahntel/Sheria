# Jua Sheria - Django Backend Setup Guide

This folder contains a fully modular, production-ready **Django backend codebase** that implements the exact role-based authentication, Custom User Model, Laws.Africa API mock (`KenyanLegalFetchService`), and SSE real-time streaming chat specified for **Jua Sheria**.

## Prerequisites

- Python 3.10+
- `pip` package manager

## Installation

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

2. Install dependencies:
   ```bash
   pip install django djangorestframework djangorestframework-simplejwt google-genai django-cors-headers
   ```

3. Configure your API key in environment variables:
   ```bash
   export GEMINI_API_KEY="your-gemini-api-key"
   ```

## Configuration

Add the custom user model to your `settings.py`:

```python
# settings.py
AUTH_USER_MODEL = 'django_backend.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

# Add 'django_backend' and 'rest_framework' and 'corsheaders' to INSTALLED_APPS
# Configure CORS_ALLOW_ALL_ORIGINS = True or restrict to React preview URL
```

## Running Migrations and Dev Server

```bash
python manage.py makemigrations django_backend
python manage.py migrate
python manage.py runserver 8000
```

Once running, you can connect your React frontend directly to `http://localhost:8000` or configure your Vite reverse-proxy!
