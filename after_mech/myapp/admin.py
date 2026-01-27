from django.contrib import admin
from .models import Profile, Image, Post, Comment, Chat, Message, Keyboard, Switches, Keycaps, ChatMembership, User

# Register your models here.

admin.site.register(Profile)
admin.site.register(Keyboard)
admin.site.register(Switches)
admin.site.register(Keycaps)
admin.site.register(Image)
admin.site.register(Post)
admin.site.register(Comment)
admin.site.register(Chat)
admin.site.register(Message)

class ChatMembershipInline(admin.TabularInline):
    model = ChatMembership
    extra = 0
    autocomplete_fields = ('user',)

class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'participants', 'created_by', 'created_at', 'dm_key')
    readonly_fields = ('created_at', 'dm_key')
    search_fields = ('memberships__user__username',)
    inlines = [ChatMembershipInline]

    def participants(self, obj):
        return ", ".join(obj.user.values_list('username', flat=True))

class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat', 'user', 'short', 'date')
    list_select_related = ('chat', 'user')
    search_fields = ('user__username', 'content')
    def short(self, obj):
        return (obj.content[:60] + 'É') if len(obj.content) > 60 else obj.content
