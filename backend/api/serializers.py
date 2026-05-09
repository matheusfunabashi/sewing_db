from __future__ import annotations

from rest_framework import serializers

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
    TicketMaterial,
)


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = "__all__"


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = "__all__"


class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = "__all__"


class StatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusHistory
        fields = "__all__"


class TicketMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)

    class Meta:
        model = TicketMaterial
        fields = ("id", "ticket", "material", "material_name", "quantity")


class TicketSerializer(serializers.ModelSerializer):
    assigned_employee_name = serializers.CharField(
        source="assigned_employee.full_name", read_only=True, default=None
    )
    history = StatusHistorySerializer(many=True, read_only=True)
    materials_used = TicketMaterialSerializer(many=True, read_only=True)
    has_garment_photo = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id", "order_item", "code", "fabric", "color", "design_notes",
            "status", "stage", "priority", "deadline",
            "assigned_employee", "assigned_employee_name",
            "started_at", "completed_at",
            "garment_photo", "garment_photo_at", "has_garment_photo",
            "created_at", "updated_at",
            "history", "materials_used",
        )
        read_only_fields = ("created_at", "updated_at", "garment_photo_at",
                           "has_garment_photo")

    def get_has_garment_photo(self, obj: Ticket) -> bool:
        return bool(obj.garment_photo)


class OrderItemSerializer(serializers.ModelSerializer):
    measurements = MeasurementSerializer(many=True, read_only=True)
    tickets = TicketSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id", "order", "garment_type", "description",
            "quantity", "unit_price", "created_at",
            "measurements", "tickets",
        )


class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = "__all__"


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    delivery = DeliverySerializer(read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "customer", "customer_name",
            "order_date", "due_date", "status", "priority",
            "total_amount", "notes",
            "created_at", "updated_at",
            "items", "delivery",
            "is_overdue",
        )
        read_only_fields = ("created_at", "updated_at")

    def get_is_overdue(self, obj: Order) -> bool:
        from datetime import date
        if obj.due_date is None:
            return False
        if obj.status in ("completed", "delivered", "cancelled"):
            return False
        return obj.due_date < date.today()
