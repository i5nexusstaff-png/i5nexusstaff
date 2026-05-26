from rest_framework import serializers
from .models import Offer


class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ['id', 'title', 'description', 'reward', 'emoji', 'color_theme', 'priority', 'is_active', 'created_at', 'expires_at']
        read_only_fields = ['created_at']
