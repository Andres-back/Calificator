from fastapi import HTTPException
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

PRIVATE_HEADERS = {
    "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff",
}


class PrivateRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handler(request):
            try:
                response = await original(request)
            except HTTPException as exc:
                exc.headers = {**(exc.headers or {}), **PRIVATE_HEADERS}
                raise
            except RequestValidationError as exc:
                response = await request_validation_exception_handler(request, exc)
            except SQLAlchemyError:
                response = JSONResponse(status_code=503, content={"detail": "No pudimos comprobar el acceso. Intenta de nuevo más tarde."})
            response.headers.update(PRIVATE_HEADERS)
            return response

        return handler
