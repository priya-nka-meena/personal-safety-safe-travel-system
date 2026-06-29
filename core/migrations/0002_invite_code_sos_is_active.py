import secrets

from django.db import migrations, models


def generate_invite_code():
    return secrets.token_hex(4).upper()


def populate_invite_codes(apps, schema_editor):
    CustomUser = apps.get_model('core', 'CustomUser')
    existing_codes = set(
        CustomUser.objects.exclude(invite_code__isnull=True)
        .exclude(invite_code='')
        .values_list('invite_code', flat=True)
    )
    for user in CustomUser.objects.filter(role='STUDENT', invite_code__isnull=True):
        code = generate_invite_code()
        while code in existing_codes:
            code = generate_invite_code()
        user.invite_code = code
        user.save(update_fields=['invite_code'])
        existing_codes.add(code)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='invite_code',
            field=models.CharField(blank=True, max_length=16, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='sosalert',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(populate_invite_codes, migrations.RunPython.noop),
    ]
