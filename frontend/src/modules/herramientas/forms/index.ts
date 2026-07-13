import type { ComponentType } from 'react';
import type { MaterialTipo } from '@/types/api';
import type { ToolFormProps } from './base';
import {
  CrucigramaForm,
  SopaLetrasForm,
  UnirColumnasForm,
  EmparejarForm,
  ExamenForm,
  GuiaForm,
  TallerForm,
  CuentoForm,
  ParaColorearForm,
  RubricaForm,
  PlanRefuerzoForm,
} from './tools';

export type { ToolFormProps } from './base';

/** Menú de creación especializado por tipo de herramienta. */
export const FORMS: Record<MaterialTipo, ComponentType<ToolFormProps>> = {
  crucigrama: CrucigramaForm,
  sopa_letras: SopaLetrasForm,
  unir_columnas: UnirColumnasForm,
  emparejar: EmparejarForm,
  examen: ExamenForm,
  guia: GuiaForm,
  taller: TallerForm,
  cuento: CuentoForm,
  para_colorear: ParaColorearForm,
  rubrica: RubricaForm,
  plan_refuerzo: PlanRefuerzoForm,
};
