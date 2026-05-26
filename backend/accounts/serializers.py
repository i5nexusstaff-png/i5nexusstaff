from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CompanyProfile

User = get_user_model()


class CompanyProfileSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model  = CompanyProfile
        fields = [
            'id', 'company_name', 'logo', 'logo_url',
            'address', 'phone', 'email', 'website',
            'about', 'faq', 'privacy_policy', 'terms_conditions', 'disclaimer',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        try:
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        except Exception:
            return None


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id','username','email','first_name','last_name','full_name',
            'role','report_type','position','department','phone','employee_id','site_location',
            'site_lat','site_lng','profile_photo','date_joined_company',
            'is_active','password','date_joined',
        ]
        read_only_fields = ['date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserMiniSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id','full_name','role','report_type','position','department','profile_photo','employee_id','site_location']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
