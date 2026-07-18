# django_backend/models.py
"""
SPDX-License-Identifier: Apache-2.0
Jua Sheria Django Models - Custom User Model and Scratchpad Document
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    class Role(models.TextChoices):
        CITIZEN = 'citizen', _('Citizen')
        LAWYER = 'lawyer', _('Lawyer')

    role = models.CharField(
        max_length=15,
        choices=Role.choices,
        default=Role.CITIZEN,
        help_text=_("The role determines portal access and prompt intelligence tuning.")
    )
    full_name = models.CharField(
        max_length=150,
        blank=True,
        help_text=_("User's full name or Counsel designation.")
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class ScratchpadDocument(models.Model):
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="scratchpads",
        limit_choices_to={'role': 'lawyer'}
    )
    title = models.CharField(max_length=255, default="Untitled Legal Draft")
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"
