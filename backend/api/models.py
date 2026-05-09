"""
Django models for the Sewing Shop Management System.

The actual table DDL lives in /supabase/01_schema.sql so the relational
schema can be created directly inside the Supabase SQL editor. To avoid
Django trying to recreate them, every model below uses:

    class Meta:
        managed = False
        db_table = "..."

Django still uses these models for the ORM, the admin interface (Django
Unfold), and the REST API (Django REST Framework).
"""
from __future__ import annotations

from django.db import models


# ---------------------------------------------------------------------------
# Choices that mirror the Postgres ENUM types in 01_schema.sql
# ---------------------------------------------------------------------------
class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PRODUCTION = "in_production", "In production"
    COMPLETED = "completed", "Completed"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"


class TicketStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    ON_HOLD = "on_hold", "On hold"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class PriorityLevel(models.TextChoices):
    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class ProductionStage(models.TextChoices):
    ORDER_RECEIVED = "order_received", "Order received"
    DESIGN_CONFIRMED = "design_confirmed", "Design confirmed"
    CUTTING = "cutting", "Cutting"
    SEWING = "sewing", "Sewing"
    FINISHING = "finishing", "Finishing"
    QUALITY_CHECK = "quality_check", "Quality check"
    READY_FOR_DELIVERY = "ready_for_delivery", "Ready for delivery"
    DELIVERED = "delivered", "Delivered"


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------
class Customer(models.Model):
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=40, blank=True, null=True)
    email = models.EmailField(max_length=150, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    preferences = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "customer"
        ordering = ["full_name"]

    def __str__(self) -> str:
        return self.full_name


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------
class Employee(models.Model):
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=80, blank=True, null=True)
    phone = models.CharField(max_length=40, blank=True, null=True)
    email = models.EmailField(max_length=150, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "employee"
        ordering = ["full_name"]

    def __str__(self) -> str:
        return self.full_name


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------
class Order(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="orders",
        db_column="customer_id",
    )
    order_date = models.DateField()
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING
    )
    priority = models.CharField(
        max_length=10, choices=PriorityLevel.choices, default=PriorityLevel.NORMAL
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "order"            # quoted in SQL because `order` is a keyword
        ordering = ["-order_date", "-id"]

    def __str__(self) -> str:
        return f"Order #{self.id} - {self.customer.full_name}"

    @property
    def computed_total(self) -> float:
        return float(
            sum((item.quantity * float(item.unit_price)) for item in self.items.all())
        )


# ---------------------------------------------------------------------------
# OrderItem (a.k.a. Garment)
# ---------------------------------------------------------------------------
class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        db_column="order_id",
    )
    garment_type = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "order_item"
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.garment_type} (x{self.quantity})"


# ---------------------------------------------------------------------------
# Measurement
# ---------------------------------------------------------------------------
class Measurement(models.Model):
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="measurements",
        db_column="order_item_id",
    )
    label = models.CharField(max_length=80)
    value_cm = models.DecimalField(max_digits=7, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "measurement"
        ordering = ["label"]

    def __str__(self) -> str:
        return f"{self.label}: {self.value_cm} cm"


# ---------------------------------------------------------------------------
# Material catalog
# ---------------------------------------------------------------------------
class Material(models.Model):
    name = models.CharField(max_length=120)
    unit = models.CharField(max_length=20, default="unit")
    stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        managed = False
        db_table = "material"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


# ---------------------------------------------------------------------------
# Ticket / Work order
# ---------------------------------------------------------------------------
class Ticket(models.Model):
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="tickets",
        db_column="order_item_id",
    )
    assigned_employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="tickets",
        db_column="assigned_employee",
        blank=True,
        null=True,
    )
    code = models.CharField(max_length=40, unique=True)
    fabric = models.CharField(max_length=100, blank=True, null=True)
    color = models.CharField(max_length=60, blank=True, null=True)
    design_notes = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN
    )
    stage = models.CharField(
        max_length=30,
        choices=ProductionStage.choices,
        default=ProductionStage.ORDER_RECEIVED,
    )
    priority = models.CharField(
        max_length=10, choices=PriorityLevel.choices, default=PriorityLevel.NORMAL
    )
    deadline = models.DateField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    garment_photo = models.TextField(blank=True, null=True)
    garment_photo_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "ticket"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.code


class TicketMaterial(models.Model):
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="materials_used",
        db_column="ticket_id",
    )
    material = models.ForeignKey(
        Material, on_delete=models.PROTECT, related_name="usage",
        db_column="material_id",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)

    class Meta:
        managed = False
        db_table = "ticket_material"
        unique_together = (("ticket", "material"),)


class StatusHistory(models.Model):
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="history",
        db_column="ticket_id",
    )
    from_stage = models.CharField(
        max_length=30, choices=ProductionStage.choices, blank=True, null=True
    )
    to_stage = models.CharField(max_length=30, choices=ProductionStage.choices)
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.CharField(max_length=150, blank=True, null=True)
    note = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "status_history"
        ordering = ["-changed_at"]


# ---------------------------------------------------------------------------
# Delivery
# ---------------------------------------------------------------------------
class Delivery(models.Model):
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="delivery",
        db_column="order_id",
    )
    delivered = models.BooleanField(default=False)
    delivery_date = models.DateField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    observations = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "delivery"
        verbose_name_plural = "Deliveries"

    def __str__(self) -> str:
        return f"Delivery for order #{self.order_id}"
