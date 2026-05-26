import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Tutorial
from .serializers import TutorialSerializer
from accounts.permissions import IsAdminRole

# ── File type auto-detection from extension ───────────────────────────────────
EXT_TYPE = {
    # Video
    'mp4': 'video', 'avi': 'video', 'mov': 'video', 'mkv': 'video',
    'webm': 'video', 'm4v': 'video', 'flv': 'video', 'wmv': 'video',
    # Image
    'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
    'webp': 'image', 'svg': 'image', 'bmp': 'image', 'tiff': 'image',
    # Document
    'pdf': 'document', 'doc': 'document', 'docx': 'document',
    'ppt': 'document', 'pptx': 'document', 'xls': 'document',
    'xlsx': 'document', 'txt': 'document', 'csv': 'document',
    'odt': 'document', 'odp': 'document', 'ods': 'document',
}

# ── Size limits ───────────────────────────────────────────────────────────────
MAX_SIZE   = getattr(settings, 'TUTORIAL_MAX_SIZE',       {
    'image': 10*1024*1024, 'document': 50*1024*1024,
    'video': 500*1024*1024, 'other': 50*1024*1024,
})
MAX_LABEL  = getattr(settings, 'TUTORIAL_MAX_SIZE_LABEL', {
    'image': '10 MB', 'document': '50 MB',
    'video': '500 MB', 'other': '50 MB',
})


def _detect_type(filename):
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    return EXT_TYPE.get(ext, 'other')


class TutorialViewSet(viewsets.ModelViewSet):
    queryset           = Tutorial.objects.all()
    serializer_class   = TutorialSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminRole()]
        return super().get_permissions()

    def perform_create(self, serializer):
        file      = self.request.FILES.get('file')
        file_type = self.request.data.get('file_type') or ''

        if not file:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'file': 'No file was provided.'})

        # Auto-detect file type from extension if not specified or is default
        auto_type = _detect_type(file.name)
        if not file_type or file_type == 'other':
            file_type = auto_type

        # Validate file size
        limit = MAX_SIZE.get(file_type, MAX_SIZE['other'])
        if file.size > limit:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'file': (
                    f'File is too large ({file.size / (1024*1024):.1f} MB). '
                    f'Maximum allowed for {file_type} files is {MAX_LABEL.get(file_type, "50 MB")}.'
                )
            })

        serializer.save(
            uploaded_by = self.request.user,
            file_type   = file_type,
            file_size   = file.size,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        return Response(self.get_serializer(instance).data)

    # ── POST /tutorials/{id}/view/ — increment view count ────────────────────
    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        return Response({'views': instance.views})

    # ── GET /tutorials/{id}/download/ — authenticated file download ───────────
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        instance  = self.get_object()
        if not instance.file:
            return Response({'error': 'No file attached.'}, status=404)

        file_path = instance.file.path
        if not os.path.exists(file_path):
            return Response({'error': 'File not found on disk.'}, status=404)

        mime, _  = mimetypes.guess_type(file_path)
        filename = os.path.basename(file_path)

        response = FileResponse(
            open(file_path, 'rb'),
            content_type=mime or 'application/octet-stream',
            as_attachment=True,
            filename=filename,
        )
        return response

    # ── GET /tutorials/{id}/stream/ — inline viewing (for iframe) ────────────
    @action(detail=True, methods=['get'])
    def stream(self, request, pk=None):
        instance  = self.get_object()
        if not instance.file:
            return Response({'error': 'No file attached.'}, status=404)

        file_path = instance.file.path
        if not os.path.exists(file_path):
            return Response({'error': 'File not found on disk.'}, status=404)

        mime, _ = mimetypes.guess_type(file_path)
        filename = os.path.basename(file_path)

        response = FileResponse(
            open(file_path, 'rb'),
            content_type=mime or 'application/octet-stream',
        )
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        # No X-Frame-Options needed since we removed the middleware
        return response

    # ── GET /tutorials/limits/ — return size limits so the UI can display them
    @action(detail=False, methods=['get'])
    def limits(self, request):
        return Response({
            k: {'bytes': v, 'label': MAX_LABEL[k]}
            for k, v in MAX_SIZE.items()
        })
