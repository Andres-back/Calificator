# Validación: Correr la suite de accesibilidad en cada PR

## Pruebas

```
npm run test:a11y                                              16 pasan en local (54 s)
python -m pytest tests/spec_governance/test_ci_first_failure.py tests/spec_governance/test_visual_ci_gates.py tests/spec_governance/test_accessibility_ci.py     33 pasan
```

## En CI

El trabajo «Frontend contextual regressions» muestra ahora el paso «Run accessibility checks». La primera ejecución de este PR es la prueba de que corre en GitHub.

## Fuera de alcance

Las otras pruebas con API simulada (`frontend/e2e/mock`, salvo las dos contextuales) tampoco corren en CI. Quedan para otra spec.
