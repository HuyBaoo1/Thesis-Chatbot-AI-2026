"""
Tool definitions for the agent.
Add new tools by creating a function and registering it in the TOOLS dict.
"""

import ast
import math
import sys

import httpx

SAFE_MATH_NODES = (
    ast.Expression, ast.Constant, ast.UnaryOp, ast.UAdd, ast.USub,
    ast.BinOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv,
    ast.Mod, ast.Pow, ast.Call, ast.Name, ast.Load, ast.Tuple,
)

SAFE_MATH_FUNCTIONS = {
    "abs": abs, "round": round, "min": min, "max": max,
    "sqrt": math.sqrt, "log": math.log,
}

MAX_EXPR_LENGTH = 200
MAX_EXPONENT = 1000
MAX_NESTING_DEPTH = 50


def _check_nesting(node: ast.AST, depth: int = 0) -> None:
    if depth > MAX_NESTING_DEPTH:
        raise ValueError("Expression too deeply nested")
    for child in ast.iter_child_nodes(node):
        _check_nesting(child, depth + 1)


def _safe_eval(expression: str) -> float | int:
    expr = expression.strip()
    if len(expr) > MAX_EXPR_LENGTH:
        raise ValueError("Expression too long")

    tree = ast.parse(expr, mode="eval")
    _check_nesting(tree)

    for node in ast.walk(tree):
        if not isinstance(node, SAFE_MATH_NODES):
            raise ValueError(f"Disallowed construct: {type(node).__name__}")

        if isinstance(node, ast.Call):
            name = node.func.id if isinstance(node.func, ast.Name) else None
            if name not in SAFE_MATH_FUNCTIONS:
                raise ValueError(f"Unknown function: {name}")

        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Pow):
            right = node.right
            if not isinstance(right, ast.Constant):
                raise ValueError("Exponent must be a literal number")
            if isinstance(right.value, (int, float)) and abs(right.value) > MAX_EXPONENT:
                raise ValueError("Exponent too large")

    return eval(
        compile(tree, "<expression>", "eval"),
        {"__builtins__": {}},
        {**SAFE_MATH_FUNCTIONS, "__builtins__": {}},
    )


def search_web(query: str) -> str:
    """Search for information on the web (placeholder)."""
    return f"Search results for: {query}"


def calculate(expression: str) -> str:
    """Evaluate a math expression."""
    try:
        result = _safe_eval(expression)
        return str(result)
    except Exception as e:
        return f"Error: {e}"


def fetch_url(url: str) -> str:
    """Fetch content from a URL."""
    try:
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        return resp.text[:2000]
    except Exception as e:
        return f"Error: {e}"


# VinUni Admissions Domain Tools

def get_lead(lead_id: str) -> str:
    """Get a lead by ID from the admissions system."""
    # Placeholder - in production, this would call the lead service
    return f"Lead {lead_id}: name, email, phone, score, status"


def search_leads(query: str, status: str = None) -> str:
    """Search for leads in the admissions system."""
    # Placeholder - in production, this would call the search service
    return f"Search results for '{query}'" + (f" with status={status}" if status else "")


def get_application(application_id: str) -> str:
    """Get an application by ID."""
    return f"Application {application_id}: applicant, program, status, submitted_at"


def submit_application_review(application_id: str, decision: str, notes: str = "") -> str:
    """Submit a review decision for an application."""
    return f"Review submitted for {application_id}: {decision}" + (f" - {notes}" if notes else "")


def get_conversation(conversation_id: str) -> str:
    """Get a chat conversation by ID."""
    return f"Conversation {conversation_id}: messages, participants, status"


def send_notification(user_id: str, message: str, type: str = "info") -> str:
    """Send a notification to a user."""
    return f"Notification sent to {user_id}: [{type}] {message}"


def list_scholarships(program: str = None) -> str:
    """List available scholarships, optionally filtered by program."""
    return f"Scholarships" + (f" for {program}" if program else "") + ": list of scholarships"


# Tool registry - the agent uses this dict
TOOLS = {
    "search_web": {
        "fn": search_web,
        "description": "Search for information on the web",
        "parameters": {"query": "string"},
    },
    "calculate": {
        "fn": calculate,
        "description": "Evaluate a math expression",
        "parameters": {"expression": "string"},
    },
    "fetch_url": {
        "fn": fetch_url,
        "description": "Fetch content from a URL",
        "parameters": {"url": "string"},
    },
    # VinUni domain tools
    "get_lead": {
        "fn": get_lead,
        "description": "Get a lead by ID from the admissions system",
        "parameters": {"lead_id": "string"},
    },
    "search_leads": {
        "fn": search_leads,
        "description": "Search for leads in the admissions system",
        "parameters": {"query": "string", "status": "string"},
    },
    "get_application": {
        "fn": get_application,
        "description": "Get an application by ID",
        "parameters": {"application_id": "string"},
    },
    "submit_application_review": {
        "fn": submit_application_review,
        "description": "Submit a review decision for an application",
        "parameters": {"application_id": "string", "decision": "string", "notes": "string"},
    },
    "get_conversation": {
        "fn": get_conversation,
        "description": "Get a chat conversation by ID",
        "parameters": {"conversation_id": "string"},
    },
    "send_notification": {
        "fn": send_notification,
        "description": "Send a notification to a user",
        "parameters": {"user_id": "string", "message": "string", "type": "string"},
    },
    "list_scholarships": {
        "fn": list_scholarships,
        "description": "List available scholarships, optionally filtered by program",
        "parameters": {"program": "string"},
    },
}


def get_tool_schemas() -> list[dict]:
    """Return tool schemas in Anthropic API format."""
    schemas = []
    for name, tool in TOOLS.items():
        schemas.append({
            "name": name,
            "description": tool["description"],
            "input_schema": {
                "type": "object",
                "properties": {
                    k: {"type": v, "description": k}
                    for k, v in tool["parameters"].items()
                },
                "required": list(tool["parameters"].keys()),
            },
        })
    return schemas


def execute_tool(name: str, args: dict) -> str:
    """Execute a tool by name."""
    tool = TOOLS.get(name)
    if not tool:
        return f"Tool '{name}' does not exist"
    return tool["fn"](**args)
