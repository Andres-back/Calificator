from fastapi import APIRouter, Depends
from app.core.permissions import get_current_user, require_roles
from app.shared.enums import UserRole

router = APIRouter(prefix="/demo", tags=["demo"])

@router.get("/{item_id}")
async def read_demo(item_id: str, current_user=Depends(require_roles(UserRole.PROFESOR))):
    return {"id": item_id}

@router.post("")
async def create_demo(current_user=Depends(get_current_user)):
    return {}