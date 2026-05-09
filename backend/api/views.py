"""DRF views for the Sewing Shop API."""
from __future__ import annotations

from datetime import date

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import (
    Customer,
    Delivery,
    Employee,
    Material,
    Measurement,
    Order,
    OrderItem,
    StatusHistory,
    Ticket,
)
from .serializers import (
    CustomerSerializer,
    DeliverySerializer,
    EmployeeSerializer,
    MaterialSerializer,
    MeasurementSerializer,
    OrderItemSerializer,
    OrderSerializer,
    StatusHistorySerializer,
    TicketSerializer,
)


# ---------------------------------------------------------------------------
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    search_fields = ["full_name", "email", "phone"]
    ordering_fields = ["full_name", "created_at"]

    @action(detail=True, methods=["get"])
    def orders(self, request, pk=None):
        customer = self.get_object()
        qs = Order.objects.filter(customer=customer).order_by("-order_date")
        return Response(OrderSerializer(qs, many=True).data)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    search_fields = ["full_name", "role", "email"]
    filterset_fields = ["is_active", "role"]


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    search_fields = ["name"]


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("customer").prefetch_related(
        "items", "items__measurements", "items__tickets", "delivery"
    )
    serializer_class = OrderSerializer
    filterset_fields = ["status", "priority", "customer"]
    search_fields = ["customer__full_name", "notes"]
    ordering_fields = ["order_date", "due_date", "created_at"]
    STAGE_ORDER = [
        "order_received",
        "design_confirmed",
        "cutting",
        "sewing",
        "finishing",
        "quality_check",
        "ready_for_delivery",
        "delivered",
    ]
    STAGE_INDEX = {stage: idx for idx, stage in enumerate(STAGE_ORDER)}

    def _sync_related_tickets(
        self,
        order: Order,
        *,
        stage: str,
        status_value: str,
        set_completed_at: bool = False,
    ) -> int:
        """
        Keep ticket workflow consistent with order workflow transitions.

        We update each ticket row individually (instead of bulk update) so the
        DB trigger on `ticket.stage` can append rows to `status_history`.
        """
        related = Ticket.objects.filter(
            order_item__order=order
        ).exclude(status="cancelled")
        touched = 0
        now = timezone.now()
        for ticket in related:
            changed_fields: list[str] = []
            if ticket.stage != stage:
                ticket.stage = stage
                changed_fields.append("stage")
            if ticket.status != status_value:
                ticket.status = status_value
                changed_fields.append("status")
            if set_completed_at and ticket.completed_at is None:
                ticket.completed_at = now
                changed_fields.append("completed_at")
            if changed_fields:
                ticket.save(update_fields=changed_fields + ["updated_at"])
                touched += 1
        return touched

    def _blocking_tickets_for_completion(self, order: Order):
        """
        Return tickets that are too early to allow order completion.

        Rule:
        - To complete an order, every non-cancelled ticket must be at least in
          `quality_check` stage (or beyond).
        """
        min_stage_idx = self.STAGE_INDEX["quality_check"]
        blocking = []
        related = Ticket.objects.filter(
            order_item__order=order
        ).exclude(status="cancelled")
        for ticket in related:
            if self.STAGE_INDEX.get(ticket.stage, -1) < min_stage_idx:
                blocking.append(ticket)
        return blocking

    def _blocking_tickets_for_delivery(self, order: Order):
        """
        Return tickets that are not ready for order delivery.

        Rules:
        - Every non-cancelled ticket must be in `ready_for_delivery` or
          `delivered`.
        - Every such ticket must already have a garment photo attached.
        """
        allowed = {"ready_for_delivery", "delivered"}
        related = Ticket.objects.filter(
            order_item__order=order
        ).exclude(status="cancelled")
        blocking = []
        for ticket in related:
            if ticket.stage not in allowed:
                blocking.append(ticket)
            elif not ticket.garment_photo:
                blocking.append(ticket)
        return blocking

    @action(detail=True, methods=["post"])
    def mark_in_production(self, request, pk=None):
        order = self.get_object()
        order.status = "in_production"
        order.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        order = self.get_object()
        blocking = self._blocking_tickets_for_completion(order)
        if blocking:
            return Response(
                {
                    "detail": (
                        "Order cannot be completed yet. Some tickets are still "
                        "before quality check."
                    ),
                    "blocking_tickets": [
                        {"id": t.id, "code": t.code, "stage": t.stage, "status": t.status}
                        for t in blocking[:10]
                    ],
                    "blocking_count": len(blocking),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = "completed"
        order.save(update_fields=["status", "updated_at"])
        synced = self._sync_related_tickets(
            order,
            stage="ready_for_delivery",
            status_value="completed",
            set_completed_at=True,
        )
        payload = self.get_serializer(order).data
        payload["tickets_synced"] = synced
        return Response(payload)

    @action(detail=True, methods=["post"])
    def deliver(self, request, pk=None):
        """Workflow: close the order and create/update the delivery row."""
        order = self.get_object()
        blocking = self._blocking_tickets_for_delivery(order)
        if blocking:
            missing_photo = [t for t in blocking
                             if t.stage in ("ready_for_delivery", "delivered")
                             and not t.garment_photo]
            if missing_photo and len(missing_photo) == len(blocking):
                detail = ("Order cannot be delivered yet. Some tickets are missing "
                          "a garment photo.")
            else:
                detail = ("Order cannot be delivered yet. Some tickets are not in "
                          "ready-for-delivery stage or are missing a photo.")
            return Response(
                {
                    "detail": detail,
                    "blocking_tickets": [
                        {
                            "id": t.id, "code": t.code, "stage": t.stage,
                            "status": t.status,
                            "missing_photo": not bool(t.garment_photo),
                        }
                        for t in blocking[:10]
                    ],
                    "blocking_count": len(blocking),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        delivery_date = request.data.get("delivery_date") or date.today().isoformat()
        address = request.data.get("address") or ""
        observations = request.data.get("observations") or ""

        delivery, _ = Delivery.objects.update_or_create(
            order=order,
            defaults={
                "delivered": True,
                "delivery_date": delivery_date,
                "address": address,
                "observations": observations,
            },
        )
        order.status = "delivered"
        order.save(update_fields=["status", "updated_at"])
        synced = self._sync_related_tickets(
            order,
            stage="delivered",
            status_value="completed",
            set_completed_at=True,
        )
        return Response({
            "order": self.get_serializer(order).data,
            "delivery": DeliverySerializer(delivery).data,
            "tickets_synced": synced,
        })


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related("order").prefetch_related(
        "measurements", "tickets"
    )
    serializer_class = OrderItemSerializer
    filterset_fields = ["order", "garment_type"]


class MeasurementViewSet(viewsets.ModelViewSet):
    queryset = Measurement.objects.all()
    serializer_class = MeasurementSerializer
    filterset_fields = ["order_item"]


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related(
        "order_item", "order_item__order", "assigned_employee"
    ).prefetch_related("history", "materials_used", "materials_used__material")
    serializer_class = TicketSerializer
    filterset_fields = ["status", "stage", "priority", "assigned_employee"]
    search_fields = ["code", "fabric", "color", "design_notes"]
    ordering_fields = ["created_at", "deadline"]

    @action(detail=True, methods=["post"])
    def advance_stage(self, request, pk=None):
        """Workflow: move the ticket to the next production stage.

        When advancing from `ready_for_delivery` to `delivered`, a garment
        photo is required. The caller may attach it in the same request via
        the `garment_photo` field (base64-encoded JPEG).
        """
        order = ["order_received", "design_confirmed", "cutting", "sewing",
                 "finishing", "quality_check", "ready_for_delivery", "delivered"]
        ticket = self.get_object()
        try:
            idx = order.index(ticket.stage)
        except ValueError:
            idx = -1
        next_stage = order[min(idx + 1, len(order) - 1)]

        photo = request.data.get("garment_photo") if hasattr(request, "data") else None
        if photo:
            ticket.garment_photo = photo
            ticket.garment_photo_at = timezone.now()

        if next_stage == "delivered" and not ticket.garment_photo:
            return Response(
                {"detail": "A garment photo is required before delivery."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.stage = next_stage
        if next_stage == "delivered":
            ticket.status = "completed"
            ticket.completed_at = timezone.now()
        elif ticket.started_at is None and next_stage != "order_received":
            ticket.started_at = timezone.now()
        ticket.save()
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def set_stage(self, request, pk=None):
        ticket = self.get_object()
        stage = request.data.get("stage")
        if stage not in dict(Ticket._meta.get_field("stage").choices):
            return Response(
                {"detail": "Invalid stage"}, status=status.HTTP_400_BAD_REQUEST
            )

        photo = request.data.get("garment_photo")
        if photo:
            ticket.garment_photo = photo
            ticket.garment_photo_at = timezone.now()

        if stage == "delivered" and not ticket.garment_photo:
            return Response(
                {"detail": "A garment photo is required before delivery."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.stage = stage
        ticket.save()
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def upload_photo(self, request, pk=None):
        """Attach (or replace) the garment photo for this ticket."""
        ticket = self.get_object()
        photo = request.data.get("garment_photo")
        if not photo:
            return Response(
                {"detail": "garment_photo is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ticket.garment_photo = photo
        ticket.garment_photo_at = timezone.now()
        ticket.save(update_fields=["garment_photo", "garment_photo_at", "updated_at"])
        return Response(self.get_serializer(ticket).data)


class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.select_related("order")
    serializer_class = DeliverySerializer
    filterset_fields = ["delivered", "order"]


class StatusHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StatusHistory.objects.select_related("ticket")
    serializer_class = StatusHistorySerializer
    filterset_fields = ["ticket"]


# ---------------------------------------------------------------------------
@api_view(["GET"])
def dashboard(_request):
    """Aggregated metrics for the mobile dashboard / reporting workflow."""
    today = date.today()
    orders = Order.objects.all()
    pending = orders.filter(status="pending").count()
    in_production = orders.filter(status="in_production").count()
    completed = orders.filter(status="completed").count()
    delivered = orders.filter(status="delivered").count()
    overdue = orders.filter(
        due_date__lt=today
    ).exclude(status__in=["completed", "delivered", "cancelled"]).count()

    ticket_counts = list(
        Ticket.objects.values("stage").annotate(total=Count("id")).order_by("stage")
    )

    customers = Customer.objects.count()
    employees = Employee.objects.filter(is_active=True).count()

    return Response({
        "orders": {
            "pending": pending,
            "in_production": in_production,
            "completed": completed,
            "delivered": delivered,
            "overdue": overdue,
            "total": orders.count(),
        },
        "tickets_by_stage": ticket_counts,
        "customers": customers,
        "active_employees": employees,
    })
