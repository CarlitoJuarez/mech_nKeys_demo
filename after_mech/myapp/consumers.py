import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
from asgiref.sync import async_to_sync
from .models import Chat

#   HELPERS

def _send(group_name: str, type_: str, **payload):
    channel_layer = get_channel_layer()
    # NOTE: Channels "type" must map to a consumer method name (letters, digits, underscores)
    async_to_sync(channel_layer.group_send)(group_name, {"type": type_, **payload})

def to_user(user_id: int, type_: str, **payload):
    _send(f"user_{user_id}", type_, **payload)

def to_chat(chat_id: int, type_: str, **payload):
    payload.setdefault("chat_id", chat_id)
    payload.setdefault("group", f"chat_{chat_id}")
    _send(f"chat_{chat_id}", type_, **payload)

def to_post(post_id: int, type_: str, **payload):
    payload.setdefault("post_id", post_id)
    _send(f"post_{post_id}", type_, **payload)

def to_global_feed(type_: str, **payload):
    _send("feed", type_, **payload)


class HubConsumer(AsyncJsonWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        # calling parent constructor
        super().__init__(*args, **kwargs)
        self.subscribed: set[str] = set()
        self.user_group: str | None = None

    async def connect(self):
        user = self.scope.get("user")
        if not user or getattr(user, "is_anonymous", True):
            await self.close(code=4401)  # unauthorized
            return

        self.user_group = f"user_{user.id}"
        self.subscribed = set()

        # If no channel layer is configured, fail fast with a server error close code.
        if not self.channel_layer:
            await self.close(code=1011)
            return

        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()
        await self.send_json({"type": "ws_ready"})

    async def disconnect(self, code):
        if self.channel_layer:
            # discard dynamic subscriptions
            for g in list(self.subscribed):
                await self.channel_layer.group_discard(g, self.channel_name)

            # discard per-user group
            if self.user_group:
                await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        action = content.get("action")
        group = content.get("group")

        if action == "subscribe" and group:
            if group not in self.subscribed:
                if not self.channel_layer:
                    await self.close(code=1011)
                    return
                await self.channel_layer.group_add(group, self.channel_name)
                self.subscribed.add(group)
            await self.send_json({"type": "sub_ok", "group": group})
            return

        if action == "unsubscribe" and group:
            if group in self.subscribed and self.channel_layer:
                await self.channel_layer.group_discard(group, self.channel_name)
                self.subscribed.discard(group)
            await self.send_json({"type": "unsub_ok", "group": group})
            return

        if action == "ping":
            await self.send_json({"type": "pong"})
            return

# consumers.py (inside HubConsumer)
    async def _forward(self, event, client_type: str):
        event = dict(event)
        event.pop("type", None)  # remove Channels routing key
        await self.send_json({"type": client_type, **event})

    async def chat_message(self, event):
        await self._forward(event, "chat_message")

    async def comment_created(self, event):
        await self._forward(event, "comment_created")

    async def post_created(self, event):
        await self._forward(event, "post_created")

    async def post_updated(self, event):
        await self._forward(event, "post_updated")

    async def messenger_last_row(self, event):
        await self._forward(event, "messenger_last_row")

    async def badge_update(self, event):
        await self._forward(event, "badge_update")

    async def mute_state(self, event):
        await self._forward(event, "mute_state")

    async def like_updated(self, event):
        await self._forward(event, "like_updated")


