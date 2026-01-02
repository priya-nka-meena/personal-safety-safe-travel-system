from rest_framework import serializers
from .models import SOSAlert


class SOSAlertSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = SOSAlert
        fields = ['id', 'user', 'user_id', 'location', 'description', 'danger_level', 'timestamp']
        read_only_fields = ['id', 'timestamp']

