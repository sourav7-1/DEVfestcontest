# Password-protect a PDF (test fixture helper). Needs `pip install pypdf`.
# Usage: python scripts/encrypt-pdf.py <in.pdf> <out.pdf>   (removes <in.pdf>)
import os, sys
from pypdf import PdfReader, PdfWriter

src, dst = sys.argv[1], sys.argv[2]
w = PdfWriter(clone_from=PdfReader(src))
w.encrypt(user_password='secret', owner_password='owner', algorithm='AES-128')
with open(dst, 'wb') as f:
    w.write(f)
os.remove(src)
