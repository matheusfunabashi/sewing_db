from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"customers",     views.CustomerViewSet)
router.register(r"employees",     views.EmployeeViewSet)
router.register(r"orders",        views.OrderViewSet)
router.register(r"order-items",   views.OrderItemViewSet)
router.register(r"measurements",  views.MeasurementViewSet)
router.register(r"tickets",       views.TicketViewSet)
router.register(r"materials",     views.MaterialViewSet)
router.register(r"deliveries",    views.DeliveryViewSet)
router.register(r"status-history", views.StatusHistoryViewSet)


urlpatterns = [
    path("dashboard/", views.dashboard, name="dashboard"),
    path("", include(router.urls)),
]
