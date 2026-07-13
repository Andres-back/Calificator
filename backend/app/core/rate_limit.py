from fastapi import Request


async def rate_limit_placeholder(request: Request) -> None:
    # Redis-backed rate limiting belongs to the production middleware layer.
    return None
