# pdfmake Margins Reference

All margins use `[left, top, right, bottom]` format in points (1pt = 1/72 inch).

## Page Margins (line 2075)

| Condition | Left | Top | Right | Bottom |
|-----------|------|-----|-------|--------|
| Default | 60 | 36 | 60 | 36 |
| Header on all pages | 60 | 130 | 60 | 36 |

## Header

**Custom header image** (line 1819): `[0, 0, 0, 15]`
- Overridden on all pages → `[0, 36, 0, 15]`

**Default header** (line 1823): `[72, 0, 72, 0]`
- Overridden on all pages → `[72, 36, 72, 0]`

**Default header internals:**
- Left logo column: `[0, 0, 2, 0]`
- Right logo column: `[2, 0, 0, 0]`
- Center text column: `[2, 0, 2, 15]`
- Logo images: `[0, 5, 0, 0]`
- Logo placeholder text: `[0, 10, 0, 0]`
- Agency text lines (4 lines): `[0, 0, 0, 1]` each
- Last line (San Fernando): `[0, 0, 0, 8]`

## Content Sections

| Element | Margin | Line |
|---------|--------|------|
| Report title | `[0, 0, 0, 5]` | 1896 |
| Date range | `[0, 0, 0, 30]` | 1902 |
| Task section wrapper | `[0, 0, 0, 10]` | 1952 |
| Date header | `[0, 0, 0, 5]` | 1958 |
| First event line | `[20, 0, 0, 15]` | 1960 |
| Each activity | `[0, 10, 0, 20]` | 1977 |
| Each event | `[0, 0, 0, 10]` | 1971 |

## Signatory (single column, line 2021)

| Element | Margin | Line |
|---------|--------|------|
| Title | `[0, 0, 0, 15]` | 2007 |
| Name | `[0, 10, 0, 0]` | 2008 |
| Position | `[0, 5, 0, 0]` | 2009 |
| Wrapper | `[0, 0, 0, 30]` | 2021 |

## Signatory (two column, line 2040)

Same per-element margins as single column. Wrapper: `[0, 0, 0, 30]`

## Spacers

| Element | Margin | Line |
|---------|--------|------|
| Spacer before signatory | `[0, 40, 0, 0]` | 2048 |
| Spacer (alternative) | `[0, 40, 0, 0]` | 2058 |

## Footer

| Element | Margin | Line |
|---------|--------|------|
| Left column text | `[60, 0, 0, 10]` | 2090 |
| Right column text | `[0, 0, 60, 10]` | 2096 |
