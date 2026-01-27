import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.getenv("DJANGO_SETTINGS_MODULE", "after_mech.settings.dev")
)

# initialize Django BEFORE importing routing
django.setup()

from myapp import routing  # import AFTER django.setup()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
        "websocket": AuthMiddlewareStack(
            URLRouter(
                routing.websocket_urlpatterns
            )
        ),
})
