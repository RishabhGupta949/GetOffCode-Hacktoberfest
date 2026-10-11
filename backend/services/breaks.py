"""Curated, deterministic break options. No AI call is ever made for these."""

from dataclasses import dataclass


@dataclass(frozen=True)
class BreakOption:
    type: str
    title: str


BREAKS: tuple[BreakOption, ...] = (
    BreakOption("walk_outside", "Walk outside for a few minutes. Leave the desk behind."),
    BreakOption("stretch", "Stand up and stretch your back, shoulders and legs."),
    BreakOption("water_eyes", "Drink some water and look at something far away."),
    BreakOption("breathing", "Breathe slowly: in for 4, hold for 4, out for 6."),
    BreakOption("sunlight", "Step into daylight or fresh air, even for a minute."),
)


def pick_break(index: int) -> tuple[int, BreakOption]:
    """Round-robin by a persisted per-session counter. Returns (next_index, option)."""
    opt = BREAKS[index % len(BREAKS)]
    return index + 1, opt
