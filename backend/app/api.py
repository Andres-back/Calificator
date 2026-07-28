from fastapi import APIRouter

from app.modules.admin_ai_config.router import router as admin_ai_config_router
from app.modules.analytics.router import router as analytics_router
from app.modules.asistencia.router import router as asistencia_router
from app.modules.auth.router import router as auth_router
from app.modules.calificaciones.router import router as calificaciones_router
from app.modules.dba.router import custom_router as dba_custom_router
from app.modules.dba.router import router as dba_router
from app.modules.evaluaciones.router import router as evaluaciones_router
from app.modules.herramientas.router import router as herramientas_router
from app.modules.imagenes.router import biblioteca_router as imagenes_biblioteca_router
from app.modules.imagenes.router import router as imagenes_router
from app.modules.impacto_tesis.router import router as impacto_router
from app.modules.jobs.router import router as jobs_router
from app.modules.materias.router import router as materias_router
from app.modules.matriculas.router import router as matriculas_router
from app.modules.presentaciones.router import router as presentaciones_router
from app.modules.rag.router import router as rag_router
from app.modules.reportes.router import router as reportes_router
from app.modules.users.router import router as users_router
from app.modules.xali.router import router as xali_router
from app.modules.xali.refuerzo_router import router as xali_refuerzos_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(materias_router)
api_router.include_router(asistencia_router)
api_router.include_router(matriculas_router)
api_router.include_router(dba_router)
api_router.include_router(dba_custom_router)
api_router.include_router(evaluaciones_router)
api_router.include_router(rag_router)
api_router.include_router(calificaciones_router)
api_router.include_router(herramientas_router)
api_router.include_router(presentaciones_router)
api_router.include_router(imagenes_router)
api_router.include_router(imagenes_biblioteca_router)
api_router.include_router(xali_router)
api_router.include_router(xali_refuerzos_router)
api_router.include_router(reportes_router)
api_router.include_router(impacto_router)
api_router.include_router(jobs_router)
api_router.include_router(admin_ai_config_router)
api_router.include_router(analytics_router)
