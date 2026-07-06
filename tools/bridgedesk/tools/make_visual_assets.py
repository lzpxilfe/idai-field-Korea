"""Generate icons and screenshot-style documentation images."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    make_icon_assets()
    make_desktop_screenshot()
    make_tablet_screenshot()
    print("Visual assets generated.")


def make_icon_assets() -> None:
    icon_dir = ROOT / "assets" / "icons"
    tablet_icon_dir = ROOT / "tablet" / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    tablet_icon_dir.mkdir(parents=True, exist_ok=True)

    icon = Image.new("RGB", (512, 512), "#24445a")
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle((82, 92, 430, 420), radius=54, fill="#f6f7f2")
    draw.rectangle((132, 160, 380, 204), fill="#2f8f6b")
    draw.rectangle((132, 238, 380, 282), fill="#d8a63f")
    draw.rectangle((132, 316, 310, 360), fill="#6f8ea6")
    draw.text((166, 386), "BD", fill="#24445a", font=font(58, bold=True))

    icon.resize((192, 192), Image.Resampling.LANCZOS).save(tablet_icon_dir / "icon-192.png")
    icon.save(tablet_icon_dir / "icon-512.png")
    icon.save(icon_dir / "bridgedesk.ico", sizes=[(16, 16), (32, 32), (48, 48), (128, 128), (256, 256)])


def make_desktop_screenshot() -> None:
    out_dir = ROOT / "docs" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (1280, 800), "#f6f7f2")
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, 236, 800), fill="#172033")
    for index, label in enumerate(("Home", "Queue", "Review", "Settings")):
        y = 34 + index * 66
        draw.rounded_rectangle((24, y, 212, y + 44), radius=8, fill="#24445a" if index == 1 else "#24304a")
        draw.text((54, y + 11), label, fill="#ffffff", font=font(18))

    draw.text((276, 36), "BridgeDesk", fill="#172033", font=font(34, bold=True))
    draw.text((276, 82), "Excavation field records to HWP report draft", fill="#637083", font=font(18))

    metric_titles = [("태블릿 원본", "2건"), ("기록 항목", "4건"), ("HWP 초안", "준비됨")]
    for index, (title, value) in enumerate(metric_titles):
        x = 276 + index * 310
        draw_card(draw, (x, 126, x + 280, 212))
        draw.text((x + 22, 148), value, fill="#172033", font=font(28, bold=True))
        draw.text((x + 22, 184), title, fill="#637083", font=font(15))

    draw_card(draw, (276, 242, 1218, 412))
    draw.text((300, 262), "HWP 보고서 초안", fill="#172033", font=font(20, bold=True))
    preview_lines = [
        "월성 북편 발굴조사 현장기록 보고서 초안",
        "1. 조사 개요",
        "- 조사 구역: 3트렌치 북벽, 4트렌치 동측 확장부",
        "- 기록 항목 수: 4건",
    ]
    for index, line in enumerate(preview_lines):
        draw.text((300, 304 + index * 26), line, fill="#172033", font=font(18))

    draw_card(draw, (276, 444, 836, 742))
    draw.text((300, 464), "발굴 현장 기록", fill="#172033", font=font(20, bold=True))
    headers = ("출처", "위치", "항목", "상태")
    rows = (
        ("ARCH-001/E-001", "3트렌치", "북벽 3층 경계", "기록완료"),
        ("ARCH-001/E-002", "3트렌치", "수혈 SK-03", "추가확인"),
        ("ARCH-002/E-003", "4트렌치", "토기편 출토", "수습완료"),
    )
    draw_table(draw, 300, 506, headers, rows)

    draw_card(draw, (866, 444, 1218, 742))
    draw.text((890, 464), "선택 기록", fill="#172033", font=font(20, bold=True))
    detail = [
        ("조사 구역", "3트렌치 북벽"),
        ("상태", "기록완료"),
        ("현장 기록", "암갈색 사질점토층 확인"),
        ("반영 메모", "단면도에 3층 경계 표기"),
        ("자료 번호", "P-001, P-002, D-001"),
    ]
    for index, (key, value) in enumerate(detail):
        y = 510 + index * 38
        draw.text((890, y), key, fill="#637083", font=font(15, bold=True))
        draw.text((994, y), value, fill="#172033", font=font(15))

    image.save(out_dir / "desktop-report.png")


def make_tablet_screenshot() -> None:
    out_dir = ROOT / "docs" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (720, 1080), "#f6f7f2")
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, 720, 112), fill="#24445a")
    draw.text((28, 24), "BridgeDesk Arch Field", fill="#ffffff", font=font(30, bold=True))
    draw.text((30, 68), "임시저장 완료", fill="#d9e6ee", font=font(18))
    draw.rounded_rectangle((468, 28, 690, 82), radius=8, fill="#2f8f6b")
    draw.text((508, 44), "JSON 내보내기", fill="#ffffff", font=font(18, bold=True))

    draw_card(draw, (24, 138, 696, 392))
    draw.text((48, 164), "조사 정보", fill="#172033", font=font(24, bold=True))
    fields = [
        ("조사명", "월성 북편 발굴조사"),
        ("구역", "3트렌치 북벽"),
        ("기록자", "김조사"),
        ("조사 환경", "흐림, 약한 바람"),
        ("위치 메모", "경주시 인왕동 발굴조사 구역"),
    ]
    for index, (label, value) in enumerate(fields):
        y = 210 + index * 32
        draw.text((52, y), label, fill="#637083", font=font(16, bold=True))
        draw.text((160, y), value, fill="#172033", font=font(16))

    draw_card(draw, (24, 422, 696, 902))
    draw.text((48, 448), "현장 항목", fill="#172033", font=font(24, bold=True))
    draw.rounded_rectangle((532, 440, 672, 490), radius=8, fill="#24445a")
    draw.text((562, 454), "항목 추가", fill="#ffffff", font=font(16, bold=True))

    draw.rounded_rectangle((48, 518, 672, 862), radius=8, fill="#fbfcfd", outline="#cbd5e1", width=2)
    draw.text((72, 544), "항목 1", fill="#172033", font=font(20, bold=True))
    item_lines = [
        ("구분", "토층"),
        ("항목", "북벽 3층 경계"),
        ("상태", "기록완료"),
        ("기준고/관찰값", "GL-42cm, 암갈색 사질점토층"),
        ("현장 기록", "숯립과 소토립 소량 포함"),
        ("반영 메모", "단면도에 3층 경계 표기"),
        ("자료 번호", "P-001, P-002, D-001"),
    ]
    for index, (label, value) in enumerate(item_lines):
        y = 592 + index * 36
        draw.text((72, y), label, fill="#637083", font=font(16, bold=True))
        draw.text((220, y), value, fill="#172033", font=font(16))

    draw.rectangle((0, 990, 720, 1080), fill="#f6f7f2", outline="#cbd5e1")
    draw.rounded_rectangle((28, 1010, 342, 1064), radius=8, fill="#2f8f6b")
    draw.rounded_rectangle((378, 1010, 692, 1064), radius=8, fill="#24445a")
    draw.text((142, 1026), "임시저장", fill="#ffffff", font=font(18, bold=True))
    draw.text((500, 1026), "새 조사", fill="#ffffff", font=font(18, bold=True))

    image.save(out_dir / "tablet-input.png")


def draw_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    draw.rounded_rectangle(box, radius=8, fill="#ffffff", outline="#cbd5e1", width=2)


def draw_table(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    headers: tuple[str, ...],
    rows: tuple[tuple[str, ...], ...],
) -> None:
    widths = (128, 122, 138, 92)
    row_h = 36
    cursor = x
    for index, header in enumerate(headers):
        draw.rectangle((cursor, y, cursor + widths[index], y + row_h), fill="#edf2f7", outline="#cbd5e1")
        draw.text((cursor + 10, y + 9), header, fill="#172033", font=font(14, bold=True))
        cursor += widths[index]
    for row_index, row in enumerate(rows):
        cursor = x
        row_y = y + row_h * (row_index + 1)
        for col_index, value in enumerate(row):
            draw.rectangle((cursor, row_y, cursor + widths[col_index], row_y + row_h), fill="#ffffff", outline="#cbd5e1")
            draw.text((cursor + 10, row_y + 9), value, fill="#172033", font=font(13))
            cursor += widths[col_index]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


if __name__ == "__main__":
    main()
