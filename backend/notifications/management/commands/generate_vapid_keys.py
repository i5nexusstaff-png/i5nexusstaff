from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Generate VAPID key pair for Web Push notifications'

    def handle(self, *args, **options):
        try:
            from py_vapid import Vapid02
            import base64
        except ImportError:
            self.stderr.write('py-vapid not installed. Run: pip install pywebpush')
            return

        vapid = Vapid02()
        vapid.generate_keys()

        # Export public key as URL-safe base64
        pub  = vapid.public_key
        priv = vapid.private_key

        from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption
        pub_bytes  = pub.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
        priv_bytes = priv.private_bytes(Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption())

        pub_b64  = base64.urlsafe_b64encode(pub_bytes).rstrip(b'=').decode()
        priv_pem = priv_bytes.decode()

        self.stdout.write(self.style.SUCCESS('\n=== VAPID Keys Generated ===\n'))
        self.stdout.write('Add these to your backend .env:\n')
        self.stdout.write(f'VAPID_PUBLIC_KEY={pub_b64}\n')
        self.stdout.write(f'VAPID_PRIVATE_KEY={priv_pem.strip()}\n')
        self.stdout.write('VAPID_EMAIL=admin@yourdomain.com\n')
        self.stdout.write('\nAlso add to frontend .env:\n')
        self.stdout.write(f'VITE_VAPID_PUBLIC_KEY={pub_b64}\n')
