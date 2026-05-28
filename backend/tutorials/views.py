from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Tutorial
from .serializers import TutorialSerializer
from accounts.permissions import IsAdminRole


class TutorialViewSet(viewsets.ModelViewSet):
    queryset           = Tutorial.objects.all()
    serializer_class   = TutorialSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminRole()]
        return super().get_permissions()

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)

        # ── Notify all staff about the new tutorial ───────────────────────────
        try:
            from accounts.models import User
            from notifications.push_utils import create_and_push
            desc  = (instance.description or '').strip()
            msg   = desc[:120] if desc else 'A new training video has been uploaded.'
            added = self.request.user.get_full_name() or self.request.user.username
            title = f'🎬 New Tutorial: {instance.title}'
            for user in User.objects.filter(is_active=True).exclude(id=self.request.user.id):
                url = ('/superadmin/tutorials' if user.role == 'super_admin' else
                       '/admin/tutorials'      if user.role == 'admin'       else '/staff/tutorials')
                create_and_push(user, title, msg, 'tutorial', url=url)
        except Exception:
            pass

    # ── POST /tutorials/{id}/view/ — increment view count ────────────────────
    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        return Response({'views': instance.views})
