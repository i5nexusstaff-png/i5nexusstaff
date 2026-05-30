import os
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ToolkitItem, _detect_type
from .serializers import ToolkitItemSerializer


class ToolkitViewSet(viewsets.ModelViewSet):
    serializer_class   = ToolkitItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ToolkitItem.objects.all()
        cat = self.request.query_params.get('category')
        ft  = self.request.query_params.get('file_type')
        q   = self.request.query_params.get('search')
        if cat: qs = qs.filter(category__iexact=cat)
        if ft:  qs = qs.filter(file_type=ft)
        if q:   qs = qs.filter(title__icontains=q)
        return qs

    # ── Only admin/superadmin can create, update, delete ──────────────────────
    def _check_admin(self):
        if self.request.user.role not in ('admin', 'super_admin'):
            return Response({'detail': 'Admin access required.'}, status=403)
        return None

    def create(self, request, *args, **kwargs):
        err = self._check_admin()
        if err: return err

        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=400)

        item = ToolkitItem(
            title       = request.data.get('title', file.name),
            description = request.data.get('description', ''),
            category    = request.data.get('category', ''),
            file        = file,
            file_name   = file.name,
            file_type   = _detect_type(file.name),
            file_size   = file.size,
            uploaded_by = request.user,
        )
        item.save()
        return Response(
            ToolkitItemSerializer(item, context={'request': request}).data,
            status=201,
        )

    def update(self, request, *args, **kwargs):
        err = self._check_admin()
        if err: return err
        kwargs['partial'] = True
        instance = self.get_object()

        # If new file uploaded, replace it
        new_file = request.FILES.get('file')
        if new_file:
            # Delete old file
            if instance.file:
                try: os.remove(instance.file.path)
                except Exception: pass
            instance.file      = new_file
            instance.file_name = new_file.name
            instance.file_type = _detect_type(new_file.name)
            instance.file_size = new_file.size

        instance.title       = request.data.get('title', instance.title)
        instance.description = request.data.get('description', instance.description)
        instance.category    = request.data.get('category', instance.category)
        instance.save()
        return Response(ToolkitItemSerializer(instance, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        err = self._check_admin()
        if err: return err
        instance = self.get_object()
        if instance.file:
            try: os.remove(instance.file.path)
            except Exception: pass
        instance.delete()
        return Response(status=204)
