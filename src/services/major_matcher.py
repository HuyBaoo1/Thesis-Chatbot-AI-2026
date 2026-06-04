import re
import unicodedata

from src.models.enums import MajorType
from src.models.major import Major

COMMON_MAJOR_ALIASES_BY_CODE: dict[str, set[str]] = {
    "md": {"bac si y khoa", "y khoa", "doctor of medicine"},
    "nur": {"dieu duong", "nursing"},
    "ds": {"khoa hoc du lieu", "data science"},
    "cs": {"khoa hoc may tinh", "computer science"},
    "econ": {"kinh te hoc", "economics"},
    "me": {"ky thuat co khi", "co khi", "mechanical engineering"},
    "ece": {"ky thuat dien va may tinh", "electrical and computer engineering"},
    "hm": {"quan tri khach san", "hospitality management"},
    "bba": {"quan tri kinh doanh", "business administration"},
    "psy": {"tam ly hoc", "psychology"},
    "mmc": {"truyen thong da phuong tien", "multimedia communications"},
    "gme": {"bac si noi tru", "graduate medical education"},
    "mnur": {"thac si dieu duong", "master of nursing"},
    "msc cs": {"thac si khoa hoc may tinh", "master of computer science"},
    "msc me": {"thac si ky thuat co khi", "master of mechanical engineering"},
    "msc ee": {"thac si ky thuat dien", "master of electrical engineering"},
    "mba ai": {
        "thac si quan tri kinh doanh ve doi moi sang tao va tri tue nhan tao",
        "mba doi moi sang tao va tri tue nhan tao",
        "mba ai",
    },
    "phd cs": {"tien si khoa hoc may tinh", "doctor of philosophy in computer science"},
}

COMMON_MAJOR_ALIASES_BY_NAME: dict[str, set[str]] = {
    "bac si y khoa": {"md"},
    "dieu duong": {"nur"},
    "khoa hoc du lieu": {"ds"},
    "khoa hoc may tinh": {"cs"},
    "kinh te hoc": {"econ"},
    "ky thuat co khi": {"me"},
    "ky thuat dien va may tinh": {"ece"},
    "quan tri khach san": {"hm"},
    "quan tri kinh doanh": {"bba"},
    "tam ly hoc": {"psy"},
    "truyen thong da phuong tien": {"mmc"},
    "bac si noi tru": {"gme"},
    "thac si dieu duong": {"mnur"},
    "thac si khoa hoc may tinh": {"msc cs", "msc-cs"},
    "thac si ky thuat co khi": {"msc me"},
    "thac si ky thuat dien": {"msc ee"},
    "thac si quan tri kinh doanh ve doi moi sang tao va tri tue nhan tao": {"mba ai", "mba-ai"},
    "tien si khoa hoc may tinh": {"phd cs", "phd-cs"},
}


def find_major_by_text(db, text: str, major_type: MajorType | None = None) -> Major | None:
    q = (text or "").strip()
    if not q:
        return None
    normalized_q = normalize_text(q)

    if normalized_q:
        majors_query = db.query(Major).filter(Major.is_active.is_(True))
        if major_type is not None:
            majors_query = majors_query.filter(Major.major_type == major_type)
        majors = majors_query.limit(500).all()

        exact_code = next(
            (
                major
                for major in majors
                if normalize_text(major.code or "") == normalized_q
            ),
            None,
        )
        if exact_code is not None:
            return exact_code

        alias_exact = next(
            (
                major
                for major in majors
                if any(normalize_text(alias) == normalized_q for alias in _major_aliases(major))
            ),
            None,
        )
        if alias_exact is not None:
            return alias_exact

    direct = (
        db.query(Major)
        .filter(Major.is_active.is_(True))
        .filter((Major.code.ilike(f"%{q}%")) | (Major.name.ilike(f"%{q}%")))
        .first()
    )
    if direct and (major_type is None or direct.major_type == major_type):
        return direct

    query = db.query(Major).filter(Major.is_active.is_(True))
    if major_type is not None:
        query = query.filter(Major.major_type == major_type)

    return find_best_major_in_text(q, query.limit(500).all())


def find_best_major_in_text(text: str | None, majors: list[Major]) -> Major | None:
    matches = find_mentioned_majors(text, majors)
    return matches[0] if matches else None


def find_mentioned_majors(text: str | None, majors: list[Major]) -> list[Major]:
    normalized = normalize_text(text)
    if not normalized:
        return []

    scored: list[tuple[float, Major]] = []
    query_tokens = set(_meaningful_tokens(normalized))
    for major in majors:
        score = _major_score(major, normalized, query_tokens)
        if score >= 45:
            scored.append((score, major))

    scored.sort(key=lambda item: item[0], reverse=True)
    best_score = scored[0][0] if scored else 0.0
    return [major for score, major in scored if score >= best_score - 12.0]


def normalize_text(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.replace("_", " ").replace("-", " ").replace("/", " ")
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    normalized = normalized.lower().strip()
    normalized = " ".join(normalized.split())
    return _normalize_common_typos(normalized)


def _major_score(major: Major, normalized_query: str, query_tokens: set[str]) -> float:
    best = 0.0
    for alias in _major_aliases(major):
        alias_norm = normalize_text(alias)
        if not alias_norm:
            continue

        if _contains_phrase(normalized_query, alias_norm):
            best = max(best, 90.0 + min(len(alias_norm), 30))
            continue

        alias_tokens = set(_meaningful_tokens(alias_norm))
        if not alias_tokens:
            continue
        overlap = len(alias_tokens & query_tokens) / len(alias_tokens)
        if overlap >= 0.65:
            best = max(best, 70.0 * overlap)

    return max(0.0, best + _level_major_type_bonus(normalized_query, major))


def _major_aliases(major: Major) -> list[str]:
    name = major.name or ""
    code = major.code or ""
    degree_type = major.degree_type or ""
    aliases = [name, code, code.replace("_", " ")]
    normalized_name = normalize_text(name)
    normalized_code = normalize_text(code)

    if normalized_code:
        aliases.extend(list(COMMON_MAJOR_ALIASES_BY_CODE.get(normalized_code, set())))
    if normalized_name:
        aliases.extend(list(COMMON_MAJOR_ALIASES_BY_NAME.get(normalized_name, set())))

    if _is_specific_degree_type(degree_type):
        aliases.append(degree_type)

    if name:
        aliases.extend(
            [
                f"nganh {name}",
                f"chuong trinh {name}",
                f"cu nhan {name}",
                f"thac si {name}",
                f"tien si {name}",
                f"{degree_type} {name}",
            ]
        )

    return aliases


def _contains_phrase(text: str, phrase: str) -> bool:
    if not text or not phrase:
        return False
    pattern = rf"(?<!\w){re.escape(phrase)}(?!\w)"
    return re.search(pattern, text) is not None


def _is_specific_degree_type(value: str | None) -> bool:
    normalized = normalize_text(value)
    if not normalized:
        return False

    generic_degree_words = {
        "arts",
        "bachelor",
        "cu",
        "degree",
        "doctor",
        "doctorate",
        "master",
        "nhan",
        "of",
        "phd",
        "science",
        "si",
        "thac",
        "tien",
    }
    specific_tokens = [
        token
        for token in normalized.split()
        if len(token) > 1 and token not in generic_degree_words
    ]
    return bool(specific_tokens)


def _meaningful_tokens(value: str) -> list[str]:
    stop_words = {
        "ai",
        "ban",
        "bao",
        "cac",
        "cho",
        "chuong",
        "co",
        "cua",
        "dai",
        "dao",
        "duoc",
        "gi",
        "hoc",
        "la",
        "nganh",
        "phi",
        "sao",
        "sau",
        "thi",
        "thong",
        "tin",
        "toi",
        "trinh",
        "ve",
        "vinuni",
        "vinuniversity",
    }
    return [
        token
        for token in value.split()
        if (len(token) > 1 or token == "y") and token not in stop_words
    ]


def _level_major_type_bonus(value: str, major: Major) -> float:
    if not major.major_type:
        return 0.0

    if any(token in value for token in ["cu nhan", "dai hoc", "undergrad", "bachelor"]):
        return 25.0 if major.major_type == MajorType.UNDERGRAD_MAJOR else -20.0

    grad_tokens = ["thac si", "tien si", "sau dai hoc", "graduate", "master", "phd", "msc", "mba"]
    if any(token in value for token in grad_tokens):
        return 25.0 if major.major_type == MajorType.GRAD_MAJOR else -20.0

    return 0.0


def _normalize_common_typos(value: str) -> str:
    replacements = {
        "nghanh": "nganh",
        "sau dao hoc": "sau dai hoc",
        "thac sy": "thac si",
        "viuni": "vinuni",
    }
    normalized = value
    for old, new in replacements.items():
        normalized = normalized.replace(old, new)
    return normalized
