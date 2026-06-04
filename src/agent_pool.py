"""
Agent Pool Manager for VinUni Admissions Portal

Provides multi-agent pool with role-based agent creation,
integrated with BMad Method roles and khuym orchestration.
"""

import os
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from anthropic import Anthropic

from .roles import AGENT_ROLES, get_agent


@dataclass
class Agent:
    """Represents a configured agent instance."""
    key: str
    name: str
    title: str
    phase: str
    system_prompt: str
    tools: List[str]
    client: Optional[Anthropic] = None


class AgentPool:
    """
    Multi-agent pool manager with role-based agent creation.

    Usage:
        pool = AgentPool()
        john = pool.create_agent("john")
        response = john.complete("Design a scholarship review workflow")
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the agent pool."""
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")

        self.client = Anthropic(api_key=self.api_key)
        self._agents: Dict[str, Agent] = {}

    def create_agent(self, role: str) -> Agent:
        """
        Create an agent with the specified BMad role.

        Args:
            role: Agent role key (john, winston, mary, sally, bob, amelia, barry, quinn, paige)

        Returns:
            Configured Agent instance
        """
        if role in self._agents:
            return self._agents[role]

        agent_def = get_agent(role)

        agent = Agent(
            key=role,
            name=agent_def["name"],
            title=agent_def["title"],
            phase=agent_def["phase"],
            system_prompt=agent_def["system_prompt"],
            tools=agent_def.get("tools", []),
            client=self.client,
        )

        self._agents[role] = agent
        return agent

    def get_agent(self, role: str) -> Optional[Agent]:
        """Get existing agent or None if not created yet."""
        return self._agents.get(role)

    def list_active_agents(self) -> List[Dict[str, str]]:
        """List all active (created) agents."""
        return [
            {"key": a.key, "name": a.name, "title": a.title, "phase": a.phase}
            for a in self._agents.values()
        ]

    def complete(self, role: str, prompt: str, **kwargs) -> Any:
        """
        Create agent and run completion in one call.

        Args:
            role: Agent role key
            prompt: User prompt
            **kwargs: Additional parameters for messages.create

        Returns:
            Anthropic message response
        """
        agent = self.create_agent(role)
        return agent.complete(prompt, **kwargs)


def Agent_complete(self, prompt: str, **kwargs) -> Any:
    """Complete a task with this agent."""
    max_tokens = kwargs.pop("max_tokens", 4096)
    temperature = kwargs.pop("temperature", 0.7)

    response = self.client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        temperature=temperature,
        system=self.system_prompt,
        messages=[{"role": "user", "content": prompt}],
        **kwargs
    )
    return response


# Monkey-patch Agent class with complete method
Agent.complete = Agent_complete


class MultiAgentOrchestrator:
    """
    Coordinates multiple agents for complex tasks.

    Supports BMad "Party Mode" where multiple agents collaborate.
    """

    def __init__(self, pool: AgentPool):
        self.pool = pool

    def party_mode(self, task: str, agents: List[str]) -> Dict[str, Any]:
        """
        Run multiple agents on a task (BMad Party Mode).

        Args:
            task: The task description
            agents: List of agent roles to involve

        Returns:
            Dict mapping agent roles to their responses
        """
        results = {}
        for role in agents:
            agent = self.pool.create_agent(role)
            response = agent.complete(task)
            results[role] = {
                "name": agent.name,
                "response": response.content[0].text,
            }
        return results

    def workflow(self, workflow_spec: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Execute a sequential workflow across agents.

        Args:
            workflow_spec: List of {"agent": role, "task": description, "input_key": key}
                         where input_key references previous agent's output

        Returns:
            List of results from each step
        """
        context = {}
        results = []

        for step in workflow_spec:
            role = step["agent"]
            task = step["task"]

            # Substitute context variables
            if "input_key" in step and step["input_key"] in context:
                task = task.format(**{step["input_key"]: context[step["input_key"]]})

            agent = self.pool.create_agent(role)
            response = agent.complete(task)
            output = response.content[0].text

            context[step.get("output_key", step["agent"])] = output
            results.append({
                "agent": role,
                "output": output,
            })

        return results


# Global pool instance
_global_pool: Optional[AgentPool] = None


def get_pool() -> AgentPool:
    """Get or create global agent pool."""
    global _global_pool
    if _global_pool is None:
        _global_pool = AgentPool()
    return _global_pool


def create_agent(role: str) -> Agent:
    """Convenience function to create an agent from global pool."""
    return get_pool().create_agent(role)


def list_agents() -> List[Dict[str, str]]:
    """Convenience function to list all available agents."""
    return get_pool().list_active_agents()