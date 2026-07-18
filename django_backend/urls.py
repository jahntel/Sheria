# django_backend/urls.py
"""
SPDX-License-Identifier: Apache-2.0
Jua Sheria Django URL Configuration
"""

from django.urls import path
from .views import (
    register_view,
    login_view,
    me_view,
    documents_list_create_view,
    document_detail_delete_view,
    streaming_chat_view
)

urlpatterns = [
    # Authentication endpoints
    path('api/auth/register', register_view, name='auth_register'),
    path('api/auth/login', login_view, name='auth_login'),
    path('api/auth/me', me_view, name='auth_me'),

    # Document management (Lawyers only)
    path('api/documents', documents_list_create_view, name='documents_list_create'),
    path('api/documents/<int:pk>', document_detail_delete_view, name='document_delete'),

    # Interactive Chat endpoint
    path('api/chat', streaming_chat_view, name='streaming_chat'),
]
