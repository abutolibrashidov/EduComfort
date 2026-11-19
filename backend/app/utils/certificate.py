import os
import math
import uuid
from datetime import date
from PIL import Image, ImageDraw, ImageFont


# ─────────────────────────────────────────────────────────────────────
#  Font loader
# ─────────────────────────────────────────────────────────────────────

def _font(candidates, size):
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except IOError:
            pass
    return ImageFont.load_default()


def _load_fonts():
    reg  = ["arial.ttf",   "Arial.ttf"]
    bold = ["arialbd.ttf", "ariblk.ttf"]
    ital = ["arialbi.ttf", "Arial Bold Italic.ttf"]
    return {
        "logo_text": _font(bold,  72),
        "tagline":   _font(reg,   30),
        "congrats":  _font(bold,  44),
        "label":     _font(reg,   28),
        "name":      _font(ital,  80),
        "body":      _font(reg,   36),
        "body_sm":   _font(reg,   28),
        "badge_num": _font(bold, 100),
        "badge_lbl": _font(bold,  30),
        "footer":    _font(reg,   26),
    }


# ─────────────────────────────────────────────────────────────────────
#  Drawing helpers
# ─────────────────────────────────────────────────────────────────────

def _cx(draw_or_img, text, font, fill, cy, W):
    """Draw text horizontally centred at cy."""
    d = draw_or_img
    bb = d.textbbox((0, 0), text, font=font)
    tw = bb[2] - bb[0]
    d.text(((W - tw) // 2, cy), text, font=font, fill=fill)
    return bb[3] - bb[1]   # text height


def _gradient_bg(img, top, bottom):
    w, h = img.size
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (w, y)], fill=c)


def _star(draw, cx, cy, r_out, r_in, pts, fill, outline=None, lw=2):
    coords = []
    for i in range(pts * 2):
        angle = math.pi / pts * i - math.pi / 2
        r = r_out if i % 2 == 0 else r_in
        coords.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(coords, fill=fill)
    if outline:
        draw.polygon(coords, outline=outline, width=lw)


def _corner(draw, x, y, size, color, fx=False, fy=False):
    sx, sy = (-1 if fx else 1), (-1 if fy else 1)
    s = size
    draw.line([(x, y), (x + sx * s, y)], fill=color, width=3)
    draw.line([(x, y), (x, y + sy * s)], fill=color, width=3)
    draw.line([(x + sx * int(s*.6), y), (x + sx * int(s*.6), y + sy * int(s*.3))], fill=color, width=2)
    draw.line([(x, y + sy * int(s*.6)), (x + sx * int(s*.3), y + sy * int(s*.6))], fill=color, width=2)
    d = 6
    draw.polygon([(x, y-d), (x+d, y), (x, y+d), (x-d, y)], fill=color)


def _divider(draw, W, y, half_w, line_color, diamond_color):
    draw.line([(W//2 - half_w, y), (W//2 - 16, y)], fill=line_color, width=2)
    draw.line([(W//2 + 16, y), (W//2 + half_w, y)], fill=line_color, width=2)
    d = 7
    cx = W // 2
    draw.polygon([(cx, y-d), (cx+d, y), (cx, y+d), (cx-d, y)], fill=diamond_color)


# ─────────────────────────────────────────────────────────────────────
#  Rank metadata (Gold / Silver / Bronze)
# ─────────────────────────────────────────────────────────────────────

RANKS = {
    1: dict(outer=(212,175,55),  inner=(255,235,110), text=(80,50,5),   ribbon=(160,115,20), glow=(255,240,130), label="1-O'RIN"),
    2: dict(outer=(160,160,175), inner=(220,220,235), text=(40,40,60),  ribbon=(110,110,130),glow=(210,210,230), label="2-O'RIN"),
    3: dict(outer=(180,110,60),  inner=(230,160,90),  text=(65,30,5),   ribbon=(130,75,25),  glow=(230,170,100), label="3-O'RIN"),
}

def _rank_meta(rank):
    return RANKS.get(rank, dict(
        outer=(70,140,220), inner=(140,190,255), text=(15,35,100),
        ribbon=(45,95,175), glow=(155,195,255),  label=f"{rank}-O'RIN"
    ))


# ─────────────────────────────────────────────────────────────────────
#  Logo loader  (white-bg JPG → RGBA transparent)
# ─────────────────────────────────────────────────────────────────────

def _load_logo():
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.abspath(os.path.normpath(
        os.path.join(here, "..", "..", "..", "frontend", "public", "logo.jpg")
    ))
    if not os.path.exists(path):
        print(f"[cert] logo not found at: {path}")
        return None
    try:
        # Open as RGB first (JPEG has no alpha channel)
        logo_rgb = Image.open(path).convert("RGB")
        # Build alpha mask: bright (white) pixels → transparent
        lum = logo_rgb.convert("L")
        alpha_mask = lum.point(lambda v: max(0, 255 - v))
        # Merge RGB + alpha into RGBA
        logo_rgba = logo_rgb.convert("RGBA")
        logo_rgba.putalpha(alpha_mask)
        return logo_rgba
    except Exception as e:
        print(f"[cert] logo load failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────────────

def generate_certificate(student_name: str, rank: int, group_name: str, total_points: int) -> str:
    os.makedirs("uploads/certificates", exist_ok=True)

    W, H = 1400, 1050
    fonts = _load_fonts()
    meta  = _rank_meta(rank)

    GOLD      = (212, 175,  55)
    GOLD_LT   = (255, 223, 100)
    GOLD_DK   = (158, 118,  18)
    NEAR_WHITE= (220, 230, 255)
    LIGHT_BLU = (180, 200, 240)
    PALE_BLUE = (140, 165, 215)

    # ── 1. Background gradient ──────────────────────────────────────────
    img = Image.new("RGB", (W, H))
    _gradient_bg(img, (8, 20, 60), (20, 45, 115))
    draw = ImageDraw.Draw(img)

    # ── 2. Gold border (triple line) ───────────────────────────────────
    for margin, color, lw in [(12, GOLD_DK, 4), (20, GOLD, 6), (30, GOLD_LT, 2), (34, GOLD_DK, 1)]:
        draw.rectangle([margin, margin, W - margin, H - margin], outline=color, width=lw)

    # ── 3. Corner ornaments ────────────────────────────────────────────
    for fx, fy, ox, oy in [(False,False,55,55),(True,False,W-55,55),(False,True,55,H-55),(True,True,W-55,H-55)]:
        _corner(draw, ox, oy, 55, GOLD, fx, fy)

    # ── 4. LOGO in top-centre ──────────────────────────────────────────
    logo_area_top  = 52
    logo_area_h    = 140
    logo_area_bot  = logo_area_top + logo_area_h

    logo = _load_logo()
    if logo:
        lw_orig, lh_orig = logo.size
        scale = (logo_area_h - 10) / lh_orig
        lw_s  = int(lw_orig * scale)
        lh_s  = logo_area_h - 10
        # cap width so it doesn't overflow
        if lw_s > W - 200:
            lw_s = W - 200
            lh_s = int(lh_orig * lw_s / lw_orig)
        logo_r = logo.resize((lw_s, lh_s), Image.LANCZOS)
        lx = (W - lw_s) // 2
        ly = logo_area_top + (logo_area_h - lh_s) // 2
        img.paste(logo_r, (lx, ly), logo_r)
        draw = ImageDraw.Draw(img)
    else:
        # Fallback text
        _cx(draw, "EDU COMFORT", fonts["logo_text"], GOLD_LT, logo_area_top + 30, W)

    # Thin gold line under logo area
    draw.line([(48, logo_area_bot), (W-48, logo_area_bot)], fill=GOLD, width=2)

    # ── 5. Tagline ─────────────────────────────────────────────────────
    tagline_y = logo_area_bot + 14
    _cx(draw, "M U V A F F A Q I Y A T   S E R T I F I K A T I", fonts["tagline"], NEAR_WHITE, tagline_y, W)

    # ── 6. Divider ─────────────────────────────────────────────────────
    div1_y = tagline_y + 48
    _divider(draw, W, div1_y, 560, GOLD_DK, GOLD)

    # ── 7. CONGRATULATIONS from EduComfort ────────────────────────────
    congrats_y = div1_y + 20
    _cx(draw, "EduComfort sizni tabriklaidi!", fonts["congrats"], GOLD_LT, congrats_y, W)

    # ── 8. "Ushbu sertifikat" label ────────────────────────────────────
    cert_label_y = congrats_y + 68
    _cx(draw, "Ushbu sertifikat", fonts["label"], PALE_BLUE, cert_label_y, W)

    # Small divider under label
    _divider(draw, W, cert_label_y + 40, 300, GOLD_DK, GOLD)

    # ── 9. Student Name ────────────────────────────────────────────────
    name_y = cert_label_y + 55
    name_h = _cx(draw, student_name, fonts["name"], GOLD_LT, name_y, W)

    # Underline name
    bb_name = draw.textbbox((0,0), student_name, font=fonts["name"])
    nw = bb_name[2] - bb_name[0]
    nx = (W - nw) // 2
    draw.line([(nx, name_y + name_h + 4), (nx + nw, name_y + name_h + 4)], fill=GOLD_DK, width=2)

    # ── 10. Group + rank text ──────────────────────────────────────────
    body_y = name_y + name_h + 22
    _cx(draw, f"{group_name} guruhida", fonts["body"], LIGHT_BLU, body_y, W)
    body_y += 50
    _cx(draw, f"{rank}-o'rinni egalladi", fonts["body"], GOLD_LT, body_y, W)

    # ── 11. Points pill badge ──────────────────────────────────────────
    pts_y = body_y + 60
    pts_text = f"  {total_points} ball  "
    bb_pts = draw.textbbox((0,0), pts_text, font=fonts["body"])
    pw = bb_pts[2] - bb_pts[0] + 40
    ph = bb_pts[3] - bb_pts[1] + 20
    px = (W - pw) // 2
    draw.rounded_rectangle([px, pts_y, px+pw, pts_y+ph], radius=ph//2, fill=(15,40,110), outline=GOLD, width=2)
    _cx(draw, pts_text, fonts["body"], GOLD_LT, pts_y + 8, W)

    # ── 12. Star row ───────────────────────────────────────────────────
    stars_y = pts_y + ph + 24
    for i, sx in enumerate([W//2 - 130, W//2 - 65, W//2, W//2 + 65, W//2 + 130]):
        big = (i == 2)
        _star(draw, sx, stars_y + (0 if big else 6), 22 if big else 14, 10 if big else 6, 5,
              fill=GOLD if big else GOLD_DK)

    # ── 13. Medal on the left ──────────────────────────────────────────
    mcx, mcy = 200, 600
    mr = 100

    # Glow rings (solid color only — RGB canvas doesn't support alpha in draw)
    for ro in range(30, 0, -5):
        bright = int(40 * (1 - ro/30))  # 0-40 range for rgb component
        g_col = tuple(min(255, c + bright) for c in meta["glow"][:3])  # lighten glow color
        draw.ellipse([mcx-mr-ro, mcy-mr-ro, mcx+mr+ro, mcy+mr+ro],
                     outline=g_col, width=1)

    draw.ellipse([mcx-mr, mcy-mr, mcx+mr, mcy+mr], fill=meta["outer"], outline=GOLD_LT, width=4)
    draw.ellipse([mcx-mr+10, mcy-mr+10, mcx+mr-10, mcy+mr-10], fill=meta["inner"], outline=GOLD, width=2)
    _star(draw, mcx, mcy-8, 52, 23, 5, fill=meta["outer"], outline=GOLD_DK, lw=2)

    # Rank number
    bb_rn = draw.textbbox((0,0), str(rank), font=fonts["badge_num"])
    rnw = bb_rn[2] - bb_rn[0]; rnh = bb_rn[3] - bb_rn[1]
    draw.text((mcx - rnw//2, mcy - rnh//2 - 18), str(rank), font=fonts["badge_num"], fill=meta["text"])

    # Rank label  below number
    bb_rl = draw.textbbox((0,0), meta["label"], font=fonts["badge_lbl"])
    rlw = bb_rl[2] - bb_rl[0]
    draw.text((mcx - rlw//2, mcy + 60), meta["label"], font=fonts["badge_lbl"], fill=meta["text"])

    # Ribbon
    rib_y = mcy + mr + 6
    draw.polygon([
        (mcx-55, rib_y), (mcx+55, rib_y),
        (mcx+70, rib_y+50), (mcx, rib_y+38), (mcx-70, rib_y+50)
    ], fill=meta["ribbon"])

    # Vertical separator left-of-content
    sep_x = 340
    draw.line([(sep_x, div1_y + 10), (sep_x, H - 100)], fill=GOLD_DK, width=1)

    # ── 14. Footer ────────────────────────────────────────────────────
    footer_y = H - 130
    today_str = date.today().strftime("%d.%m.%Y")

    for (fx, lbl) in [(W//2 - 230, "O'qituvchi"), (W//2 + 230, today_str)]:
        draw.line([(fx - 90, footer_y), (fx + 90, footer_y)], fill=GOLD_DK, width=2)
        bb_f = draw.textbbox((0,0), lbl, font=fonts["footer"])
        fw = bb_f[2] - bb_f[0]
        draw.text((fx - fw//2, footer_y + 8), lbl, font=fonts["footer"], fill=PALE_BLUE)

    # Bottom divider + fine print
    _divider(draw, W, H - 68, 560, GOLD_DK, GOLD)
    fine = "EduComfort — Ta'lim sifatini baholash tizimi"
    bb_fi = draw.textbbox((0,0), fine, font=fonts["footer"])
    fw_fi = bb_fi[2] - bb_fi[0]
    draw.text(((W - fw_fi)//2, H - 56), fine, font=fonts["footer"], fill=(100, 120, 170))

    # ── 15. Save ──────────────────────────────────────────────────────
    filename = f"cert_{uuid.uuid4().hex}.jpg"
    filepath = os.path.join("uploads", "certificates", filename)
    img.save(filepath, quality=97)
    return f"/{filepath.replace(os.sep, '/')}"
