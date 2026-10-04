"""Compatible asyncio loop for psycopg on Windows and normal Linux deployment."""

import asyncio
import sys


def event_loop():
    if sys.platform == "win32":
        return asyncio.SelectorEventLoop()
    return asyncio.new_event_loop()


def run_async(awaitable):
    with asyncio.Runner(loop_factory=event_loop) as runner:
        return runner.run(awaitable)
