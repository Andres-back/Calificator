import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

async function adminMocks(page: Page) {
  const actor = { id:'admin', nombre:'Administración sintética', email:'admin@example.test', rol:'admin', estado:'activo', is_primary_admin:true, permissions:['admin_ai.manage','admin_settings.manage'] };
  const provider = { id:'open_code',name:'open_code',label:'API elegida',tipo:'texto',base_url:null,model:'synthetic-visual',active:true,auth_configured:true,priority:1,timeout_seconds:90,max_retries:5 };
  const model = { provider_id:provider.id,model_id:'synthetic-visual',label:'Modelo visual sintético',active:true,recommended:true,capabilities:['text','vision'],runtime_profile:{protocol:'responses'},verification_id:'synthetic-server-proof' };
  let feature = { feature:'calificacion.extraccion', label:'Lectura visual',capability:'vision',primary_provider:provider.id,primary_model:model.model_id,fallback_provider:null,fallback_model:null,active:true,rollout_enabled:false,config_version:4,runtime_limits:{call_timeout_seconds:60,max_attempts:2,max_output_tokens:10000} };
  let version = 4;
  const published: Record<string, unknown>[] = [];
  const state = { invalid: false };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/,'');
    const json = (body:unknown) => route.fulfill({json:body});
    if (path === '/auth/me') return json({user:actor});
    if (path === '/users/me/authorization') return json({profile:'admin',is_primary_admin:true,permissions:actor.permissions});
    if (path === '/auth/refresh') return route.fulfill({status:401,json:{}});
    if (path === '/admin/ai-settings') return json({version,providers:[provider],models:[model],features:[feature],global_config:{has_open_code_key:true,credential_sources:{open_code:'database'}},usage:{total_calls:0,total_tokens_input:0,total_tokens_output:0,total_cost:0,by_provider:[]}});
    if (path === '/admin/ai-control-center') {
      const configured = {provider:provider.id,model:model.model_id,fallback_provider:null,fallback_model:null,teacher_override_allowed:false,config_version:version,runtime_limits:feature.runtime_limits};
      return json({version,functions:[{function_id:'calificacion',label:'Calificación',stages:[{function_id:'calificacion',function_label:'Calificación',stage_id:'extraction',label:'Lectura visual',runtime_feature:feature.feature,capability:'vision',editable:true,condition:'Siempre',consumer:'VisionExtractor',supported_providers:[provider.id],configured,effective:{...configured,origin:'institutional'},observed:null}]}],providers:[provider],models:[model],tools:[],deployment:{editable:false,managed_by:'deployment'}});
    }
    if (path === '/admin/ai-control-center/validate') return json({valid:!state.invalid,errors:state.invalid ? [{field:'features.0.runtime_limits',message:'Revisa los límites de lectura.'}] : [],warnings:[]});
    if (path === '/admin/ai-control-center/publish') {
      const body = route.request().postDataJSON();
      published.push(body);
      feature = {...body.features[0],config_version:++version};
      return json({status:'ok',version});
    }
    if (path === '/admin/ai-config-hash') return json({backend_hash:'same',worker_hash:'same',consistent:true});
    if (path === '/admin/ai-audit') return json({total:0,logs:[]});
    return json([]);
  });
  return {published,state};
}

async function setViewport(page: Page, width: number, theme: 'light' | 'dark') {
  await page.setViewportSize({width,height:900});
  await page.addInitScript((mode) => localStorage.setItem('xc-theme',JSON.stringify({state:{mode},version:0})),theme);
}

for (const width of [360,1440]) for (const theme of ['light','dark'] as const) {
  test(`133 admin guarda y reabre límites sin perder el borrador ${width}px ${theme}`, async ({page}) => {
    await setViewport(page,width,theme);
    const {published,state} = await adminMocks(page);
    await page.goto('/app/admin/configuracion-ia');
    const time = page.getByRole('spinbutton',{name:'Tiempo por intento (segundos)'});
    await expect(time).toHaveValue('60');
    await time.fill('45');
    await page.getByRole('spinbutton',{name:'Espacio de respuesta (tokens)'}).fill('9216');
    state.invalid = true;
    await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('Revisa los límites de lectura.');
    expect(published).toHaveLength(0);
    await expect(time).toHaveValue('45');
    state.invalid = false;
    await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
    await page.getByRole('button',{name:/Guardar configuraci.n/}).click();
    await expect.poll(() => published.length).toBe(1);
    expect(published[0]).toMatchObject({expected_version:4,features:[{runtime_limits:{call_timeout_seconds:45,max_attempts:2,max_output_tokens:9216}}]});
    await page.reload();
    await expect(time).toHaveValue('45');
    await expect(page.getByText(/Límites guardados de lectura: 45 s/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(time).toHaveAttribute('max','60');
    for (const input of await page.getByRole('spinbutton').all()) expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
    await page.screenshot({path:test.info().outputPath('admin-limits.png'),fullPage:true});
  });

  test(`133 docente conserva referencia sin convertirla en nota vigente ${width}px ${theme}`, async ({page}) => {
    await setViewport(page,width,theme);
    await login(page,'profesor');
    let historyCalls = 0;
    await page.route('**/api/calificaciones/c1/revisiones', route => { historyCalls++; return route.fulfill({json:[{id:'r1',nota_anterior:null},{id:'r2',nota_anterior:'0',created_at:'2026-10-28T00:00:00Z',actor_nombre:'Docente sintético',accion:'recalificar'}]}); });
    await page.route('**/api/calificaciones/c1/detalle',route => route.fulfill({json:{id:'c1',evaluacion_id:'e1',materia_id:'m1',estudiante_id:'s1',estudiante_nombre:'Estudiante Prueba',evaluacion_nombre:'Multiplicación',estado:'requiere_revision',nota_sugerida:null,nota_confirmada:null,nota_maxima:5,revisado_por_docente:false,resultado_json:{pipeline_status:'failed_temporary'},timeline:[],guia_revision:[],entrega_archivo_url:'/api/privado',desglose:null}}));
    const writes:string[] = [];
    page.on('request',r => {if(r.method()!=='GET' && /\/api\/calificaciones\//.test(r.url())) writes.push(r.url());});
    await page.goto('/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
    const reference = page.getByRole('complementary',{name:'Resultado anterior de referencia'});
    await expect(reference).toContainText('0.0');
    await expect(reference).toContainText('No es una nota vigente');
    await expect(page.getByText('Sin nota automática',{exact:true})).toBeVisible();
    await reference.getByRole('button',{name:'Ver historial'}).click();
    await expect(page.getByRole('heading',{name:'Historial de la calificación'})).toBeVisible();
    expect(historyCalls).toBeGreaterThan(0);
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({path:test.info().outputPath('previous-grade.png'),fullPage:true});
  });

  test(`133 estudiante no solicita historial privado ${width}px ${theme}`, async ({page}) => {
    await setViewport(page,width,theme);
    let calls = 0;
    page.on('request',r => {if(/\/revisiones(?:\?|$)/.test(r.url())) calls++;});
    await login(page,'estudiante');
    await page.goto('/app/materias/m1/evaluaciones');
    await expect(page.getByRole('main')).toBeVisible();
    expect(calls).toBe(0);
    await expect(page.getByRole('complementary',{name:'Resultado anterior de referencia'})).toHaveCount(0);
  });
}
