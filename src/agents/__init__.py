"""
VinUni Admissions Portal - Agent System

BMad Method agent roles with khuym multi-agent orchestration support.
"""

from .roles import AGENT_ROLES, get_agent, get_agents_by_phase, list_agents

__all__ = [
    "AGENT_ROLES",
    "get_agent",
    "get_agents_by_phase",
    "list_agents",
]