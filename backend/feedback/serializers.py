from rest_framework import serializers
from .models import Feedback
from accounts.serializers import UserMiniSerializer


class FeedbackSerializer(serializers.ModelSerializer):
    from_user_detail = UserMiniSerializer(source='from_user', read_only=True)

    class Meta:
        model = Feedback
        fields = ['id','from_user','from_user_detail','category','subject',
                  'message','status','admin_reply','replied_at','created_at']
        read_only_fields = ['from_user','status','admin_reply','replied_at','created_at']
