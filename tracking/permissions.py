from rest_framework import permissions
from core.models import StudentParentLink


class IsSessionParticipant(permissions.BasePermission):
    """
    Permission class to ensure only the session's student or linked parent can access session data.
    """
    def has_object_permission(self, request, view, obj):
        # obj is expected to be a TravelSession instance
        print(f"[IsSessionParticipant] request.user.id: {request.user.id}")
        print(f"[IsSessionParticipant] request.user.role: {request.user.role}")
        print(f"[IsSessionParticipant] session.student.id: {obj.student.id}")
        print(f"[IsSessionParticipant] session.student: {obj.student}")
        print(f"[IsSessionParticipant] session.parent: {obj.parent}")
        
        if not request.user.is_authenticated:
            print(f"[IsSessionParticipant] DENIED: User not authenticated")
            return False
        
        # Student can access their own sessions
        if obj.student == request.user:
            print(f"[IsSessionParticipant] GRANTED: User is the session student")
            return True
        
        # Linked parent can access the session (check StudentParentLink table)
        if request.user.role == 'PARENT':
            linked_parents = list(StudentParentLink.objects.filter(
                student=obj.student
            ).values_list('parent_id', flat=True))
            print(f"[IsSessionParticipant] Linked parent IDs for student {obj.student.id}: {linked_parents}")
            print(f"[IsSessionParticipant] Checking if parent {request.user.id} is linked")
            
            if StudentParentLink.objects.filter(
                student=obj.student,
                parent=request.user
            ).exists():
                print(f"[IsSessionParticipant] GRANTED: User is a linked parent")
                return True
            else:
                print(f"[IsSessionParticipant] DENIED: Parent not linked to student")
        
        print(f"[IsSessionParticipant] DENIED: User is neither student nor linked parent")
        return False
