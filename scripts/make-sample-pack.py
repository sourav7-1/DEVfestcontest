# Step 2 of the generator: password-protect the ISO cert and zip the pack. Needs `pip install pypdf`.
import os, zipfile
from pypdf import PdfReader, PdfWriter

d = 'sample-pack/documents'
w = PdfWriter(clone_from=PdfReader(f'{d}/_iso_plain.pdf'))
w.encrypt(user_password='bv2026', owner_password='bv-owner', algorithm='AES-128')
with open(f'{d}/ISO_9001_certificate.pdf', 'wb') as f:
    w.write(f)
os.remove(f'{d}/_iso_plain.pdf')
with zipfile.ZipFile('sample-pack.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for r, _, fs in os.walk('sample-pack'):
        for n in fs:
            p = os.path.join(r, n)
            z.write(p, os.path.relpath(p, 'sample-pack'))
print('zipped')
