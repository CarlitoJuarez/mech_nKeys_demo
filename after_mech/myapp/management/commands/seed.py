import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from myapp.models import Comment, Chat, Message

LOREM_SHORT = [
    "Clean build. Love the colorway.",
    "Nice choice on the switches.",
    "That layout looks perfect.",
    "Solid setup super neat.",
    "Great photos, details are crisp.",
    "Would totally daily-drive this.",
]

LOREM_CHAT = [
    "Hey! Saw your post looks great.",
    "What switches are those exactly?",
    "Nice. How does it sound?",
    "I'm thinking of a similar build.",
    "Do you have a sound test?",
    "Thanks! Appreciate it.",
]

User = get_user_model()

class Command(BaseCommand):
    help = "Seed demo data (creates demo superuser + sample objects)."

    @transaction.atomic
    def handle(self, *args, **options):
        username = os.getenv("DEMO_ADMIN_USERNAME", "admin")
        email = os.getenv("DEMO_ADMIN_EMAIL", "admin@example.com")
        password = os.getenv("DEMO_ADMIN_PASSWORD", "admin12345")

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_staff": True, "is_superuser": True},
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created demo superuser: {username}"))
        else:
            # ensure flags/password are correct even if user existed
            changed = False
            if not user.is_staff:
                user.is_staff = True
                changed = True
            if not user.is_superuser:
                user.is_superuser = True
                changed = True
            if user.email != email:
                user.email = email
                changed = True
            if changed:
                user.save()

            # optionally reset password each seed run:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.WARNING(f"Updated demo superuser: {username}"))

        self.stdout.write("")
        self.stdout.write("Demo login:")
        self.stdout.write(f"  username: {username}")
        self.stdout.write(f"  email:    {email}")
        self.stdout.write(f"  password: {password}")
        self.stdout.write("")

# myapp/management/commands/seed.py
from pathlib import Path

from django.conf import settings
from django.core.files import File
from myapp.models import Profile, Post, Image, Keyboard, Keycaps, Switches


DEMO_USERS = [
    {"username": "demo_user_a", "email": "demo_user_a@example.com", "password": "demo12345"},
    {"username": "demo_user_b", "email": "demo_user_b@example.com", "password": "demo12345"},
    {"username": "demo_user_c", "email": "demo_user_c@example.com", "password": "demo12345"},
]


def _assets_dir() -> Path:
    # Put images here: myapp/seed_assets/*.jpg (committed)
    return Path(settings.BASE_DIR) / "myapp" / "seed_assets"


def _load_seed_images() -> list[Path]:
    d = _assets_dir()
    if not d.exists():
        return []
    paths = sorted(d.glob("*.jpg")) + sorted(d.glob("*.jpeg")) + sorted(d.glob("*.png")) + sorted(d.glob("*.webp"))
    return paths


def _get_or_create_demo_user(User, username: str, email: str, password: str):
    user, created = User.objects.get_or_create(username=username, defaults={"email": email})
    user.email = email
    user.set_password(password)
    user.save()

    prof, _ = Profile.objects.get_or_create(user=user)
    prof.verified = True
    prof.terms_and_conditions = True
    prof.save()
    return user, prof, created


def _create_post_with_extras(user, category: str, for_sale: bool, price, likes_users, *,
                            keyboard_layout=None, keyboard_mount=None,
                            keyboard_keycaps=None, keyboard_switches=None,
                            keycaps_material=None,
                            switches_type=None, switches_amount=None, switches_lubed=None):
    post = Post.objects.create(
        user=user,
        name="demo_name",
        brand="demo_brand",
        color="demo_color",
        description="demo_description",
        category=category,
        for_sale=for_sale,
        price=price if for_sale else None,
    )

    # likes
    for u in likes_users:
        post.likes.add(u)

    # category-specific extras
    if category == "Keyboard":
        # NOTE: mount is a choices field; "demo_mount" is not a valid choice.
        # Use a valid value like "demo_mount" (or change the choices if you truly want "demo_mount").
        Keyboard.objects.create(
            post=post,
            layout=keyboard_layout or "Other",
            mount=keyboard_mount or "demo_mount",
            keycaps=keyboard_keycaps or "demo_keycaps",
            switches=keyboard_switches or "demo_switches",
        )
    elif category == "Keycaps":
        Keycaps.objects.create(post=post, material=keycaps_material or "PBT")
    elif category == "Switches":
        Switches.objects.create(
            post=post,
            type=switches_type or "Linear",
            amount=int(switches_amount or 80),
            lubed=bool(switches_lubed),
        )

    return post


def _attach_one_image(post: Post, img_path: Path, idx: int):
    with img_path.open("rb") as f:
        img = Image(post=post)
        img.image.save(f"demo_{post.id}_{idx}{img_path.suffix.lower()}", File(f), save=True)

def _attach_images(post: Post, img_paths: list[Path], start_idx: int, count: int) -> int:
    for k in range(count):
        p = img_paths[(start_idx + k) % len(img_paths)]
        _attach_one_image(post, p, start_idx + k)
    return start_idx + count

def _attach_images_for_post(post: Post, key: str):
    """
    key example: "a_0" (user a, post 0)
    Loads: myapp/seed_assets/post_{key}_0.*, post_{key}_1.*, ...
    """
    base = _assets_dir()
    attached = 0

    for img_idx in range(0, 10):  # up to 10 images per post
        # match any extension
        matches = list(base.glob(f"post_{key}_{img_idx}.*"))
        if not matches:
            break
        img_path = matches[0]
        _attach_one_image(post, img_path, img_idx)
        attached += 1

    if attached == 0:
        raise RuntimeError(f"No seed images found for post key '{key}'. Expected files like post_{key}_0.jpg")

    return attached


class Command(BaseCommand):
    help = "Seed demo data: 3 demo users, follow graph, 3 posts each, likes, and images from myapp/seed_assets."

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        # 1) Clean prior demo data (idempotent)
        usernames = [u["username"] for u in DEMO_USERS]
        demo_user_qs = User.objects.filter(username__in=usernames)

        # delete posts/images owned by demo users
        Post.objects.filter(user__in=demo_user_qs).delete()
        # delete profiles and users
        Profile.objects.filter(user__in=demo_user_qs).delete()
        demo_user_qs.delete()

        # 2) Create users + verified profiles
        users = {}
        profiles = {}
        for u in DEMO_USERS:
            user, prof, _ = _get_or_create_demo_user(User, u["username"], u["email"], u["password"])
            users[u["username"]] = user
            profiles[u["username"]] = prof

        a = users["demo_user_a"]
        b = users["demo_user_b"]
        c = users["demo_user_c"]

        pa = profiles["demo_user_a"]
        pb = profiles["demo_user_b"]
        pc = profiles["demo_user_c"]

        # 3) Follow graph: a<->b, and b->c
        pa.following.add(pb)   # a follows b
        pb.following.add(pa)   # b follows a
        pb.following.add(pc)   # b follows c

        # 4) Posts (3 each) with likes + extras
        posts = []

        # demo_user_a
        posts.append(_create_post_with_extras(
            a, "Keyboard", True, 222, likes_users=[b, c],
            keyboard_layout="65%", keyboard_mount="demo_mount",
            keyboard_keycaps="demo_keycaps", keyboard_switches="demo_switches",
        ))
        posts.append(_create_post_with_extras(
            a, "Keyboard", False, None, likes_users=[b, c],
            keyboard_layout="65%", keyboard_mount="demo_mount",
            keyboard_keycaps="demo_keycaps", keyboard_switches="demo_switches",
        ))
        posts.append(_create_post_with_extras(
            a, "Switches", False, None, likes_users=[b],
            switches_type="Linear", switches_amount=80, switches_lubed=True,
        ))

        # demo_user_b
        posts.append(_create_post_with_extras(
            b, "Keyboard", True, 222, likes_users=[c],
            keyboard_layout="65%", keyboard_mount="demo_mount",
            keyboard_keycaps="demo_keycaps", keyboard_switches="demo_switches",
        ))
        posts.append(_create_post_with_extras(
            b, "Keyboard", False, None, likes_users=[c],
            keyboard_layout="75%", keyboard_mount="demo_mount",
            keyboard_keycaps="demo_keycaps", keyboard_switches="demo_switches",
        ))
        posts.append(_create_post_with_extras(
            b, "Keycaps", False, None, likes_users=[],
            keycaps_material="PBT",
        ))

        # demo_user_c
        posts.append(_create_post_with_extras(
            c, "Keyboard", True, 222, likes_users=[a],
            keyboard_layout="60%", keyboard_mount="demo_mount",
            keyboard_keycaps="demo_keycaps", keyboard_switches="demo_switches",
        ))
        posts.append(_create_post_with_extras(
            c, "Keyboard", False, None, likes_users=[b],
            keyboard_layout="65%", keyboard_mount="demo_mount",
            keyboard_keycaps="demo_keycaps", keyboard_switches="demo_switches",
        ))
        posts.append(_create_post_with_extras(
            c, "Other", False, None, likes_users=[],
        ))


        # 5) Attach demo images by filename pattern
        def attach_or_fail(post, key):
            _attach_images_for_post(post, key)  # raises if missing

        # Map posts in the same order you created them:
        # A: posts[0], posts[1], posts[2]
        attach_or_fail(posts[0], "a_0")
        attach_or_fail(posts[1], "a_1")
        attach_or_fail(posts[2], "a_2")

        # B: posts[3], posts[4], posts[5]
        attach_or_fail(posts[3], "b_0")
        attach_or_fail(posts[4], "b_1")
        attach_or_fail(posts[5], "b_2")

        # C: posts[6], posts[7], posts[8]
        attach_or_fail(posts[6], "c_0")
        attach_or_fail(posts[7], "c_1")
        attach_or_fail(posts[8], "c_2")

# --- Comments ---
        def add_comment(post, user, text):
            Comment.objects.create(post=post, user=user, content=text)

        add_comment(posts[0], a, "demo_comment: Really happy with this one.")
        add_comment(posts[1], c, "demo_comment: Love the aesthetics on this build.")
        add_comment(posts[3], a, "demo_comment: This looks super clean.")
        add_comment(posts[3], c, "demo_comment: Nice choice of parts!")
        add_comment(posts[3], b, "demo_comment: Thanks! Appreciate it.")
        add_comment(posts[5], a, "demo_comment: PBT is always a win.")
        add_comment(posts[6], b, "demo_comment: Looks great how's the typing feel?")
        add_comment(posts[8], a, "demo_comment: Cool post. Nice listing.")

        # --- Chats + Messages ---
        def dm(u_from, u_to, texts):
            chat, _ = Chat.objects.get_or_create_dm(u_from, u_to, created_by=u_from)
            for t in texts:
                Message.objects.create(chat=chat, user=u_from, content=t)

        # user_a -> user_b and user_b -> user_a (same DM chat)
        dm(a, b, [
            "demo_dm: Hey, loved your keyboard post!",
            "demo_dm: What keycaps are those?",
        ])
        dm(b, a, [
            "demo_dm: Thanks! They're demo_keycaps.",
            "demo_dm: Switches are demo_switches pretty smooth.",
        ])

        # user_a -> user_c
        dm(a, c, [
            "demo_dm: Your build looks awesome.",
            "demo_dm: Any tips for the layout choice?",
        ])

        # user_c -> user_b
        dm(c, b, [
            "demo_dm: Saw your post nice setup.",
            "demo_dm: Thinking about a similar 70% build.",
        ])



        self.stdout.write(self.style.SUCCESS("Seed complete."))
        self.stdout.write("Demo users (password for all): demo12345")
        for u in DEMO_USERS:
            self.stdout.write(f"  - {u['username']} / {u['email']}")


