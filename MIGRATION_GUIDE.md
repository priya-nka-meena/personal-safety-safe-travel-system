# Django Migration Guide: SOSAlert User → Student Field Migration

## Why Django Keeps Asking for a Default

**Explanation:**
- Your existing `SOSAlert` model has a `user` field pointing to Django's default `User` model
- You're changing to `CustomUser` AND renaming the field to `student`
- Django sees existing database rows that have values in the old `user` field
- When creating the new `student` field, Django needs to know what value to assign to existing rows
- Since `student` is non-nullable, Django asks for a default value multiple times (once per migration operation)

---

## Step-by-Step Solution

### STEP 1: Make Student Field Temporarily Nullable
✅ **DONE** - The `student` field in `SOSAlert` model is now set to `null=True, blank=True`

**Why:** This allows Django to create the migration without needing a default value for existing rows.

---

### STEP 2: Delete Any Failed Migration Files (If They Exist)

**Check for new migration files:**
```bash
ls core/migrations/
```

**If you see files like `0002_*.py` or `0003_*.py` that were created during failed attempts:**
- **DELETE** any migration files numbered `0002_*.py`, `0003_*.py`, etc. (if they exist)
- **KEEP** `0001_initial.py` (the original migration)
- **KEEP** `__init__.py` (DO NOT DELETE THIS)

**Why:** Failed migration attempts create incomplete migration files that will cause conflicts.

---

### STEP 3: Create the Migration

Run:
```bash
python manage.py makemigrations
```

**Expected result:** Django should create a new migration file (e.g., `0002_*.py`) without asking for defaults.

**What this migration does:**
- Creates `CustomUser` model
- Creates other new models (StudentParentLink, TravelSession, LiveLocation)
- Adds new fields to `SOSAlert` (student, travel_session, latitude, longitude)
- The old `user` field will be removed in a later step

---

### STEP 4: Apply the Migration

Run:
```bash
python manage.py migrate
```

**Expected result:** Migration runs successfully. At this point:
- New models are created
- `SOSAlert.student` field exists but is NULL for existing rows
- Old `user` field still exists (we'll handle this next)

---

### STEP 5: Migrate Data Using Django Shell

**Open Django shell:**
```bash
python manage.py shell
```

**Run this script in the shell:**

```python
from core.models import SOSAlert, CustomUser
from django.contrib.auth import get_user_model

# Get all existing SOSAlert objects
alerts = SOSAlert.objects.all()

print(f"Found {alerts.count()} SOSAlert records to migrate")

# For each alert, try to find the corresponding CustomUser
migrated_count = 0
for alert in alerts:
    # Check if alert has the old 'user' attribute (via migration state)
    # We need to access the raw database value
    from django.db import connection
    
    # Get the old user_id from the database directly
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM core_sosalert WHERE id = %s", [alert.id])
        row = cursor.fetchone()
        if row and row[0]:
            old_user_id = row[0]
            
            # Try to find the CustomUser with this ID
            try:
                # Since we changed AUTH_USER_MODEL, the old User records should now be CustomUser
                custom_user = CustomUser.objects.get(id=old_user_id)
                
                # Update the student field
                alert.student = custom_user
                alert.save()
                migrated_count += 1
                print(f"Migrated alert {alert.id}: user {custom_user.username} → student {custom_user.username}")
            except CustomUser.DoesNotExist:
                print(f"Warning: Could not find CustomUser with ID {old_user_id} for alert {alert.id}")
        else:
            print(f"Warning: Alert {alert.id} has no user_id")

print(f"\nMigration complete! Migrated {migrated_count} out of {alerts.count()} alerts")
```

**Alternative simpler approach (if the above doesn't work):**

```python
from core.models import SOSAlert, CustomUser
from django.db import connection

# Get all alerts
alerts = SOSAlert.objects.all()
print(f"Found {alerts.count()} alerts")

# Access the database directly to get old user_id
migrated = 0
for alert in alerts:
    with connection.cursor() as cursor:
        # Check if 'user_id' column still exists
        cursor.execute("PRAGMA table_info(core_sosalert)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'user_id' in columns:
            cursor.execute("SELECT user_id FROM core_sosalert WHERE id = %s", [alert.id])
            row = cursor.fetchone()
            if row and row[0]:
                try:
                    user = CustomUser.objects.get(id=row[0])
                    alert.student = user
                    alert.save()
                    migrated += 1
                    print(f"✓ Migrated alert {alert.id}")
                except CustomUser.DoesNotExist:
                    print(f"✗ User {row[0]} not found for alert {alert.id}")
        else:
            print("user_id column not found - may have already been migrated")

print(f"\nCompleted: {migrated} alerts migrated")
```

**Exit shell:**
```python
exit()
```

---

### STEP 6: Verify Data Migration

**Check that all alerts have a student assigned:**
```bash
python manage.py shell
```

```python
from core.models import SOSAlert

# Count alerts without student
alerts_without_student = SOSAlert.objects.filter(student__isnull=True).count()
total_alerts = SOSAlert.objects.count()

print(f"Total alerts: {total_alerts}")
print(f"Alerts without student: {alerts_without_student}")

if alerts_without_student > 0:
    print("\n⚠️  WARNING: Some alerts don't have a student assigned!")
    print("You need to manually assign students to these alerts before proceeding.")
else:
    print("\n✓ All alerts have a student assigned. Safe to proceed!")
```

---

### STEP 7: Remove Nullable from Student Field

**Edit `core/models.py`:**

Find the `SOSAlert` model and change:
```python
student = models.ForeignKey(
    CustomUser,
    on_delete=models.CASCADE,
    related_name='sos_alerts',
    limit_choices_to={'role': 'STUDENT'},
    null=True,  # Remove this line
    blank=True  # Remove this line
)
```

To:
```python
student = models.ForeignKey(
    CustomUser,
    on_delete=models.CASCADE,
    related_name='sos_alerts',
    limit_choices_to={'role': 'STUDENT'}
)
```

---

### STEP 8: Create Final Migration

```bash
python manage.py makemigrations
```

**Django will ask:** "You are trying to change the nullable field 'student' on sosalert to non-nullable without a default"

**Answer:** `1` (to provide a one-off default)

**Then provide:** `1` (use the first CustomUser's ID as default - this is safe since we already migrated all data)

**OR** if you want to be more explicit, you can create a data migration instead (see Step 9).

---

### STEP 9 (Alternative): Create Data Migration to Remove Nullable

**Instead of Step 8, you can create a proper data migration:**

```bash
python manage.py makemigrations --empty core
```

**This creates a file like `0003_*.py`. Edit it:**

```python
from django.db import migrations

def ensure_all_alerts_have_student(apps, schema_editor):
    """Ensure all SOSAlert records have a student assigned"""
    SOSAlert = apps.get_model('core', 'SOSAlert')
    CustomUser = apps.get_model('core', 'CustomUser')
    
    # Get alerts without student
    alerts_without_student = SOSAlert.objects.filter(student__isnull=True)
    
    if alerts_without_student.exists():
        # Get first student user as fallback (or handle as needed)
        first_student = CustomUser.objects.filter(role='STUDENT').first()
        if first_student:
            alerts_without_student.update(student=first_student)
            print(f"Assigned {alerts_without_student.count()} alerts to fallback student")

def reverse_migration(apps, schema_editor):
    """Reverse migration - nothing to do"""
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0002_*'),  # Replace with your actual previous migration number
    ]

    operations = [
        migrations.RunPython(ensure_all_alerts_have_student, reverse_migration),
        migrations.AlterField(
            model_name='sosalert',
            name='student',
            field=models.ForeignKey(
                limit_choices_to={'role': 'STUDENT'},
                on_delete=models.CASCADE,
                related_name='sos_alerts',
                to='core.customuser'
            ),
        ),
    ]
```

---

### STEP 10: Apply Final Migration

```bash
python manage.py migrate
```

---

### STEP 11: Clean Up Old User Field (Optional)

**If the old `user` field column still exists in the database**, you can remove it:

```bash
python manage.py makemigrations --empty core
```

Edit the new migration file to add a `migrations.RemoveField` operation for the old `user` field.

**OR** leave it - it won't cause issues, and Django will ignore it.

---

## Summary Checklist

- [x] Step 1: Made `student` field nullable temporarily
- [ ] Step 2: Deleted failed migration files (if any)
- [ ] Step 3: Created migration (`makemigrations`)
- [ ] Step 4: Applied migration (`migrate`)
- [ ] Step 5: Migrated data using Django shell
- [ ] Step 6: Verified all alerts have students
- [ ] Step 7: Removed `null=True, blank=True` from model
- [ ] Step 8: Created final migration
- [ ] Step 9: Applied final migration
- [ ] Step 10: Tested admin panel and APIs

---

## Important Notes

1. **Backup your database** before running migrations if you have important data
2. **Keep `0001_initial.py`** - this is your original migration
3. **Keep `__init__.py`** - this is required for Python to recognize the directory as a package
4. **Test thoroughly** after each migration step
5. If you have many existing alerts, the data migration in Step 5 might take a moment

---

## Troubleshooting

**If makemigrations still asks for defaults:**
- Make sure `null=True, blank=True` are in the model
- Delete any incomplete migration files
- Try `python manage.py makemigrations --dry-run` to see what would be created

**If data migration fails:**
- Check that CustomUser records exist for the old User IDs
- You may need to create CustomUser records from old User records first
- Use `python manage.py shell` to inspect the database state

**If admin panel breaks:**
- Make sure all migrations are applied: `python manage.py migrate`
- Check that `AUTH_USER_MODEL = 'core.CustomUser'` is in settings.py
- Restart the Django development server

