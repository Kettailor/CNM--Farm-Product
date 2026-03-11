from io import StringIO

import segno


def create_qr_svg(payload: str) -> str:
    qr = segno.make(payload, micro=False)
    out = StringIO()
    qr.save(out, kind="svg", scale=6)
    return out.getvalue()
