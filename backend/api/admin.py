"""Django Unfold admin configuration for the Sewing Shop."""
from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

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


class MeasurementInline(TabularInline):
    model = Measurement
    extra = 0


class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    fields = ("garment_type", "description", "quantity", "unit_price")


class TicketInline(TabularInline):
    model = Ticket
    extra = 0
    fields = ("code", "status", "stage", "priority", "assigned_employee", "deadline")
    readonly_fields = ("code",)


class TicketMaterialInline(TabularInline):
    model = TicketMaterial
    extra = 0


class StatusHistoryInline(TabularInline):
    model = StatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ("from_stage", "to_stage", "changed_at", "changed_by", "note")
    fields = readonly_fields


class DeliveryInline(TabularInline):
    model = Delivery
    extra = 0


# ---------------------------------------------------------------------------
@admin.register(Customer)
class CustomerAdmin(ModelAdmin):
    list_display = ("full_name", "email", "phone", "created_at")
    search_fields = ("full_name", "email", "phone")
    list_filter = ("created_at",)


@admin.register(Employee)
class EmployeeAdmin(ModelAdmin):
    list_display = ("full_name", "role", "email", "is_active")
    list_filter = ("is_active", "role")
    search_fields = ("full_name", "email")


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = (
        "id", "customer", "status", "priority",
        "order_date", "due_date", "total_amount",
    )
    list_filter = ("status", "priority", "order_date", "due_date")
    search_fields = ("customer__full_name", "id", "notes")
    autocomplete_fields = ("customer",)
    inlines = [OrderItemInline, DeliveryInline]
    list_per_page = 25


@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    list_display = ("id", "order", "garment_type", "quantity", "unit_price")
    list_filter = ("garment_type",)
    search_fields = ("garment_type", "description")
    autocomplete_fields = ("order",)
    inlines = [MeasurementInline, TicketInline]


@admin.register(Ticket)
class TicketAdmin(ModelAdmin):
    list_display = (
        "code", "order_item", "status", "stage", "priority",
        "assigned_employee", "deadline",
    )
    list_filter = ("status", "stage", "priority", "deadline")
    search_fields = ("code", "fabric", "color", "design_notes")
    autocomplete_fields = ("order_item", "assigned_employee")
    inlines = [TicketMaterialInline, StatusHistoryInline]


@admin.register(Material)
class MaterialAdmin(ModelAdmin):
    list_display = ("name", "unit", "stock_qty", "unit_cost")
    search_fields = ("name",)


@admin.register(Delivery)
class DeliveryAdmin(ModelAdmin):
    list_display = ("order", "delivered", "delivery_date", "address")
    list_filter = ("delivered", "delivery_date")
    autocomplete_fields = ("order",)
