from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdminRole
from .models import Plot, BookingRequest
from .serializers import PlotSerializer, BookingRequestSerializer


def _notify_booking(recipients, title, message, url=None):
    """Fire a booking notification for each recipient (non-crashing)."""
    try:
        from notifications.push_utils import create_and_push
        for user in recipients:
            u = url or ('/superadmin/projects' if user.role == 'super_admin' else
                        '/admin/projects'      if user.role == 'admin'       else '/staff/projects')
            create_and_push(user, title, message, 'booking', url=u)
    except Exception:
        pass


# ── helpers ───────────────────────────────────────────────────────────────────
def _broadcast_plot(plot):
    """Push a plot-status update to all WebSocket clients watching this project."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'project_{plot.project_id}',
            {
                'type': 'plot_status_update',
                'data': {
                    'type':    'plot_update',
                    'plot_id': plot.id,
                    'plot_no': plot.plot_no,
                    'status':  plot.status,
                },
            },
        )
    except Exception:
        pass   # never crash a REST request due to WS broadcast failure


# ── Plot CRUD ─────────────────────────────────────────────────────────────────
class PlotViewSet(viewsets.ModelViewSet):
    queryset         = Plot.objects.select_related('project').all()
    serializer_class = PlotSerializer
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ['plot_no', 'facing', 'survey_no', 'status']
    ordering_fields  = ['plot_no', 'area_sqft', 'rate_per_sqft', 'total_cost', 'status']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        st         = self.request.query_params.get('status')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if st:
            qs = qs.filter(status=st)
        return qs

    def perform_update(self, serializer):
        """Broadcast status change after any admin update."""
        instance = serializer.save()
        _broadcast_plot(instance)


# ── Booking Request flow ──────────────────────────────────────────────────────
class BookingRequestViewSet(viewsets.ModelViewSet):
    serializer_class = BookingRequestSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ['get', 'post', 'head', 'options']   # no direct PUT/PATCH/DELETE

    def get_queryset(self):
        user = self.request.user
        qs = BookingRequest.objects.select_related(
            'plot', 'plot__project', 'requested_by', 'reviewed_by'
        )
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(plot__project_id=project_id)
        req_status = self.request.query_params.get('status')
        if req_status:
            qs = qs.filter(status=req_status)
        if not user.is_admin_role:
            qs = qs.filter(requested_by=user)
        return qs

    def create(self, request, *args, **kwargs):
        plot_id = request.data.get('plot')
        try:
            plot = Plot.objects.get(id=plot_id)
        except Plot.DoesNotExist:
            return Response({'error': 'Plot not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Cannot request a change on an already-sold plot
        if plot.status == 'sold':
            return Response(
                {'error': f'Plot {plot.plot_no} is already sold.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Block duplicate open requests
        if BookingRequest.objects.filter(plot=plot, status__in=['pending', 'on_hold']).exists():
            return Response(
                {'error': f'Plot {plot.plot_no} already has a pending request awaiting admin review.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Mark plot in_process immediately so others see it as being processed
        plot.status = 'in_process'
        plot.save(update_fields=['status', 'updated_at'])
        serializer.save(requested_by=request.user)
        _broadcast_plot(plot)

        # ── Notify all admins about the new booking request ───────────────────
        try:
            from accounts.models import User
            staff_name   = request.user.get_full_name() or request.user.username
            req_status   = request.data.get('requested_status', 'blocked')
            customer     = request.data.get('customer_name', '').strip()
            msg = f"{staff_name} requested to mark Plot {plot.plot_no} as {req_status.title()}"
            if customer:
                msg += f" for {customer}"
            admins = User.objects.filter(role__in=['admin', 'super_admin'], is_active=True)
            _notify_booking(admins, 'New Booking Request 📋', msg)
        except Exception:
            pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Admin actions ─────────────────────────────────────────────────────────
    def _admin_action(self, request, pk, new_request_status, new_plot_status):
        if not request.user.is_admin_role:
            return Response({'error': 'Admin permission required.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            req = BookingRequest.objects.select_related('plot').get(pk=pk)
        except BookingRequest.DoesNotExist:
            return Response({'error': 'Booking request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if req.status not in ('pending', 'on_hold'):
            return Response(
                {'error': f'Cannot action a request that is already {req.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req.status      = new_request_status
        req.admin_notes = request.data.get('admin_notes', '')
        req.reviewed_by = request.user
        req.save()

        if new_plot_status:
            req.plot.status = new_plot_status
            req.plot.save(update_fields=['status', 'updated_at'])
            _broadcast_plot(req.plot)

        # ── Notify the staff member who submitted the request ─────────────────
        try:
            staff      = req.requested_by
            plot_no    = req.plot.plot_no
            admin_notes = req.admin_notes.strip()
            if new_request_status == 'approved':
                title = '✅ Booking Request Approved'
                msg   = (f'Your request to {req.requested_status.title()} Plot {plot_no} '
                         f'has been approved.')
            elif new_request_status == 'rejected':
                title = '❌ Booking Request Rejected'
                msg   = f'Your request for Plot {plot_no} was rejected.'
                if admin_notes:
                    msg += f' Note: {admin_notes}'
            else:   # on_hold
                title = '⏸ Booking Request On Hold'
                msg   = f'Your request for Plot {plot_no} has been put on hold.'
                if admin_notes:
                    msg += f' Note: {admin_notes}'
            _notify_booking([staff], title, msg, url='/staff/projects')
        except Exception:
            pass

        return Response(BookingRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve → plot becomes the staff-requested status (blocked / booked / sold)."""
        try:
            req = BookingRequest.objects.get(pk=pk)
        except BookingRequest.DoesNotExist:
            return Response({'error': 'Booking request not found.'}, status=status.HTTP_404_NOT_FOUND)
        return self._admin_action(request, pk, 'approved', req.requested_status)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject → plot reverts to Available."""
        return self._admin_action(request, pk, 'rejected', 'available')

    @action(detail=True, methods=['post'])
    def hold(self, request, pk=None):
        """Hold → plot stays In Process, request flagged on_hold."""
        return self._admin_action(request, pk, 'on_hold', None)
