"""
Django Shell Script: Migrate SOSAlert data from 'user' to 'student'

Run this in Django shell: python manage.py shell < migrate_sos_data.py
Or copy-paste into: python manage.py shell
"""

from core.models import SOSAlert, CustomUser
from django.db import connection
from django.db import models

def migrate_sos_alerts():
    """Migrate existing SOSAlert records from user field to student field"""
    
    print("=" * 60)
    print("SOSAlert Data Migration: user → student")
    print("=" * 60)
    
    # Get all alerts
    alerts = SOSAlert.objects.all()
    total_count = alerts.count()
    
    if total_count == 0:
        print("No SOSAlert records found. Nothing to migrate.")
        return
    
    print(f"\nFound {total_count} SOSAlert record(s) to migrate\n")
    
    # Check database structure
    db_backend = connection.vendor  # 'sqlite', 'postgresql', 'mysql', etc.
    
    # Get table info - database-agnostic approach
    with connection.cursor() as cursor:
        # Get column names - use appropriate method for each database
        if db_backend == 'sqlite':
            # SQLite: Use PRAGMA
            cursor.execute("PRAGMA table_info(core_sosalert)")
            columns = {col[1]: col for col in cursor.fetchall()}  # col[1] is column name
            column_names = list(columns.keys())
        else:
            # PostgreSQL/MySQL: Use Django introspection
            table_name = SOSAlert._meta.db_table
            columns_info = connection.introspection.get_table_description(cursor, table_name)
            column_names = [col[0] for col in columns_info]
            columns = {name: None for name in column_names}  # For consistency
        
        print("Available columns in core_sosalert:")
        for col_name in column_names:
            print(f"  - {col_name}")
        print()
        
        migrated_count = 0
        skipped_count = 0
        error_count = 0
        
        # Check if old 'user_id' column exists
        if 'user_id' in column_names:
            print("✓ Found 'user_id' column - migrating data...\n")
            
            for alert in alerts:
                try:
                    # Get the old user_id from database (database-agnostic parameter style)
                    if db_backend == 'sqlite':
                        cursor.execute("SELECT user_id FROM core_sosalert WHERE id = ?", [alert.id])
                    else:
                        cursor.execute("SELECT user_id FROM core_sosalert WHERE id = %s", [alert.id])
                    row = cursor.fetchone()
                    
                    if row and row[0]:
                        old_user_id = row[0]
                        
                        # Try to find the corresponding CustomUser
                        # Since AUTH_USER_MODEL changed, old User IDs should map to CustomUser IDs
                        try:
                            # First, try direct ID match (if User data was migrated to CustomUser)
                            custom_user = CustomUser.objects.get(id=old_user_id)
                            
                            # Update the alert
                            alert.student = custom_user
                            alert.save()
                            
                            migrated_count += 1
                            print(f"✓ Alert {alert.id}: Migrated user_id {old_user_id} → student {custom_user.username} (ID: {custom_user.id})")
                            
                        except CustomUser.DoesNotExist:
                            # User with this ID doesn't exist in CustomUser
                            # This might happen if User data wasn't migrated
                            print(f"⚠ Alert {alert.id}: CustomUser with ID {old_user_id} not found")
                            
                            # Try to find by username (if you have a mapping)
                            # Or create a fallback student
                            try:
                                # Get username from old auth_user table if it exists
                                if db_backend == 'sqlite':
                                    cursor.execute("SELECT username FROM auth_user WHERE id = ?", [old_user_id])
                                else:
                                    cursor.execute("SELECT username FROM auth_user WHERE id = %s", [old_user_id])
                                user_row = cursor.fetchone()
                                
                                if user_row:
                                    old_username = user_row[0]
                                    # Try to find CustomUser by username
                                    custom_user = CustomUser.objects.get(username=old_username)
                                    alert.student = custom_user
                                    alert.save()
                                    migrated_count += 1
                                    print(f"✓ Alert {alert.id}: Found by username '{old_username}' → student {custom_user.username}")
                                else:
                                    error_count += 1
                                    print(f"✗ Alert {alert.id}: Cannot find user {old_user_id} or username")
                            except Exception as e:
                                error_count += 1
                                print(f"✗ Alert {alert.id}: Error - {str(e)}")
                    else:
                        skipped_count += 1
                        print(f"⚠ Alert {alert.id}: No user_id found")
                        
                except Exception as e:
                    error_count += 1
                    print(f"✗ Alert {alert.id}: Migration error - {str(e)}")
        
        elif 'student_id' in column_names:
            # Check if student_id already has values
            cursor.execute("SELECT COUNT(*) FROM core_sosalert WHERE student_id IS NOT NULL")
            has_students = cursor.fetchone()[0]
            
            if has_students > 0:
                print("✓ 'student_id' column exists and has data - migration may already be complete")
                print(f"  Found {has_students} alerts with student_id assigned")
            else:
                print("⚠ 'student_id' column exists but is empty")
                print("  You may need to manually assign students to alerts")
        else:
            print("⚠ Neither 'user_id' nor 'student_id' column found")
            print("  Database structure may be different than expected")
    
    print("\n" + "=" * 60)
    print("Migration Summary:")
    print(f"  Total alerts: {total_count}")
    print(f"  ✓ Migrated: {migrated_count}")
    print(f"  ⚠ Skipped: {skipped_count}")
    print(f"  ✗ Errors: {error_count}")
    print("=" * 60)
    
    # Final check
    alerts_without_student = SOSAlert.objects.filter(student__isnull=True).count()
    if alerts_without_student > 0:
        print(f"\n⚠️  WARNING: {alerts_without_student} alert(s) still don't have a student assigned!")
        print("   You must assign students to these alerts before making the field non-nullable.")
    else:
        print("\n✓ SUCCESS: All alerts have a student assigned!")
        print("   You can now proceed to remove null=True from the student field.")

if __name__ == '__main__':
    migrate_sos_alerts()

