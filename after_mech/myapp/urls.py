from django.urls import path

from . import views

def ping(request):
    return JsonResponse({"status": "ok"})

app_name = "myapp"

urlpatterns = [
    path("", views.index, name="index"),
    path("auth/session", views.session, name="session"),
    path("verify_email/<uidb64>/<token>/", views.verify_email, name="verify_email"),
    path("resend_verification_email", views.resend_verification_email, name="resend_verification_email"),

    path("home", views.home, name="home"),
    path("market", views.market, name="market"),
    path("logout", views.logout_view, name="logout"),

    path("profile/<str:profile>", views.profile, name="profile"),
    path("profile_search", views.profile_search, name="profile_search"),


    # POST
    path("post", views.create_post, name="create_post"),
    path("post/<int:post_id>/like", views.like_toggle, name="like_toggle"),
    path("post/<int:post_id>/delete", views.delete_post, name="delete"),
    path("post/<int:post_id>/partial", views.post_partial, name="post_partial"),
    path("post/<int:post_id>/update", views.update_post, name="update_post"),


    path("comment", views.comment, name="comment"),
    path("comment/<int:comment_id>/edit", views.edit_comment, name="edit_comment"),
    path("comment/<int:comment_id>/delete", views.delete_comment, name="delete_comment"),


    # CHAT 
    path("messenger/unread_counts", views.unread_counts, name="unread_counts"),
    path("messenger/mark_read", views.mark_read, name="mark_read"),
    path("chat", views.chat, name="chat"),
    path("chat/ensure", views.ensure_chat , name="ensure_chat"),
    path("chat/update", views.update_chat, name="update_chat"),
    path("chat/<int:chat_id>/mute_chat", views.mute_chat, name="mute_chat"),


    # NAV_BAR
    path("about", views.about, name="about"),
    path("help", views.help, name="help"),
    path("privacy", views.privacy, name="privacy"),
    path("imprint", views.imprint, name="imprint"),
    path("terms", views.terms, name="terms"),
    path("guidelines", views.guidelines, name="guidelines"),
    path("copyright", views.copyright, name="copyright"),
 

    #   SETTINGS
    path("settings", views.user_settings, name="user_settings"),
    path("settings/password", views.change_password, name="change_password"),
    path("settings/delete_account", views.delete_account, name="delete_account"),
    path("settings/send_verification_email", views.settings_send_verification_email, name="settings_send_verification_email"),
    path("settings/reauth", views.reauth, name="reauth"),


    #   PASSWORD RESET
    path("accounts/reset/<uidb64>/<token>/", views.IndexPasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
