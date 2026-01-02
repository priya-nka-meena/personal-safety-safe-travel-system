from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SOSAlert
from .serializers import SOSAlertSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sos_alert_list_create(request):
    """
    GET: Retrieve all SOS alerts for the authenticated user
    POST: Create a new SOS alert
    """
    if request.method == 'GET':
        alerts = SOSAlert.objects.filter(user=request.user)
        serializer = SOSAlertSerializer(alerts, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = SOSAlertSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

