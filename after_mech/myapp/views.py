# from __future__ import annotations

from django import forms
from decimal import Decimal, InvalidOperation
from django.views.decorators.http import require_GET
import json
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.urls import reverse
from django.shortcuts import render, get_object_or_404, redirect
from django_ratelimit.decorators import ratelimit
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth import views as auth_views
from django.contrib.auth.forms import SetPasswordForm, PasswordChangeForm, PasswordResetForm, UserCreationForm
from django.views.decorators.csrf import requires_csrf_token

# GETTING USER
from django.contrib.auth.models import User
# We use django default user model for now
# from django.contrib.auth import get_user_model
# User = get_user_model()

from django.core.paginator import Paginator
from django.template.loader import render_to_string
from django.db import IntegrityError
from django.db.models import Q, Prefetch, OuterRef, Subquery, Max
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
# from django.utils.timezone import localtime

from . models import Image, Comment, ChatMembership, Profile, ChatManager, Chat, Message, Post, Keyboard, Keycaps, Switches

from . consumers import (
    to_user, to_chat,
    to_post, to_global_feed,
)

# THIS ALL FOR CORRECT USER INPUT SECURITY AND EXPLICIT CONTENT HANDLING
import io
import os
import re
import uuid
import httpx
from typing import Optional
import datetime
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.utils.html import strip_tags
from django.utils.text import slugify
from django.db import transaction

from PIL import Image as PILImage, ImageOps, UnidentifiedImageError

from google.cloud import vision
from google.api_core.exceptions import GoogleAPICallError
from google.auth.exceptions import DefaultCredentialsError
import google.oauth2.service_account as service_account

                                # --- AUTHENTICATION --- START
from myapp.moderation import text_is_clean
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


from functools import wraps


# app/emails.py
from django.core.mail import EmailMultiAlternatives
from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.contrib import messages
from django.utils.encoding import force_str
from django.views.decorators.http import require_http_methods
from django.core.cache import cache
from django.core.validators import validate_email

# HELPER FOR RETURNING JSON

def require_login_json(view):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            if wants_json(request):
                return JsonResponse({"ok": False, "error": "not_authenticated"},status=401)
            return HttpResponseRedirect(reverse('myapp:index'))
        return view(request, *args, **kwargs)
    return wrapper


def ratelimit_json(*, key, rate, method=("POST",), block=False):
    def decorator(view):
        # Apply django-ratelimit first
        limited_view = ratelimit(key=key, rate=rate, method=method, block=block)(view)

        @wraps(view)
        def wrapped(request, *args, **kwargs):
            # If block=True and limited, django-ratelimit may already have returned a response.
            resp = limited_view(request, *args, **kwargs)
            if getattr(request, "limited", False):
                if wants_json(request):
                    return JsonResponse({"ok": False, "error": "Too many requests. Try again later."}, status=429)
                return HttpResponseBadRequest("Too many requests. Try again later.")
            return resp

        return wrapped
    return decorator


def wants_json(request):
    return (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or "application/json" in request.headers.get("Accept", "")
    )


# whoami()
@api_view(["GET"])
@permission_classes([AllowAny])  # anyone can call; response reflects session
def session(request):
    if not request.user or not request.user.is_authenticated:
        return Response({"authenticated": False, "user": None}, status=401)
    u = request.user
    return Response({"authenticated": True, "user": {"id": u.id, "email": u.email, "username": u.username}})


@requires_csrf_token
def csrf_failure(request, reason=""):
    if wants_json(request):
        return JsonResponse({"ok": False, "errors": [f"CSRF failed: {reason}"]}, status=403)
    return render(request, "403_csrf.html", {"reason": reason}, status=403)


REAUTH_MAX_AGE_SECONDS = 600  # 10 minutes
SESSION_KEY = "reauth_at"

def mark_reauthed(request):
    request.session[SESSION_KEY] = int(timezone.now().timestamp())
    request.session.modified = True

def is_recently_reauthed(request) -> bool:
    ts = request.session.get(SESSION_KEY)
    if not ts:
        return False
    age = int(timezone.now().timestamp()) - int(ts)
    return age <= REAUTH_MAX_AGE_SECONDS


# only for settings del_acc / change_passw
def require_recent_password(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not is_recently_reauthed(request):
            return JsonResponse(
                {"ok": False, "code": "reauth_required", "error": "Password confirmation required."},
                status=403,)
        return view_func(request, *args, **kwargs)
    return _wrapped


@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/10m", block=False)
def reauth(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    password = data.get("password", "")
    if not password or not request.user.check_password(password):
        return JsonResponse({"ok": False, "error": "Incorrect password."}, status=400)

    mark_reauthed(request)
    return JsonResponse({"ok": True})

                                # --- AUTHENTICATION --- END



                                # --- POST VALIDATION --- START

PER_POST_DAILY_CAP = 200
PER_CHAT_DAILY_CAP = 200

try: # MIME sniffing --> predict input format
    import magic # python-magic
    HAS_MAGIC = True
except Exception:
    HAS_MAGIC = False


try: # For markup
    import bleach
    HAS_BLEACH = True
except Exception:
    HAS_BLEACH = False

# --- Security/validation constants ---
ALLOWED_IMAGE_CTYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGES = 9
MAX_IMAGE_BYTES = 10 * 1024 * 1024 # 10MB per image
MAX_TOTAL_IMAGE_BYTES = 80 * 1024 * 1024 # 80MB cumulative per request (belt-and-suspenders)
MAX_DIMENSION = 4096 # clamp width/height
MAX_PIXELS = 40_000_000 # 40 MP to avoid decompression bombs


PRICE_MIN, PRICE_MAX = Decimal("10"), Decimal("10000")
SWITCH_MIN, SWITCH_MAX = 10, 999

# --- Helpers: Muted ---
def _ensure_membership(chat, user) -> ChatMembership:
    try:
        return ChatMembership.objects.get(chat=chat, user=user)
    except ChatMembership.DoesNotExist:
        raise Http404("Not a member of this chat")


# --- Helpers: text safety ---
def _clean_text(text: str) -> str:
    text = (text or "").strip()
    if HAS_BLEACH: # against XSS --> GET RID OF HTML --> make plain text
        return bleach.clean(text, tags=[], attributes={}, strip=True)
    return strip_tags(text)

# --- Helpers: image safety ---

_vision_client = None
def _get_vision_client():
    """Lazy, cached Vision client with explicit credentials when provided."""
    global _vision_client
    if _vision_client is not None:
        return _vision_client

    strict = getattr(settings, "VISION_MODERATION_STRICT", True)
    keyfile = getattr(settings, "VISION_CREDENTIALS_FILE", None)

    try:
        if keyfile:
            if not os.path.isfile(keyfile):
                raise FileNotFoundError(keyfile)
            creds = service_account.Credentials.from_service_account_file(keyfile)
            _vision_client = vision.ImageAnnotatorClient(credentials=creds)
        else:
            # Use ADC if available (GOOGLE_APPLICATION_CREDENTIALS or GCP runtime)
            _vision_client = vision.ImageAnnotatorClient()
    except (DefaultCredentialsError, FileNotFoundError) as e:
        _vision_client = None
        if strict:
            # surface as a form error, not a 500
            raise ValidationError("Image moderation is not configured on the server.")
        return None

    return _vision_client

def _image_is_explicit(pil_image) -> bool:
    if getattr(settings, "VISION_MODERATION_ENABLED", True) == False:
        return False
    # If moderation is disabled entirely
    strict = getattr(settings, "VISION_MODERATION_STRICT", True)
    client = _get_vision_client()  # may raise ValidationError if strict + no creds
    if client is None:
        # non-strict path: skip check
        return False

    buf = io.BytesIO()
    pil_image.save(buf, format="JPEG", quality=85)
    image_bytes = buf.getvalue()

    import logging
    logger = logging.getLogger(__name__)

    try:
        # add a small timeout so requests dont hang your view
        resp = client.safe_search_detection(
            image=vision.Image(content=image_bytes), timeout=4.0
        )
        s = resp.safe_search_annotation
    except (GoogleAPICallError, DefaultCredentialsError, Exception) as e:
        msg = str(e)
        if "BILLING_DISABLED" in msg and strict:
            logger.error("Vision billing disabled for project. %s", msg)
        if strict:
            raise ValidationError("Image moderation service unavailable. Try again later.")
        return False

    conf = getattr(settings, "SAFESEARCH_BLOCK", {}) or {}
    adult_min    = conf.get("adult_min", 4)     # LIKELY
    racy_min     = conf.get("racy_min", 4)      # LIKELY
    violence_min = conf.get("violence_min", 5)  # VERY_LIKELY

    # Likelihood enum: UNKNOWN=0, VERY_UNLIKELY=1, UNLIKELY=2, POSSIBLE=3, LIKELY=4, VERY_LIKELY=5
    return (s.adult >= adult_min) or (s.racy >= racy_min) or (s.violence >= violence_min)

def _sniff_content_type(blob: bytes) -> str | None: # sniffing as defense-in-depth step
    if HAS_MAGIC:
        try:
            return magic.from_buffer(blob, mime=True)
        except Exception:
            return None
    return None


def _normalize_image(file_obj) -> tuple[str, ContentFile]:
    """Validate, decode, sanitize, and re-encode an uploaded image.
    Returns (safe_filename, content_file) ready to be saved to a Django FileField.
    Raises ValidationError on failure.
    """
    # Size checks (framework-level guard exists too via DATA_UPLOAD_MAX_MEMORY_SIZE)
    size = getattr(file_obj, "size", None) or 0 # we could also just use file_obj.size but we want to make sure its the correct object we get passed to not get AttributeError
    if size <= 0 or size > MAX_IMAGE_BYTES:
        raise ValidationError("Error: File to large, each image must be lower than 10MB.")


    data = file_obj.read() # READ RAW BITES
    file_obj.seek(0) # RESET TO FIRST BYTE


    # MIME sniffing (do not trust user-provided content_type)
    sniffed = _sniff_content_type(data[:4096])
    if sniffed and sniffed not in ALLOWED_IMAGE_CTYPES:
        raise ValidationError("Unsupported image type.")


    # Pillow open + integrity checks
    try:
        with PILImage.open(io.BytesIO(data)) as probe:
            probe.verify() # quick integrity verification, without fully decoding pixel data, check for internal structure
    except (UnidentifiedImageError, Exception):
        raise ValidationError("Invalid or corrupted image.")


    # Re-open for actual processing (verify() leaves file in an unusable state)
    with PILImage.open(io.BytesIO(data)) as img:
        # Basic decompression bomb guard or DoS
        img.load()

        img = ImageOps.exif_transpose(img)

        w, h = img.size
        if w <= 0 or h <= 0 or (w * h) > MAX_PIXELS:
            raise ValidationError("Image dimensions are not allowed.")


        # IF ALPHA LEVEL i.e. transparency
        has_alpha = (img.mode in {"RGBA", "LA"}) or ("transparency" in img.info) # im.mode describes how pixels are stored
        if has_alpha:
            img = img.convert("RGBA")
            target_format = "PNG" # preserve transparency safely as JPEG cannot save transparency
            ext = "png"
        else:
            # Convert to 8-bit RGB (drop ICC/EXIF via re-encode)
            img = img.convert("RGB")
            target_format = "JPEG"
            ext = "jpg"


        # Clamp dimensions to reduce payload size and speed up moderation and storage
        if max(w, h) > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION)) # resized in-place, keeping aspect ratio, so neither width nor height exceeds MAX_DIMENSION


        # Make a moderation copy that is always JPEG-safe
        img_modded = img
        if img_modded.mode in ("RGBA", "LA") or (img_modded.mode == "P" and "transparency" in img_modded.info):
            bg = PILImage.new("RGB", img_modded.size, (255, 255, 255))
            img_modded = img_modded.convert("RGBA")
            bg.paste(img_modded, mask=img_modded.split()[-1])
            img_modded = bg
        elif img_modded.mode != "RGB":
            img_modded = img_modded.convert("RGB")

        if _image_is_explicit(img_modded):
            raise ValidationError("Image flagged as explicit or unsafe.")


        # Re-encode (strip EXIF/metadata)
        out = io.BytesIO()
        if target_format == "JPEG":
            img.save(out, format=target_format, quality=85, optimize=True, progressive=True)
        elif target_format == "PNG":
            img.save(out, format=target_format, optimize=True)
        else:  # WEBP branch kept for completeness
            img.save(out, format=target_format, quality=85)
        out.seek(0)
        content = out.getvalue()

    if len(content) > MAX_IMAGE_BYTES:
        raise ValidationError("Processed image exceeds size limit.")

    # Build safe filename (slug + uuid + correct extension)
    base = slugify(os.path.splitext(getattr(file_obj, "name", "image"))[0]) or "image"
    safe_name = f"{base}-{uuid.uuid4().hex[:12]}.{ext}"


    return safe_name, ContentFile(content)



                                # --- POST VALIDATION --- END


# helper for correct image url
def absolute_url(request, image_field):
    if image_field and getattr(image_field, 'url', None):
        return request.build_absolute_uri(image_field.url)
    return None


@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
@transaction.atomic
def create_post(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

# Double-check content length to avoid huge multi-part bodies (defense in depth)
    content_length = int(request.META.get("CONTENT_LENGTH", 0))
    max_body = getattr(settings, "MAX_REQUEST_BODY_BYTES", 104_857_600) # 100MB
    if content_length and content_length > max_body:
        return JsonResponse({"ok": False, "errors": {"__all__": "Request too large."}}, status=413)

    user = request.user
    errors = {}

# --- Read & sanitize text fields ---
    def g(name, default=None):
        return _clean_text(request.POST.get(name, default))

    description = g("create_description")
    name = g("create_name")
    brand = g("create_brand")
    color = g("create_color")
    category = g("create_category")

    for_sale = request.POST.get("create_for_sale") in ("true", "True", "1", "on")
    price = None

# Category-specific fields
    mount = g("create_m_style")
    layout = g("create_layout")
    keycaps = g("create_keycaps")
    switches = g("create_switches")

    cap_material = g("create_cap_material") or "Other"
    switch_type = g("create_switch_type") or "Other"
    try:
        switch_amount = int(request.POST.get("create_switch_amount") or 0)
    except ValueError:
        switch_amount = 0
    switch_lubed = request.POST.get("create_switches_lubed") in ("true", "True", "1", "on")

# --- Text moderation ---
    if name and not text_is_clean(name, True):
        errors.setdefault("name", "Please remove explicit language.")
    if brand and not text_is_clean(brand, True):
        errors.setdefault("brand", "Please remove explicit language.")
    if color and not text_is_clean(color, True):
        errors.setdefault("color", "Please remove explicit language.")
    if switches and not text_is_clean(switches, True):
        errors.setdefault("switched", "Please remove explicit language.")
    if keycaps and not text_is_clean(keycaps, True):
        errors.setdefault("keycaps", "Please remove explicit language.")
    if mount and not text_is_clean(mount, True):
        errors.setdefault("mounting", "Please remove explicit language.")
    if mount and not text_is_clean(mount, True):
        errors.setdefault("mounting", "Please remove explicit language.")
    if description and not text_is_clean(description, True):
        errors.setdefault("description", "Please remove explicit language.")

# Required fields
    if not name:
        errors["name"] = errors.get("name") or "Name is required."
    if not brand:
        errors["brand"] = errors.get("brand") or "Brand is required."
    if not category:
        errors["category"] = "Category is required."


# Category-specific validation
    if category == "Keyboard" and not layout:
        errors["layout"] = "Layout is required for keyboards."
    if category == "Keycaps" and (cap_material == "None" or not cap_material):
        errors["cap_material"] = "Material is required for keycaps."
    if category == "Switches":
        if switch_type == "None" or not switch_type:
            errors["switch_type"] = "Switch type is required."
        if not (SWITCH_MIN <= switch_amount <= SWITCH_MAX):
            errors["switch_amount"] = f"Amount must be between {SWITCH_MIN} and {SWITCH_MAX}."

# Price
    if for_sale:
        raw_price = (request.POST.get("create_price") or "").replace(",", ".")
        try:
            price = Decimal(raw_price)
            if price < PRICE_MIN or price > PRICE_MAX:
                errors["price"] = f"Price must be between {PRICE_MIN} and {PRICE_MAX}."
        except (InvalidOperation, TypeError):
            errors["price"] = "Price must be a valid number."

# --- Images ---
    images = request.FILES.getlist("files") or request.FILES.getlist("files[]")
    if not images:
        errors["images"] = "At least one image is required."
    elif len(images) > MAX_IMAGES:
        errors["images"] = f"Please upload at most {MAX_IMAGES} images."

# Cumulative size guard
    total_incoming = sum(getattr(f, "size", 0) for f in images)
    if total_incoming > MAX_TOTAL_IMAGE_BYTES:
        errors["images_total"] = "Total size of images is too large."

# Early return on errors
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

# Validate & normalize each image before creating DB rows
    normalized_images = []
    for i, f in enumerate(images):
        try:
            safe_name, content_file = _normalize_image(f)
            normalized_images.append((safe_name, content_file))
        except ValidationError as e:
            message = e.message if hasattr(e, 'message') else (
                e.messages[0] if hasattr(e, 'messages') else str(e)
            )
            errors[f"image_{i}"] = message

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

# --- Create models atomically ---
    new_post = Post.objects.create(
        user=user,
        name=name,
        brand=brand,
        color=color,
        description=description,
        for_sale=for_sale,
        price=price,
        category=category,
    )

# Storage path: posts/<user_id>/<YYYY>/<MM>/<slug>/
    today = datetime.date.today()
    post_slug = slugify(name)[:50] or f"post-{new_post.pk}"
    base_dir = os.path.join("posts", str(user.id), f"{today.year}", f"{today.month:02d}", post_slug)

    for safe_name, content_file in normalized_images:
# Join path and ensure forward slashes for Django storage
        relative_path = os.path.join(base_dir, safe_name).replace(os.sep, "/")
# ImageField .save(name, ContentFile)
        img_obj = Image(post=new_post)
        img_obj.image.save(relative_path, content_file, save=True)


    if category == "Keyboard":
        Keyboard.objects.create(post=new_post, layout=layout, mount=mount, switches=switches, keycaps=keycaps)
    elif category == "Keycaps":
        Keycaps.objects.create(post=new_post, material=cap_material)
    elif category == "Switches":
        Switches.objects.create(post=new_post, type=switch_type, lubed=switch_lubed, amount=switch_amount)

# Render HTML (template should auto-escape; avoid marking unsafe strings safe)
    html = render_to_string("myapp/partials/post_body.html", {"post": new_post}, request=request)

    # NOTE: JUST IN CASE WE WANT IT
    # Broadcast to follower feeds
    # channel_layer = get_channel_layer()
    # follower_ids = list(Profile.objects.get(user=user).following.values_list("user__id", flat=True))
    # follower_ids.append(user.id)


    # payload = {"type": "new.post", "post_id": new_post.id, "created_at": new_post.created_at.isoformat()}
    # for uid in follower_ids:
    #     to_user(uid, "post_created", post_id=new_post.id, author_id=user.id, created_at=new_post.created_at.isoformat())

    return JsonResponse({
        "ok": True,
        "id": new_post.id,
        "created_at": new_post.created_at.isoformat(),
        "html": html,
    })

@require_login_json
def post_partial(request, post_id):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    try:
        post = Post.objects.select_related("keyboard","keycaps","switches").prefetch_related("images").get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)
    # (optionally set a rendering_id if your template expects it)
    post.rendering_id = 0
    html = render_to_string("myapp/partials/post_body.html", {"post": post}, request=request)
    return JsonResponse({"ok": True, "html": html})



# -------------------- Forms --------------------


class LoginForm(forms.Form):
    username = forms.CharField(
        widget=forms.TextInput(attrs={
            'autocomplete': 'username',
            'placeholder': 'username',
        }),
        label='Username',
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'autocomplete': 'current-password',
            'placeholder': 'password',
        }),
        label='Password',
    )


class RegisterForm(UserCreationForm):
    username = forms.CharField(
        max_length = 12,
        widget=forms.TextInput(attrs={
                'autocomplete': 'username',
                'placeholder': 'Enter a username',
            }),
        label='Username',
    )
    email = forms.EmailField(
            widget=forms.EmailInput(attrs={
                    'autocomplete': 'email',
                    'placeholder': 'Enter your email address',
                }),
            label='Email',
        )
    password1 = forms.CharField(
            widget=forms.PasswordInput(attrs={
                    'autocomplete': 'new-password',
                    'placeholder': 'Enter a password',
                }),
            label='Password',
        )
    password2 = forms.CharField(
            widget=forms.PasswordInput(attrs={
                    'autocomplete': 'new-password',
                    'placeholder': 'Confirm your password',
                }),
            label='Confirm Password',
        )

    class Meta:
            model = User
            fields = ['username', 'email', 'password1', 'password2']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        # user.is_active = False
        if commit:
            user.save()
            Profile.objects.create(
                user=user,
                # pending_email=user.email,  # Set the email as pending
                tier=Profile.TIER_BASIC  # Set default tier
            )
        return user


class PasswordForm(SetPasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["new_password1"].widget.attrs.update({
            "placeholder": "New password",
            "autocomplete": "new-password",
            "class": "index_input",
        })
        self.fields["new_password2"].widget.attrs.update({
            "placeholder": "Confirm new password",
            "autocomplete": "new-password",
            "class": "index_input",
        })

class PasswordResetForm(PasswordResetForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["email"].widget.attrs.update({
            "placeholder": "email",
        })


class IndexPasswordResetConfirmView(auth_views.PasswordResetConfirmView):
    template_name = "myapp/index.html"
    success_url = "/?password_reset_success=1"
    form_class = PasswordForm


    def form_valid(self, form):
        if wants_json(self.request):
            return JsonResponse({"ok": True})
        return super().form_valid(form)

    def form_invalid(self, form):
        if wants_json(self.request):
            return JsonResponse({"ok": False, "errors": form.errors.get_json_data()}, status=400)
        return super().form_invalid(form)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        if not getattr(self, "validlink", True):
            ctx["errors"] = ["Reset link expired or invalid"]
        ctx["login_form"] = LoginForm(prefix="login")
        ctx["register_form"] = RegisterForm(prefix="register")
        ctx["password_form"] = PasswordResetForm()
        return ctx




# -------------------- Auth / Index --------------------

@require_login_json
@ratelimit_json(key="user_or_ip", rate="100/10m", block=False)
def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("myapp:index"))

def _fail_key(user_id: int) -> str:
    return f"pwchange:fail:{user_id}"

def increment_pwchange_failures(user_id: int, window_seconds: int = 600) -> int:
    key = _fail_key(user_id)
    # Initialize with TTL
    cache.add(key, 0, timeout=window_seconds)
    try:
        # Redis + many backends support incr
        count = cache.incr(key)
        return int(count)
    except Exception:
        # Fallback: manual increment (still ensures an int return)
        current = cache.get(key)
        try:
            current_int = int(current or 0)
        except (TypeError, ValueError):
            current_int = 0

        new_val = current_int + 1
        cache.set(key, new_val, timeout=window_seconds)
        return int(new_val)

def reset_pwchange_failures(user_id: int) -> None:
    cache.delete(_fail_key(user_id))



def send_verification_email(request, user):
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk)) # transforms the user_id to hide it in url
    token = default_token_generator.make_token(user) # time sensitive + user-specific token -> includes [ user password hash + timestamp + cryptographic signature ]
    verify_path = reverse("myapp:verify_email", args=[uidb64, token]) # generates a relative URL path
    verify_url = request.build_absolute_uri(verify_path) # creates full absolute url

    subject = "Verify your email"
    # renders the html with variables
    html = render_to_string("myapp/emails/verify_email.html", {"verify_url": verify_url, "user": user})
    text = f"Verify your mail: {verify_url}" # plain text fallback

    email = user.email
    if user is not None and user.profile.pending_email:
        email = user.profile.pending_email
    msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [email])
    msg.attach_alternative(html, "text/html")
    try:
        msg.send(fail_silently=False)
        return True, []
    except Exception as e:
        return False, ["Failed to send verification email.", str(e)]


@ratelimit_json(key="user_or_ip", rate="100/10m", block=False)
def resend_verification_email(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    username = request.POST.get("login-username", "").strip()
    password = request.POST.get("login-password", "")

    user = authenticate(request, username=username, password=password)

    if not user:
        return JsonResponse({"ok": False, "errors": ["Invalid credentials"]}, status=401)
    if user.is_active and user.profile.verified:
        return JsonResponse({"ok": False, "errors": ["Already verified"]}, status=400)

    send_verification_email(request=request, user=user)
    return JsonResponse({"ok": True})



@require_login_json
@require_recent_password
@ratelimit_json(key="user_or_ip", rate="3/10m", block=False)
def settings_send_verification_email(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###


    user = request.user

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    email = (data.get("email") or "").strip()
    if not email:
        return JsonResponse({"ok": False, "error": "Email is required."}, status=400)

    # django-style email validation
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"ok": False, "error": "Please provide a valid email address."}, status=400)

    # prevent using an email owned by another account
    UserModel = user.__class__
    if UserModel.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
        return JsonResponse({"ok": False, "error": "This email is already in use."}, status=409)

    if (user.email or "").strip().lower() != email.lower():
        user.profile.pending_email = email.lower();
        user.profile.save(update_fields=["pending_email"])

    # mark rate limit AFTER validation/update
    cache.set(rl_key, True, timeout=60)

    send_verification_email(request, user)
    return JsonResponse({"ok": True, "email": user.email})


@require_GET
def verify_email(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError):
        return HttpResponseBadRequest("Invalid verification link.")
    if default_token_generator.check_token(user, token):
        user.profile.verified = True
        user.profile.save(update_fields=["verified"])
        reset_pwchange_failures(user.id)
        if user.profile.pending_email is not None:
            user.email = user.profile.pending_email
            user.save(update_fields=["email"])
            user.profile.pending_email = None;
            user.profile.save(update_fields=["pending_email"])
            return redirect("/settings")
        return redirect("/?verified=1")
    return HttpResponseBadRequest("Verification link expired or invalid.")


def auth_key(group, request):
    # used so register and login have different counter on request attempts
    ip = request.META.get('REMOTE_ADDR')
    form_type = request.POST.get('form_type', 'unknown')
    return f"{form_type}:{ip}"

import logging
logger = logging.getLogger(__name__)


@ratelimit_json(key=auth_key, rate="3/min", method='POST', block=False)
def index(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET", "POST"}
    if request.method not in ALLOWED:
        if wants_json(request):
            return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
        return HttpResponseNotAllowed(ALLOWED)
    ### REQUIRED METHOD END ###

    errors = None
    if request.GET.get("code") == "account_locked":
        errors = ["Account inactive. Verify your email."]

    if request.user.is_authenticated:
        if wants_json(request):
            return JsonResponse({"ok": True, "detail": "already_authenticated"}, status=200)
        return HttpResponseRedirect(reverse("myapp:home"))

    register_form = RegisterForm(prefix="register")
    login_form = LoginForm(prefix="login")
    password_form = PasswordResetForm()

    if request.method == "POST" and wants_json(request):
        try:
            form_type = request.POST.get('form_type')
            if form_type == "reset_password":
                reset_form = PasswordResetForm(request.POST)
                if reset_form.is_valid():
                    try:
                        reset_form.save(
                            request=request,
                            use_https=request.is_secure(),
                            subject_template_name="myapp/emails/password_reset_subject.txt",
                            email_template_name="myapp/emails/password_reset.txt",
                            html_email_template_name="myapp/emails/password_reset.html",
                        )
                    except Exception:
                        logger.exception("Password reset email failed")
                        return JsonResponse(
                            {"ok": False, "errors": ["Email service unavailable right now. Try again later."]},
                            status=503,
                        )
                return JsonResponse({"ok": True, "detail": "If the email exists, a reset link has been sent."})

            if form_type == "login":
                login_form = LoginForm(request.POST, prefix="login")
                if not login_form.is_valid():
                    errors = login_form.errors.get_json_data()
                    flat_errors = [e["message"] for field in errors.values() for e in field]
                    return JsonResponse({"ok": False, "errors": flat_errors}, status=400)

                username = login_form.cleaned_data["username"]
                password = login_form.cleaned_data["password"]

                # change limit in settings.py (settings/base.py)
                if getattr(request, "axes_locked_out", False):
                    return JsonResponse(
                        {"ok": False, "errors": ["Too many login attempts. Try again later."]},
                        status=429,
                    )

                user = authenticate(request=request, username=username, password=password)

                if user is None:
                    return JsonResponse({"ok": False, "errors": ["Invalid credentials."]}, status=400)

                try:
                    verified = user.profile.verified
                    terms_and_conditions = user.profile.terms_and_conditions
                    consent = request.POST.get('consent')
                except Exception:
                    verified = False
                    terms_and_conditions = False
                    consent = False

                if consent == "False":
                    consent = False
                else:
                    consent = True
                if consent:
                    user.profile.terms_and_conditions = True
                    user.profile.save(update_fields=["terms_and_conditions"])
                if not verified:
                    return JsonResponse({"ok": False, "code": "verification_email", "errors": ["Account inactive. Verify your email."]}, status=403)
                if not terms_and_conditions and not consent:
                    return JsonResponse({"ok": True, "detail": "no_consent", "errors": ["Read the terms and conditions and accept to continue."]}, status=403)
                login(request, user)
                return JsonResponse({"ok": True})

            if form_type == "register":
                register_form = RegisterForm(request.POST, prefix="register")
                username = register_form["username"].value()
                if register_form.is_valid():
                    # make email only once per DB
                    if User.objects.filter(email__iexact=register_form.cleaned_data['email']).exists():
                        return JsonResponse({'ok': False, 'errors': ['This email is already in use.']})
                    user = register_form.save(commit=True)
                    send_verification_email(request, user)
                    return JsonResponse({"ok": True, "detail": "Check your email to verify your account."})
                errors = register_form.errors.get_json_data()
                if 'username' in errors:
                    for error_dict in errors['username']:
                        message = (error_dict.get('message') or '').lower()

                        if ('already exists' in message) or ('taken' in message):
                            try:
                                existing = User.objects.get(username=username)
                            except User.DoesNotExist:
                                break
                            try:
                                existing_verified = existing.profile.verified
                            except Exception:
                                existing_verified = False
                            if not existing_verified:
                                return JsonResponse({"ok": True, "detail": "Verify your email."})
                            return JsonResponse({"ok": False, "errors": ["User already exists."]}, status=400)
                flat_errors = [e['message'] for field in errors.values() for e in field]
                return JsonResponse({'ok': False, 'errors': flat_errors})
            return JsonResponse({"ok": False, "errors": ["Bad request."]}, status=400)
        except Exception:
            logger.exception("index POST crashed")
            return JsonResponse({"ok": False, "errors": ["Server error (check logs)."]}, status=500)
    return render(request, 'myapp/index.html', {
        'login_form': login_form,
        'register_form': register_form,
        'password_form': password_form,
        'errors': errors,
    })

# -------------------- Settings -----------------------

PWCHANGE_MAX_FAILS = 5
PWCHANGE_WINDOW_SECONDS = 600


@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/10m", block=False)
def change_password(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    if not request.user.profile.verified:
        logout(request)
        return JsonResponse({"ok": False, "code": "account_inactive", "error": "Account inactive."}, status=403)

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)


    form = PasswordChangeForm(
        user=request.user,
        data= {
            "old_password": data.get("current_password", ""),
            "new_password1": data.get("new_password1", ""),
            "new_password2": data.get("new_password2", ""),
        },
    )
    if form.is_valid():
        user = form.save()
        update_session_auth_hash(request, user) # to further stay logged in for session_auth
        return JsonResponse({"ok": True})
    # return JsonResponse({"ok": False, "errors": form.errors}, status=400)
 
    # WHEN CURRENT_PASSWORD IS ENTERED WRONG
    # PasswordChangeForm puts this error on the "old_password" field
    if "old_password" in form.errors and "new_password1" not in form.errors and "new_password2" not in form.errors:
        fails = increment_pwchange_failures(request.user.id, window_seconds=PWCHANGE_WINDOW_SECONDS)
        remaining = max(0, PWCHANGE_MAX_FAILS - fails)

        if fails >= PWCHANGE_MAX_FAILS:
            # Lock account + send reactivation/verification email
            request.user.profile.verified = False
            request.user.profile.save(update_fields=["verified"])
            # Send a fresh verification link
            send_verification_email(request, request.user)
            # End session immediately
            logout(request)
            print('user logout');
            return JsonResponse(
                {
                    "ok": False,
                    "code": "account_locked",
                    "error": "Too many incorrect password attempts. Account locked. Check email to reactivate.",
                },
                status=403,
            )

        return JsonResponse(
            {
                "ok": False,
                "code": "bad_current_password",
                "error": f"Incorrect current password. {remaining} attempt(s) remaining.",
            },
            status=400,
        )

    # Other validation errors (new password too weak/mismatch) should not count toward lockout
    if "old_password" in form.errors and len(form.errors) > 1:
        form.errors.pop("old_password")
    return JsonResponse({"ok": False, "errors": form.errors}, status=400)


@require_login_json
@ratelimit_json(key="user_or_ip", rate="100/10m", block=False)
def user_settings(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET", "POST"}
    if request.method not in ALLOWED:
        if wants_json(request):
            return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
        return HttpResponseNotAllowed(ALLOWED)
    ### REQUIRED METHOD END ###

    user = request.user
    # Vue calls fetch(), it sets Accept: application/json
    if wants_json(request):
        if request.method == 'GET':
            return JsonResponse({
                "ok": True,
                "user_name": user.username,
                "email": user.email,
                "profile_picture": (
                    request.build_absolute_uri(user.profile.picture.url)
                    if user.profile.picture and user.profile.picture.name
                    else None
                ),
            })
    if request.method == 'POST':
        email = request.POST.get('email')
        if email:
            user.email = email
        if 'profile_picture' in request.FILES:
            user.profile.picture = request.FILES['profile_picture']
            user.profile.save()
        user.save()
        return JsonResponse({
            "ok": True,
            "profile_picture": (
                request.build_absolute_uri(user.profile.picture.url)
                if user.profile.picture and user.profile.picture.name
                else None
            ),
        })

    # Otherwise, render the normal HTML page
    return render(request, "myapp/settings.html", {
        'user_name': user.username,
    })

@require_login_json
@require_recent_password
@ratelimit_json(key="user_or_ip", rate="3/10m", block=False)
def delete_account(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405)
    ### REQUIRED METHOD END ###

    try:
        user = request.user

        # Option 1: actually del user
        # user.delete()

        # Option 2: deactivate instead
        user.is_active = False
        user.save()

        # Log the user out
        logout(request)

        return JsonResponse({
            'ok': True,
            'message': 'Account deleted successfully'
        }, status=200)

    except Exception as e:
        return JsonResponse({
            'ok': False,
            'error': str(e)
        }, status=400)


# -------------------- Home / Feed --------------------


def home(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET"}
    if request.method not in ALLOWED:
        if wants_json(request):
            return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
        return HttpResponseBadRequest(ALLOWED)
    ### REQUIRED METHOD END ###

    if not request.user.is_authenticated:
        return HttpResponseRedirect(reverse("myapp:index"))

    profile, _ = Profile.objects.get_or_create(user=request.user)
    following_user_ids = list(profile.following.values_list('user__id', flat=True))
    following_user_ids.append(request.user.id)

    qs = Post.objects.filter(user__id__in=following_user_ids).order_by('-id')

    name_query = (request.GET.get("q") or "").strip()
    brand_query = (request.GET.get("brand_query") or "").strip()
    category_query = (request.GET.get("category_query") or "").strip()
    layout_query = (request.GET.get("layout_query") or "").strip()
    for_sale_query = (request.GET.get("for_sale_query") or "").strip()

    # FILTERING
    if name_query:
        qs = qs.filter(Q(name__icontains=name_query) )

    if brand_query:
        qs = qs.filter(brand__icontains=brand_query)

    if category_query and category_query != "None":
        qs = qs.filter(category=category_query)

    if layout_query and layout_query != "None":
        qs = qs.filter(keyboard__layout__iexact=layout_query)

    if for_sale_query == "1":
        qs = qs.filter(for_sale=True)

    # PAGINATOR
    try:
        request_page = int(request.GET.get('page') or 1)
    except (TypeError, ValueError):
        request_page = 1
    if request_page < 1:
        requst_page = 1
    paginator = Paginator(qs, 10)
    num_pages = paginator.num_pages or 0

    if wants_json(request):
        if num_pages == 0 or request_page > num_pages:
            return JsonResponse({'ok': False, 'html': '', 'has_next': False, 'num_items': 0})

    page_obj = paginator.get_page(request_page)

    # RENDERING ID
    if page_obj.paginator.count:
        start_idx = page_obj.start_index() - 1
    else:
        start_idx = 0
    for offset, post in enumerate(page_obj.object_list):
        post.rendering_id = start_idx + offset

    # AJAX
    if wants_json(request):
        rendered = [
            render_to_string('myapp/partials/post_body.html', {'post': p}, request=request)
            for p in page_obj
        ]
        html = "".join(rendered)

        return JsonResponse({
            'ok': False,
            'html': html,
            'has_next': page_obj.has_next(),
            'num_items': len(page_obj.object_list),
        })


    return render(request, 'myapp/home.html', {
        'posts': page_obj,
        'categories': Post.CATEGORY_CHOICES,
        'layouts': Keyboard.LAYOUT_CHOICES,
        'switch_type': Switches.TYPE_CHOICES,
        'cap_material': Keycaps.MATERIAL_CHOICES,
        'has_next': page_obj.has_next(),
        'user_name': request.user.username,
    })


@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
def like_toggle(request, post_id):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    try:
        post = (
            Post.objects
            .select_related("keyboard", "keycaps", "switches")
            .prefetch_related("images")
            .get(pk=post_id)
        )
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)

    user = request.user
    if post.likes.filter(pk=user.pk).exists():
        post.likes.remove(user)
        liked = False
    else:
        post.likes.add(user)
        liked = True

    # broadcast to viewers of this post
    to_post(post.id, "like_updated", likes=post.likes.count(), user_id=user.id, liked=liked)

    return JsonResponse({"ok": True, "liked": liked, "likes": post.likes.count()})


def market(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET"}
    if request.method not in ALLOWED:
        if wants_json(request):
            return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
        return HttpResponseBadRequest(ALLOWED)
    ### REQUIRED METHOD END ###

    if not request.user.is_authenticated:
        return HttpResponseRedirect(reverse("myapp:index"))

    profile, _ = Profile.objects.get_or_create(user=request.user)
    following_user_ids = list(profile.following.values_list('user__id', flat=True))
    following_user_ids.append(request.user.id)

    qs = Post.objects.filter(for_sale=True).exclude(user=request.user).order_by('-id')

    name_query = (request.GET.get("q") or "").strip()
    brand_query = (request.GET.get("brand_query") or "").strip()
    category_query = (request.GET.get("category_query") or "").strip()
    layout_query = (request.GET.get("layout_query") or "").strip()
    s_type_query = (request.GET.get("s_type_query") or "").strip()
    cap_material_query = (request.GET.get("cap_material_query") or "").strip()
    for_sale_query = (request.GET.get("for_sale_query") or "").strip()

    # FILTERING
    if name_query:
        qs = qs.filter(Q(name__icontains=name_query) )

    if brand_query:
        qs = qs.filter(brand__icontains=brand_query)

    if category_query and category_query != "None":
        qs = qs.filter(category=category_query)

    if layout_query and layout_query != "None":
        qs = qs.filter(keyboard__layout__iexact=layout_query)

    if cap_material_query and cap_material_query != "None":
        qs = qs.filter(keycaps__material__iexact=cap_material_query)

    if s_type_query and s_type_query != "None":
        qs = qs.filter(switches__type__iexact=s_type_query)

    if for_sale_query == "1":
        qs = qs.filter(for_sale=True)

    # PAGINATOR
    try:
        request_page = int(request.GET.get('page') or 1)
    except (TypeError, ValueError):
        request_page = 1
    if request_page < 1:
        requst_page = 1
    paginator = Paginator(qs, 10)
    num_pages = paginator.num_pages or 0

    if wants_json(request):
        if num_pages == 0 or request_page > num_pages:
            return JsonResponse({'html': '', 'has_next': False, 'num_items': 0})

    page_obj = paginator.get_page(request_page)

    # RENDERING ID
    if page_obj.paginator.count:
        start_idx = page_obj.start_index() - 1
    else:
        start_idx = 0
    for offset, post in enumerate(page_obj.object_list):
        post.rendering_id = start_idx + offset

    # AJAX
    if wants_json(request):
        rendered = [
            render_to_string('myapp/partials/post_body.html', {'post': p}, request=request)
            for p in page_obj
        ]
        html = "".join(rendered)

        return JsonResponse({
            'html': html,
            'has_next': page_obj.has_next(),
            'num_items': len(page_obj.object_list),
        })


    return render(request, 'myapp/market.html', {
        'posts': page_obj,
        'categories': Post.CATEGORY_CHOICES,
        'layouts': Keyboard.LAYOUT_CHOICES,
        'switch_type': Switches.TYPE_CHOICES,
        'cap_material': Keycaps.MATERIAL_CHOICES,
        'has_next': page_obj.has_next(),
        'user_name': request.user.username,
    })


# PROFILE SEARCH
@require_login_json
def profile_search(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    q = (request.GET.get("q") or "").strip()
    page = int(request.GET.get("page") or 1)

    qs = Profile.objects.select_related("user")
    if q:
        qs = qs.filter(user__username__icontains=q).exclude(verified=False)

    paginator = Paginator(qs.order_by("user__username"), 20)
    page_obj = paginator.get_page(page)

    rendered = [
        render_to_string('myapp/partials/profile_card.html', {'profile': p}, request=request)
        for p in page_obj
    ]
    html = "".join(rendered)

    return JsonResponse({
        'html': html,
        'has_next': page_obj.has_next(),
        'num_items': len(page_obj.object_list),
    })



# --- Integration notes ---
    INTEGRATION_NOTES = """
    settings.py (recommended):


# Limit request body size for in-memory uploads (defense in depth)
    DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024 # 10MB per request body chunk (tune to your needs)
    FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024


# Security middleware and headers
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True # for older browsers
    X_FRAME_OPTIONS = "DENY"
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_REFERRER_POLICY = "same-origin"


# (Optional) Content Security Policy via django-csp
# INSTALLED_APPS += ["csp"]
# MIDDLEWARE = ["csp.middleware.CSPMiddleware", *MIDDLEWARE]
# CSP_DEFAULT_SRC = ("'self'",)


# File upload handlers (keep Django defaults unless you need streaming)
# FILE_UPLOAD_HANDLERS = [
# "django.core.files.uploadhandler.MemoryFileUploadHandler",
# "django.core.files.uploadhandler.TemporaryFileUploadHandler",
# ]


# Optional: turn on Django's decompression bomb protection strictly
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = 50_000_000 # slightly above our own check
    urls.py:

    from django.urls import path
    from .views import create_post


    urlpatterns = [
    path("create-post/", create_post, name="create_post"),
    ]


    Templates:
    - Ensure you do not mark user-provided strings as |safe.
    - Prefer {{ variable }} (auto-escaped) vs. |safe.


    Explicit-image moderation:
    - Implement _image_is_explicit to call your provider.
    - For server-side queueing, you can soft-block or quarantine pending review.
    """

@require_login_json
@ratelimit_json(key="user_or_ip", rate="3/m", block=False)
def delete_post(request, post_id):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    try:
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)

    # only the owner or staff can delete
    if post.user_id != request.user.id and not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "not_allowed"}, status=400)
    post.delete()
    return JsonResponse({"ok": True})



def _to_bool(v):
    if v is None:
        return None
    s = str(v).strip().lower()
    if s in {"1", "true", "on", "yes"}:
        return True
    if s in {"0", "false", "off", "no", ""}:
        return False
    return None


@require_login_json
@ratelimit_json(key="user_or_ip", rate="3/m", block=False)
def update_post(request, post_id):

    ### POST REQUIRED ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### POST REQUIRED END ###

    """
    Update an existing Post (and its category-specific related row) plus images.

    Expected POST body (all optional / partial) [ FormData ]:
      - post_id: int (required)
      - edit_descr: str
      - edit_for_sale: 'true' | 'false'
      - edit_price: decimal (used only if edit_for_sale == 'true')
      - edit_switches, edit_keycaps          (when category == 'Keyboard')
      - edit_s_amount, edit_s_lubed          (when category == 'Switches')
      - files: list of images (replaces existing images if provided)

    Returns JSON: { "id", "updated_at", "html" }
    """

    try:
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)

    # Only the owner can edit
    if post.user_id != request.user.id:
        return JsonResponse({"ok": False, "error": "You can't edit this post."}, status=400);

    # --- Core Post fields (partial) ---
    if "edit_descr" in request.POST:
        post.description = (request.POST.get("edit_descr") or "").strip()

    if "edit_for_sale" in request.POST:
        new_for_sale = _to_bool(request.POST.get("edit_for_sale"))
        if new_for_sale is not None:
            post.for_sale = new_for_sale
            if not post.for_sale:
                # If toggled off, clear price
                post.price = None

    if "edit_price" in request.POST:
        raw_price = request.POST.get("edit_price")
        if raw_price not in (None, "", "null"):
            try:
                post.price = Decimal(raw_price)
            except (InvalidOperation, TypeError):
                return JsonResponse({"ok": False, "error": "Invalid price value."}, status=400);

    # --- Category-specific updates (partial) ---
    if post.category == "Keyboard":
        kb = getattr(post, "keyboard", None) or Keyboard.objects.create(post=post)
        if "edit_switches" in request.POST:
            kb.switches = (request.POST.get("edit_switches") or "").strip()
        if "edit_keycaps" in request.POST:
            kb.keycaps = (request.POST.get("edit_keycaps") or "").strip()
        kb.save()

    elif post.category == "Switches":
        sw = getattr(post, "switches", None) or Switches.objects.create(post=post)
        if "edit_s_amount" in request.POST:
            try:
                sw.amount = int(request.POST.get("edit_s_amount") or 0)
            except ValueError:
                return JsonResponse({"ok": False, "error": "Invalid switch amount."}, status=400);
        if "edit_s_lubed" in request.POST:
            maybe_bool = _to_bool(request.POST.get("edit_s_lubed"))
            if maybe_bool is not None:
                sw.lubed = maybe_bool
        sw.save()

    elif post.category == "Keycaps":
        kc = getattr(post, "keycaps", None) or Keycaps.objects.create(post=post)
        # (No edit fields currently sent for keycaps material in your JS. Add here if you expose one.)
        kc.save()

    # Validate required price when for_sale
    if post.for_sale and (post.price is None):
        return JsonResponse({"ok": False, "error": "Price is required when the for sale is true."}, status=400);

    files = request.FILES.getlist("files")        # new uploads
    old_files = request.POST.getlist("old_files")
    keep_those = set(old_files)
    if old_files:
        for img in post.images.all():
            if str(img.id) not in keep_those:
                img.delete()
    elif files:
        post.images.all().delete()

    for f in files:
        Image.objects.create(post=post, image=f)

    # Persist post
    post.save()

    # Re-render the updated HTML fragment for the client to patch into the DOM
    html = render_to_string("myapp/partials/post_body.html", {"post": post}, request=request)

    # Optional lightweight realtime ping to followers + author (mirrors create_post)
    channel_layer = get_channel_layer()
    follower_ids = list(Profile.objects.get(user=post.user).following.values_list('user__id', flat=True))
    follower_ids.append(post.user_id)
    for uid in follower_ids:
        to_user(uid, "post_updated", post_id=post.id, updated_at=post.updated_at.isoformat())

    to_post(post.id, "post_updated",
            fields={"likes": post.likes.count(), "description": post.description})

    return JsonResponse({
        "ok": True,
        "id": post.id,
        "updated_at": post.updated_at.isoformat(),
        "html": html,
    }, status=200)



# -------------------- Comments --------------------


@require_login_json
@ratelimit_json(key="user_or_ip", rate="20/m", block=False)
def comment(request):

    ### POST REQUIRED ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### POST REQUIRED END ###


    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    post_id = data.get("post_id")
    content = (data.get("comment_input") or "").strip()

    # Basic checks
    if not post_id:
        return JsonResponse({"ok": False, "error": "Missing post_id."}, status=400)
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Post not found."}, status=404)

    today = timezone.localdate()

    # Cap Comments
    post_today_count = Comment.objects.filter(post=post, date__date=today).count()
    if post_today_count >= PER_POST_DAILY_CAP:
        return JsonResponse({"ok": False, "error": "Comments are closed for this post today (daily limit reached)."}, status=403)

    if (Post.objects.get(pk=post_id).user != request.user):
        profile = request.user.profile
        user_limit = profile.per_post_daily_limit()
        user_today_on_post = Comment.objects.filter(post=post, user=request.user, date__date=today).count()
        if user_today_on_post >= user_limit:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "You've reached your daily comment limit for this post.",
                    "tier": profile.tier,
                    "limit": user_limit,
                },
                status=403,
            )


    # Sanitize + validate (your existing helpers)
    content = _clean_text(content)
    if not content:
        return JsonResponse({"ok": False, "error": "Comment cannot be empty."}, status=400)
    if len(content) > 600:
        return JsonResponse({"ok": False, "error": "Comment is too long (max 600)."}, status=400)
    if not text_is_clean(content, False):
        return JsonResponse({"ok": False, "error": "Please remove explicit language."}, status=400)

    # (Optional) banned regexes example (adjust to your list)
    banned_regexes = [r"\bslur1\b", r"\bslur2\b"]
    for pat in banned_regexes:
        if re.search(pat, content, flags=re.IGNORECASE):
            return JsonResponse({"ok": False, "error": "Content not allowed."}, status=400)

    # Create
    c = Comment.objects.create(post=post, user=request.user, content=content)


    # Broadcast over WS to everyone in post_{post_id}
    to_post(
        post.id,
        "comment_created",
        # post_id=post.id,
        comment_id=c.id,
        content=c.content,
        user_id=request.user.id,
        username=request.user.username,
        ts=c.date.isoformat(),
    )

    # Respond to the HTTP caller (frontend can optimistically render or use this)
    return JsonResponse({"id": c.id, "date": c.date.isoformat()})


@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
def edit_comment(request, comment_id):

    ### POST REQUIRED ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "Not allowed."}, status=405) 
    ### POST REQUIRED END ###

    try:
        comment = Comment.objects.get(pk=comment_id)
    except Comment.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)

    # Only author (or staff) can edit
    if comment.user_id != request.user.id and not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Not allowed."}, status=405) 

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    # Sanitize + basic validation
    content = _clean_text(data.get("content", ""))
    if not content:
        return JsonResponse({"ok": False, "error": "Comment cannot be empty."}, status=400)
    if len(content) > 600:
        return JsonResponse({"ok": False, "error": "Comment is too long (max 600 characters)."}, status=400)

    # Explicit language / basic moderation
    if not text_is_clean(content, False):
        return JsonResponse({"ok": False, "error": "Please remove explicit language."}, status=400)

    # Persist (we keep original timestamp; change only the content)
    comment.content = content
    comment.save(update_fields=["content"])

    # No payload needed Ñ frontend already has the text
    return JsonResponse({"ok": True}, status=200)


@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
def delete_comment(request, comment_id):

    ### POST REQUIRED ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### POST REQUIRED END ###

    try:
        comment = Comment.objects.get(pk=comment_id)
    except Comment.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)

    # Only author or staff can delete
    if comment.user_id != request.user.id and not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Not allowed."}, status=403)

    comment.delete()
    return JsonResponse({"ok": True}, status=200)



@require_login_json
def unread_counts(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405)
    ### REQUIRED METHOD END ###

    total, per_chat = _compute_unread(request.user)
    muted_ids = list(
        ChatMembership.objects
        .filter(user=request.user, muted=True)
        .values_list('chat_id', flat=True)
    )
    return JsonResponse({
        "ok": True,
        "total": total,
        "per_chat": per_chat,
        "muted_chat_ids": muted_ids,
    })

@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
def mark_read(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    chat_id = data.get('chat_id')
    if not chat_id:
        return JsonResponse({"ok": False, "error": "chat_id is required."})

    # Validate chat
    try:
        chat = Chat.objects.get(pk=chat_id)
    except Chat.DoesNotExist:
        return JsonResponse({"ok": False, "error": "chat not found."})

    # Validate membership
    try:
        membership = ChatMembership.objects.get(chat=chat, user=request.user)
    except ChatMembership.DoesNotExist:
        return JsonResponse({"ok": False, "error": "You are not a member of this chat."})

    # Latest message timestamp
    last_msg_ts = (
        Message.objects.filter(chat=chat)
        .aggregate(ts=Max('date'))
        .get('ts')
    ) or timezone.now()

    # Update read marker
    membership.last_read_at = last_msg_ts
    membership.save(update_fields=['last_read_at'])

    # Recompute unread counts
    unread_total, per_chat = _compute_unread(request.user)
    muted_ids = list(
        ChatMembership.objects.filter(user=request.user, muted=True)
        .values_list('chat_id', flat=True)
    )

    # Push update to THIS user (never "recipient")
    to_user(
        request.user.id,
        "badge_update",
        total=unread_total,
        per_chat=per_chat,
        muted_chat_ids=muted_ids,
    )

    return JsonResponse({"ok": True})


@require_login_json
def ensure_chat(request):
    """
    JSON in:  { "username": "<other_username>" }
    JSON out: { "chat_id": <int>, "created": true|false }
    """

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    # User = get_user_model()

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    other_username = (data.get("profile") or "").strip()
    if not other_username:
        return JsonResponse({"ok": False, "error": "Missing username."}, status=400)

    # prevent DM yourself
    if other_username == request.user.username:
        return JsonResponse({"ok": False, "error": "Cannot DM yourself."}, status=400)

    # lookup other user
    try:
        other_user = User.objects.get(username=other_username)
    except User.DoesNotExist:
        return JsonResponse({"ok": False, "error": "User not found."}, status=404)

    # use your ChatManager
    try:
        chat, _ = Chat.objects.get_or_create_dm(
            request.user,
            other_user,
            created_by=request.user
        )
    except IntegrityError:
        return JsonResponse({"ok": False, "error": "Could not create chat."}, status=409)
    except Exception:
        return JsonResponse({"ok": False, "error": "Server error."}, status=500)

    return JsonResponse({"ok": True, "chat_id": chat.pk}, status=200)




# -------------------- Profile --------------------
@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
def profile(request, profile):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET", "POST"}
    if request.method not in ALLOWED:
        if wants_json(request):
            return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
        return HttpResponseBadRequest(ALLOWED)
    ### REQUIRED METHOD END ###

    if request.method == "GET":
        current_user = request.user
        visited_user = get_object_or_404(User, username=profile)
        visited_profile = visited_user.profile

        # TODO: need to figure if I want to include NOT veririfed profiles
        # if visited_profile.verified == False:
        #     return JsonResponse({"ok": False, "error": "User not found."}, status=404)

        if current_user == visited_user:

            last_msg_dt = Message.objects.filter(chat=OuterRef('pk')).order_by('-date').values('date')[:1]
            chat_arr = (
                Chat.objects.filter(user=current_user)
                .annotate(last_dt=Subquery(last_msg_dt))
                .order_by('-last_dt', '-id')  # newest first, fallback id
                .prefetch_related(Prefetch('user', queryset=User.objects.select_related('profile')))
            )
            chat_arr_info = []
            for chat in chat_arr:
                # pick the other participant (assuming 1:1 chats)
                others = [u for u in chat.user.all() if u.id != current_user.id]
                other = others[0] if others else current_user
                # me = chat.me_membership[0] if getattr(chat, 'me_membership', []) else None
                me = ChatMembership.objects.filter(chat=chat, user=current_user).first()
                muted = '1' if (me and me.muted) else '0'
                chat_arr_info.append({
                    'chat_id': chat.id,
                    'other': other,
                    'last_one': chat.last_message,
                    'last_date': chat.last_dt,
                    'muted': muted,
                })
            chat = None
            chat_id = None
            messages = []
        else:
            chat_arr = None
            chat_arr_info = []
            dm_key = Chat.objects.dm_key_for(current_user, visited_user)
            chat = Chat.objects.filter(dm_key=dm_key).first()
            chat_id = chat.id if chat else None
            messages = chat.messages.order_by('-date') if chat else []

        # Following state
        is_following = request.user.profile.following.filter(id=visited_profile.id).exists()

        follower = visited_profile.followers.all()
        following = visited_profile.following.all()

        # Posts for the visited user
        # Tip: prefetch/select_related to avoid N+1 during fragment rendering
        posts_qs = (
            visited_user.posts
            .all()
            .select_related("keyboard", "keycaps", "switches")
            .prefetch_related("images", "comments", "comments__user")
            .order_by("-created_at")
        )

        # Pagination
        try:
            page_num = int(request.GET.get('page') or 1)
        except (TypeError, ValueError):
            page_num = 1
        if page_num < 1:
            page_num = 1

        paginator = Paginator(posts_qs, 10)
        page_obj = paginator.get_page(page_num)

        # Rendering IDs consistent with your feed logic
        if page_obj.paginator.count:
            start_idx = page_obj.start_index() - 1
        else:
            start_idx = 0
        for offset, p in enumerate(page_obj.object_list):
            p.rendering_id = start_idx + offset

        # AJAX (infinite scroll) branch render multiple singles and join
        if wants_json(request):
            rendered = [
                render_to_string('myapp/partials/post_body.html', {'post': p}, request=request)
                for p in page_obj
            ]
            html = "".join(rendered)
            return JsonResponse({
                'html': html,
                'has_next': page_obj.has_next(),
                'num_items': len(page_obj.object_list),
            })

        # Full page
        return render(request, 'myapp/profile.html', {
            'follower': follower,
            'following': following,

            'follower_count': follower.count(),
            'following_count': following.count(),

            'profile': visited_profile,
            'profile_name': visited_profile.user.username,
            'posts': page_obj,  # template loops and includes single-post partial
            'is_following': is_following,
            'messages': messages,
            'date_joined': visited_user.date_joined,
            'has_next': page_obj.has_next(),
            'chat_id': chat_id,
            'user_name': request.user.username,
            'categories': Post.CATEGORY_CHOICES,
            'layouts': Keyboard.LAYOUT_CHOICES,
            'switch_type': Switches.TYPE_CHOICES,
            'cap_material': Keycaps.MATERIAL_CHOICES,
            'chat_arr': chat_arr,
            'chat_arr_info': chat_arr_info,
        })

    # POST

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    is_following = data.get('follow')
    try:
        cur_profile = Profile.objects.get(user__username=profile)
    except Profile.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)
    if is_following == "True":
        request.user.profile.following.remove(cur_profile)
    else:
        request.user.profile.following.add(cur_profile)
    return JsonResponse({"ok": True}, status=200)


# -------------------- Chat --------------------

@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
def mute_chat(request, chat_id: int):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    try:
        chat = Chat.objects.get(pk=chat_id)
    except Chat.DoesNotExist:
        return JsonResponse({"ok": False, "error": "not_found"}, status=404)

    membership = _ensure_membership(chat, request.user)
    membership.muted = not membership.muted
    membership.save(update_fields=["muted"])

    # Broadcast to this user's group so other tabs/devices update
    to_user(request.user.id, "mute_state", chat_id=chat.id, muted=membership.muted)
    muted = '1' if (membership.muted) else '0'
    return JsonResponse({"ok": True, "muted": muted})

# helper, no view
def _compute_unread(user):
    per_chat = {}
    total = 0
    memberships = ChatMembership.objects.filter(user=user).select_related('chat')
    for mem in memberships:
        if mem.muted:
            continue
        qs = Message.objects.filter(chat=mem.chat).exclude(user=user)
        if mem.last_read_at:
            qs = qs.filter(date__gt=mem.last_read_at)
        count = qs.count()
        if count:
            per_chat[str(mem.chat_id)] = count
            total += count
    return total, per_chat


@require_login_json
@ratelimit_json(key="user_or_ip", rate="20/m", block=False)
def chat(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    profile_name = (data.get("profile") or "").strip()
    message = (data.get("message") or "").strip()

    if not profile_name:
        return JsonResponse({"ok": False, "error": "Missing profile."}, status=400)
    if not message:
        return JsonResponse({"ok": False, "error": "No message content provided."}, status=400)

    # Profanity / banned checks here so WS doesn't have to
    msg_clean = _clean_text(message)
    if not msg_clean:
        return JsonResponse({"ok": False, "error": "Empty message."}, status=400)
    if len(msg_clean) > 500:
        return JsonResponse({"ok": False, "error": "Message too long."}, status=400)
    if not text_is_clean(msg_clean, False):
        return JsonResponse({"ok": False, "error": "Please remove explicit language."}, status=400)

    banned_regexes = [r"\bslur1\b", r"\bslur2\b"]
    for pat in banned_regexes:
        if re.search(pat, msg_clean, flags=re.IGNORECASE):
            return JsonResponse({"ok": False, "error": "Content not allowed."}, status=400)

    try:
        other_user = User.objects.get(username=profile_name)
    except User.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Recipient not found."}, status=404)


    chat, created = Chat.objects.get_or_create_dm(request.user, other_user, created_by=request.user)
    if (chat.messages.count() >= PER_CHAT_DAILY_CAP):
        return JsonResponse({"ok": False, "error": "Limit of this Chat reached for today."}, status=403)

    m = Message.objects.create(chat=chat, user=request.user, content=msg_clean)

    # keep sender "read" up to date
    ChatMembership.objects.update_or_create(
        chat=chat, user=request.user, defaults={'last_read_at': m.date}
    )


    # Broadcast to chat_{chat.id}
    to_chat(
        chat.id,
        "chat_message",
        message_id=m.id, 
        content=m.content, 
        user_name=m.user.username, 
        ts=m.date.isoformat(),
    )


    def after_commit():
# Preload participants (and profile) so we can personalize per recipient
        participants = list(
            chat.user.select_related("profile").all()
        )
        last_payload_common = {
            "chat_id": chat.id,
            "last_content": m.content,
            "last_ts": timezone.localtime(m.date).isoformat(),
            "sender_id": m.user_id,
            "sender_username": request.user.username,
        }
        for recipient in participants:
            other = next((u for u in participants if u.id != recipient.id), request.user)
            is_own = (m.user.username == request.user.username)
            pic = getattr(other.profile, "picture", None)
            if pic and getattr(pic, "name", ""):
                try:
                    pic_url = pic.url
                except Exception:
                    pic_url = None
            else:
                pic_url = None
            muted = bool(
                ChatMembership.objects
                    .filter(chat_id=chat.id, user_id=recipient.id)
                    .values_list('muted', flat=True)
                    .first()
            )
            muted = '1' if (muted) else '0'
            to_user(
                recipient.id,
                "messenger_last_row",
                chat_id=chat.id,
                last_content=m.content,
                last_ts=timezone.localtime(m.date).isoformat(),
                sender_id=m.user_id,
                sender_username=request.user.username,
                other_username=other.username,
                profile_picture_url=pic_url,
                muted=muted,
            )
            # optional: unread badge counts for that recipient
            # (skip computing for sender if you prefer)
            unread_total, per_chat = _compute_unread(recipient)
            to_user(recipient.id, "badge_update", total=unread_total, per_chat=per_chat)
    transaction.on_commit(after_commit)
    return JsonResponse({"ok": True}, status=200)


@require_login_json
@ratelimit_json(key="user_or_ip", rate="10/m", block=False)
def update_chat(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"POST"}
    if request.method not in ALLOWED:
        return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
    ### REQUIRED METHOD END ###

    current_user = request.user
    ### REQUIRE JSON
    if request.content_type != "application/json":
        return JsonResponse({"ok": False, "error": "Expected application/json"}, status=415)

    ### PARSE JSON
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    profile_name = data.get("profile")
    other_user = User.objects.get(username=profile_name)

    dm_key = Chat.objects.dm_key_for(current_user, other_user)
    chat = Chat.objects.filter(dm_key=dm_key).first()
    if not chat:
        return JsonResponse({"ok": False, "error": "No chat."}, status=400)

    payload = []
    for m in chat.messages.order_by('-date'):
        payload.append({
            'message': m.content,
            'username': m.user.username,
            'date': m.date.strftime("%b. %d, %Y, %I:%M %p"),
            'is_own': (current_user.username == m.user.username),
        })
    return JsonResponse({"ok": True, "data": payload}, status=200);



@require_GET
def about(request):
    return render(request, 'myapp/nav/about.html', {
        'user_name':  request.user.username,
    })


@ratelimit_json(key='ip', rate='3/d', block=False)
def help(request):

    ### REQUIRED METHOD ###
    ALLOWED = {"GET", "POST"}
    if request.method not in ALLOWED:
        if wants_json(request):
            return JsonResponse({"ok": False, "error": "method_not_allowed"}, status=405) 
        return HttpResponseNotAllowed(ALLOWED)
    ### REQUIRED METHOD END ###

    if request.method == "POST" and wants_json(request):
        name = request.POST.get("name", "").strip()
        email = request.POST.get("email", "").strip()
        message = request.POST.get("message", "").strip()

        if not name or not email or not message:
            return JsonResponse({"ok": False, "error": "All fields are required."}, status=400)

        subject = f"Support Request from {name}"
        body = f"""
A new help/support message was submitted:

Name: {name}
Email: {email}

Message:
{message}
        """

        try:
            msg = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[getattr(settings, "CONTACT_EMAIL")],
                reply_to=[email],
            )
            msg.send()
        except Exception as e:
            return JsonResponse({"ok": False, "error": str(e)}, status=500)

        return JsonResponse({"ok": True})

    # Normal browser request ? render template
    return render(request, 'myapp/nav/help.html', {
        'user_name': request.user.username,
    })


@require_GET
def privacy(request):
    return render(request, 'myapp/nav/privacy.html', {
        'user_name': request.user.username,
    })

@require_GET
def imprint(request):
    return render(request, 'myapp/nav/imprint.html', {
        'user_name': request.user.username,
        'contact_email': getattr(settings, "CONTACT_EMAIL"),
    })

@require_GET
def terms(request):
    return render(request, 'myapp/nav/terms.html', {
        'user_name': request.user.username,
    })

@require_GET
def guidelines(request):
    return render(request, 'myapp/nav/guidelines.html', {
        'user_name': request.user.username,
    })

@require_GET
def copyright(request):
    return render(request, 'myapp/nav/copyright.html', {
        'user_name': request.user.username,
    })



