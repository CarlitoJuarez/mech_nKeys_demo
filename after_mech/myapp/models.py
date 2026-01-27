from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

# Use django default user for now
from django.contrib.auth.models import User
# from django.contrib.auth import get_user_model

# User = get_user_model()

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    following = models.ManyToManyField('self', symmetrical=False, blank=True, related_name="followers")
    picture = models.ImageField(upload_to='pictures/', null=True, blank=True)
    verified = models.BooleanField(default=False)
    terms_and_conditions = models.BooleanField(default=False)
    pending_email = models.EmailField(default=None, blank=True, null=True)

    TIER_BASIC = "beginner"
    TIER_MEDIUM = "wanna_be"
    TIER_PREMIUM = "enthusiast"

    TIER_CHOICES = [
        (TIER_BASIC, "beginner"),
        (TIER_MEDIUM, "wanna_be"),
        (TIER_PREMIUM, "enthusiast"),
    ]

    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default=TIER_BASIC)

    def per_post_daily_limit(self) -> int:
        if self.tier == self.TIER_PREMIUM:
            return 25
        if self.tier == self.TIER_MEDIUM:
            return 10
        return 5  # basic

    def __str__(self):
        return f"{self.user} ({self.get_tier_display()})"


class ChatManager(models.Manager):
    @staticmethod
    def dm_key_for(u1: User, u2: User) -> str:
        if u1.pk == u2.pk:
            raise ValueError("Cannot DM yourself.")
        a, b = sorted((int(u1.pk), int(u2.pk)))
        return f"{a}:{b}"

    def get_or_create_dm(self, u1: User, u2: User, *, created_by: User | None = None):
        key = self.dm_key_for(u1, u2)
        chat, created = self.get_or_create(dm_key=key, defaults={
            "created_by": created_by or u1
        })
        # ensure both memberships exist
        ChatMembership.objects.get_or_create(chat=chat, user=u1)
        ChatMembership.objects.get_or_create(chat=chat, user=u2)
        return chat, created


class Chat(models.Model):
    # Unique, unordered pair key (e.g. "12:34")
    dm_key = models.CharField(max_length=64, unique=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_chats")
    created_at = models.DateTimeField(auto_now_add=True)

    # two users via through model (per-user state lives there)
    user = models.ManyToManyField(User, through='ChatMembership', related_name='chats')

    objects = ChatManager()

    @property
    def last_message(self):
        return self.messages.order_by('-date').first()

    def __str__(self):
        names = list(self.user.values_list('username', flat=True))
        return f"DM: {', '.join(sorted(names)) or self.dm_key or self.pk}"


class ChatMembership(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_memberships')

    # per-user state
    last_read_at = models.DateTimeField(null=True, blank=True, db_index=True)
    muted = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('chat', 'user')
        indexes = [models.Index(fields=['chat', 'user'])]

    def __str__(self):
        return f"{self.user} in chat {self.chat_id}"

    # (optional) guard to keep exactly two members in a DM app
    def clean(self):
        # allow updating existing rows; block adding a 3rd
        if self.chat_id and self.user_id and self.pk is None:
            if ChatMembership.objects.filter(chat_id=self.chat_id).count() >= 2:
                from django.core.exceptions import ValidationError
                raise ValidationError("A DM chat can only have two members.")


class Message(models.Model):
    chat = models.ForeignKey('Chat', on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.CharField(max_length=500)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}: {self.content[:30]}"

    def is_today(self):
        return self.date.date() == timezone.now().date()


class Post(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts")
    name = models.CharField(max_length=60, blank=False, default="None")
    brand = models.CharField(max_length=40, blank=False, default="None")
    color = models.CharField(max_length=30, blank=True)
    description = models.TextField(blank=True)
    for_sale = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], help_text="Required if for_sale=True")

    CATEGORY_CHOICES = [
        ("Keyboard", "Keyboard"),
        ("Keycaps", "Keycaps"),
        ("Switches", "Switches"),
        ("Other", "Other"),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="Other", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_posts', blank=True, default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} by {self.user}"

    def clean(self):
        # Enforce price presence when for_sale
        from django.core.exceptions import ValidationError
        if self.for_sale and (self.price is None):
            raise ValidationError({"price": "Price is required when the post is marked for sale."})


class Image(models.Model):
    post = models.ForeignKey('Post', on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]

    def __str__(self):
        return self.image.name or "unnamed image"


class Keyboard(models.Model):
    post = models.OneToOneField(Post, on_delete=models.CASCADE, related_name="keyboard")

    LAYOUT_CHOICES = [
        ("60%", "60%"),
        ("65%", "65%"),
        ("70%", "70%"),
        ("75%", "75%"),
        ("TKL", "TKL"),
        ("FULL-SIZE", "FULL-SIZE"),
        ("Split/Ergo", "Split/Ergo"),
        ("Macro", "Macro"),
        ("Other", "Other"),
    ]
    layout = models.CharField(max_length=10, choices=LAYOUT_CHOICES, default="Other")

    MOUNT_CHOICES = [
        ("Tray", "Tray"),
        ("Top", "Top"),
        ("Gasket", "Gasket"),
        ("Burger", "Burger"),
        ("Other", "Other"),
    ]
    mount = models.CharField(max_length=10, choices=MOUNT_CHOICES, default="Top")

    switches = models.CharField(max_length=20, blank=True);
    keycaps = models.CharField(max_length=20, blank=True);


    def __str__(self):
        return f"Keyboard for {self.post.name}"


class Keycaps(models.Model):
    post = models.OneToOneField(Post, on_delete=models.CASCADE, related_name="keycaps")
    MATERIAL_CHOICES = [
        ("PBT", "PBT"),
        ("ABS", "ABS"),
        ("POM", "POM"),
        ("Other", "Other"),
    ]
    material = models.CharField(max_length=10, choices=MATERIAL_CHOICES, default="PBT")

    def __str__(self):
        return f"Keycaps for {self.post.name}"


class Switches(models.Model):
    post = models.OneToOneField(Post, on_delete=models.CASCADE, related_name="switches")
    TYPE_CHOICES = [
        ("Linear", "Linear"),
        ("Tactile", "Tactile"),
        ("Clicky", "Clicky"),
        ("Silent", "Silent"),
        ("Other", "Other"),
    ]
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="linear")
    amount = models.IntegerField(default=0, blank=False)
    lubed = models.BooleanField(default=False)

    def __str__(self):
        return f"Switches for {self.post.name}"


class Comment(models.Model):
    post = models.ForeignKey('Post', on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.CharField(max_length=200)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.name}"

    def is_today(self):
        return self.date.date() == timezone.now().date()
