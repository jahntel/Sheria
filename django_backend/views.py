# django_backend/views.py
"""
SPDX-License-Identifier: Apache-2.0
Jua Sheria Django Views - Registration, Login, CRUD Scratchpads, and Streaming Chat with dynamic prompts
"""

import json
from django.http import StreamingHttpResponse, JsonResponse
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, ScratchpadDocument
from .services import KenyanLegalFetchService

# Import official Google GenAI Python SDK
from google import genai
from google.genai import types

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    data = request.data
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('fullName')
    role = data.get('role')

    if not email or not password or not full_name or not role:
        return JsonResponse({'error': 'Please fill in all details.'}, status=400)

    if role not in ['citizen', 'lawyer']:
        return JsonResponse({'error': 'Invalid portal selection.'}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({'error': 'User with this email already exists.'}, status=400)

    # Django Custom User Model creation
    user = User.objects.create_user(
        username=email.lower(),
        email=email.lower(),
        password=password,
        role=role,
        full_name=full_name
    )

    refresh = RefreshToken.for_user(user)
    return JsonResponse({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'fullName': user.full_name,
            'createdAt': user.date_joined.isoformat()
        },
        'token': str(refresh.access_token)
    }, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    data = request.data
    email = data.get('email', '').lower()
    password = data.get('password')

    if not email or not password:
        return JsonResponse({'error': 'Please provide email and password.'}, status=400)

    user = authenticate(username=email, password=password)
    if user is None:
        return JsonResponse({'error': 'Invalid email or password.'}, status=401)

    refresh = RefreshToken.for_user(user)
    return JsonResponse({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'fullName': user.full_name,
            'createdAt': user.date_joined.isoformat()
        },
        'token': str(refresh.access_token)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    return JsonResponse({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'fullName': user.full_name,
            'createdAt': user.date_joined.isoformat()
        }
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documents_list_create_view(request):
    user = request.user
    if user.role != 'lawyer':
        return JsonResponse({'error': 'Documents are only available in the Lawyer Workspace.'}, status=403)

    if request.method == 'GET':
        docs = ScratchpadDocument.objects.filter(user=user)
        results = [{
            'id': str(doc.id),
            'title': doc.title,
            'content': doc.content,
            'createdAt': doc.created_at.isoformat(),
            'updatedAt': doc.updated_at.isoformat()
        } for doc in docs]
        return JsonResponse(results, safe=False)

    elif request.method == 'POST':
        data = request.data
        doc_id = data.get('id')
        title = data.get('title')
        content = data.get('content', '')

        if not title:
            return JsonResponse({'error': 'Document title is required.'}, status=400)

        if doc_id:
            try:
                doc = ScratchpadDocument.objects.get(id=doc_id, user=user)
                doc.title = title
                doc.content = content
                doc.save()
            except ScratchpadDocument.DoesNotExist:
                return JsonResponse({'error': 'Document not found.'}, status=404)
        else:
            doc = ScratchpadDocument.objects.create(
                user=user,
                title=title,
                content=content
            )

        return JsonResponse({
            'id': str(doc.id),
            'title': doc.title,
            'content': doc.content,
            'createdAt': doc.created_at.isoformat(),
            'updatedAt': doc.updated_at.isoformat()
        }, status=201 if not doc_id else 200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def document_detail_delete_view(request, pk):
    user = request.user
    if user.role != 'lawyer':
        return JsonResponse({'error': 'Forbidden.'}, status=403)

    try:
        doc = ScratchpadDocument.objects.get(pk=pk, user=user)
        doc.delete()
        return JsonResponse({'success': True})
    except ScratchpadDocument.DoesNotExist:
        return JsonResponse({'error': 'Document not found.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def streaming_chat_view(request):
    user = request.user
    messages = request.data.get('messages', [])

    if not messages:
        return JsonResponse({'error': 'Invalid chat history.'}, status=400)

    last_msg = messages[-1]['content']

    # 1. Look up legal database context
    citations = KenyanLegalFetchService.lookup_laws(last_msg)
    grounding_context = "\n\n".join([
        f"--- CITATION RECORD: {c['actName']} ({c['section']}) ---\nTitle: {c['title']}\nVerbatim Content: {c['text']}"
        for c in citations
    ])

    # 2. Select persona instructions
    if user.role == "citizen":
        system_instruction = f"""
You are "Jua Sheria", a Swahili-accented, warm, and friendly legal information chatbot for Kenyan citizens.
Your job is to translate complex statutory legal terms and codes of Kenya into clear, plain, and conversational Swahili-English.

Key Directives:
- Use clear analogies.
- Absolutely omit heavy legalese or define it inline.
- NEVER offer formal attorney-client legal advice. Keep it to information only.
- Structure advice in clear bullet points with bold steps.
- Cite sources as "[Citation: Section X of the Y Act]" or "[Citation: Article X of the Constitution of Kenya 2010]".

VERIFIED KENYAN LEGAL GROUNDING CONTEXT:
{grounding_context}
"""
    else:  # lawyer
        system_instruction = f"""
You are "Jua Sheria - Counsel Workspace", an advanced, precise legal brainstorming and research assistant for Kenyan attorneys.

Key Directives:
- Use formal, precise Kenyan legal terminology.
- Detail elements of proof needed to succeed in litigation.
- Evaluate potential adversarial defenses and counter-arguments.
- Format with clear headings ready to copy directly.
- Include precise statutory citation tags like "[Citation: Section X of the Y Act]".

VERIFIED KENYAN LEGAL GROUNDING CONTEXT:
{grounding_context}
"""

    # 3. Stream Generator function for SSE
    def sse_event_stream():
        # First send citations list
        yield f"event: citations\ndata: {json.dumps(citations)}\n\n"

        try:
            # Initialize official Google GenAI Client
            client = genai.Client()
            
            # Format chat message history list
            contents = [
                types.Content(
                    role="model" if m['role'] == "assistant" else "user",
                    parts=[types.Part.from_text(text=m['content'])]
                ) for m in messages
            ]

            response_stream = client.models.generate_content_stream(
                model='gemini-3.5-flash',
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2
                )
            )

            for chunk in response_stream:
                if chunk.text:
                    yield f"event: chunk\ndata: {json.dumps({'text': chunk.text})}\n\n"

            yield "event: end\ndata: {}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingHttpResponse(sse_event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no' # Prevents nginx buffering issues
    return response
