"""Generate icons and screenshot-style documentation images."""

from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Pillow is required to generate BridgeDesk visual assets. "
        "Install it with: python -m pip install Pillow"
    ) from exc


ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    make_icon_assets()
    make_readme_field_desktop_screenshot()
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


def make_readme_field_desktop_screenshot() -> None:
    out_dir = ROOT.parent.parent / "docs" / "korean-fieldwork" / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (1280, 720), "#f3f6f8")
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, 1280, 58), fill="#24323a")
    draw.text((32, 18), "Field Desktop - 한국 현장기록 검토", fill="#ffffff", font=font(22, bold=True))
    draw.text((920, 22), "프로젝트: 하남 교산 3구역  |  조사일: 2026-07-09", fill="#f5fbff", font=font(14))

    draw.rectangle((0, 58, 280, 720), fill="#ffffff", outline="#d4dde6")
    draw.text((30, 88), "현장 자료", fill="#0f172a", font=font(22, bold=True))
    sidebar_items = [
        ("T1", "트렌치 T1", "기준층 4, 사진 18", "#2b7a78"),
        ("F", "유구 pit-001", "원형 수혈, 보고서 확인", "#8a5a35"),
        ("L", "토층 2층", "먼셀 후보 검토 필요", "#a16b38"),
        ("P", "토층사진 12", "스포이드 점 3개", "#3b6fb6"),
        ("M", "야장 메모", "손글씨 전사 필요", "#667085"),
    ]
    for index, (badge, title, subtitle, color) in enumerate(sidebar_items):
        y = 126 + index * 78
        if index == 1:
            draw.rounded_rectangle((14, y - 8, 263, y + 58), radius=7, fill="#edf7f3", outline="#b6d8ce")
        draw.ellipse((29, y, 67, y + 38), fill=color)
        draw.text((41, y + 9), badge, fill="#ffffff", font=font(14, bold=True))
        draw.text((82, y + 1), title, fill="#0f172a", font=font(18, bold=True))
        draw.text((82, y + 28), subtitle, fill="#475569", font=font(13))

    draw_card(draw, (304, 84, 736, 687))
    draw.text((332, 114), "선택 기록", fill="#0f172a", font=font(22, bold=True))
    draw.text((336, 152), "유구 pit-001", fill="#6b3f20", font=font(28, bold=True))
    draw.text((334, 190), "원형 수혈, 암갈색 매몰토. 현장 태블릿에서 사진,", fill="#1e293b", font=font(15))
    draw.text((334, 214), "토층색, 야장 메모가 함께 올라왔습니다.", fill="#1e293b", font=font(15))

    draw.rounded_rectangle((330, 263, 693, 475), radius=6, fill="#f8fafc", outline="#cbd5e1")
    draw.text((354, 283), "토층사진 12 · 스포이드 위치", fill="#0f172a", font=font(17, bold=True))
    draw.rectangle((350, 313, 673, 454), fill="#d8c2a2")
    for line_y in (350, 396, 430):
        draw.line((350, line_y, 673, line_y - 16), fill="#6b4d36", width=3)
    draw.rectangle((552, 356, 626, 412), fill="#8b6847")
    for number, point in enumerate(((443, 354), (577, 379), (499, 423)), start=1):
        x, y = point
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill="#ffffff", outline="#2563eb", width=2)
        draw.text((x - 4, y - 7), str(number), fill="#2563eb", font=font(11, bold=True))
    draw.text((352, 461), "1층 10YR 4/3  |  2층 7.5YR 4/4  |  3층 GLEY 1 5/N", fill="#334155", font=font(13))

    draw.text((332, 505), "마감 전 확인", fill="#0f172a", font=font(18, bold=True))
    draw.rounded_rectangle((330, 535, 692, 579), radius=6, fill="#fff7ed", outline="#fdba74")
    draw.text((353, 551), "먼셀 후보 10YR 4/3, 7.5YR 4/4 검토", fill="#9a3412", font=font(14))
    draw.rounded_rectangle((330, 590, 692, 633), radius=6, fill="#fff1f2", outline="#fecdd3")
    draw.text((353, 606), "사진 표시 설명을 description에 옮기기", fill="#991b1b", font=font(14))

    draw_card(draw, (760, 84, 1253, 687))
    draw.text((789, 114), "보고서/HWP 복사", fill="#0f172a", font=font(22, bold=True))
    draw.text((789, 144), "필요한 줄만 복사해 HWP에 붙여넣습니다.", fill="#334155", font=font(14))
    draw.text((789, 165), "복사는 일반 텍스트라 문서 양식이 덜 흐트러집니다.", fill="#334155", font=font(14))

    copy_blocks = [
        ("본문 복사", "원형 수혈, 암갈색 매몰토, 토층 3개 관찰.", "#2b7a78"),
        ("복사", "요약, 근거 자료, 확인 항목을 함께 복사한다.", "#334155"),
        ("근거 복사", "사진 12, 도면 3, 스포이드 3점을 근거로 옮긴다.", "#334155"),
        ("확인 복사", "먼셀 후보 검토, 사진 설명 정리, 야장 전사 확인.", "#334155"),
    ]
    for index, (button_label, text, button_color) in enumerate(copy_blocks):
        y = 202 + index * 92
        draw.rounded_rectangle((786, y, 1207, y + 72), radius=6, fill="#f8fafc", outline="#cbd5e1")
        draw.text((809, y + 18), button_label, fill="#0f172a", font=font(16, bold=True))
        draw.text((809, y + 48), text, fill="#334155", font=font(13))
        draw_button(draw, (1130, y + 18, 1183, y + 50), "복사", button_color)

    draw.rounded_rectangle((786, 592, 1207, 646), radius=6, fill="#ecfdf3", outline="#bbf7d0")
    draw.text((808, 610), "태블릿 입력과 데스크톱 화면이 같은 규칙을 씁니다.", fill="#166534", font=font(13, bold=True))
    draw.text((808, 630), "토층사진, 먼셀 후보, 스포이드 위치, 야장 메모가 함께 도착합니다.", fill="#166534", font=font(12))

    image.save(out_dir / "readme-field-desktop-hwp-copy.png")


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
    draw_button(draw, (1026, 258, 1112, 294), "초안 복사")
    draw_button(draw, (1122, 258, 1194, 294), "표 복사")
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
    draw_button(draw, (1030, 460, 1112, 496), "기록 복사")
    draw_button(draw, (1122, 460, 1194, 496), "표 행")
    detail = [
        ("조사 구역", "3트렌치 북벽"),
        ("상태", "기록완료"),
        ("현장 기록", "암갈색 사질점토층 확인"),
        ("반영 메모", "단면도에 3층 경계 표기"),
        ("자료 번호", "P-001, P-002, D-001"),
    ]
    for index, (key, value) in enumerate(detail):
        y = 516 + index * 32
        draw.text((890, y), key, fill="#637083", font=font(15, bold=True))
        draw.text((994, y), value, fill="#172033", font=font(15))

    draw.text((890, 684), "HWP 붙여넣기 미리보기", fill="#637083", font=font(14, bold=True))
    draw.text((890, 708), "3트렌치 북벽 - 토층 / 북벽 3층 경계", fill="#172033", font=font(13))

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


def draw_button(draw: ImageDraw.ImageDraw,
                box: tuple[int, int, int, int],
                label: str,
                fill: str = "#24445a") -> None:
    draw.rounded_rectangle(box, radius=8, fill=fill)
    draw.text((box[0] + 12, box[1] + 9), label, fill="#ffffff", font=font(12, bold=True))


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
