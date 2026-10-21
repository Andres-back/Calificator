"""Resumen por versión; los rangos nunca se convierten a minutos exactos."""
import json
import math
import statistics
import unicodedata

RELEASE = '5.1.0'
SIGNATURE_LIMITS = {'min_points':8,'min_length':0.08,'max_points':12000,'max_strokes':100}


def valid_number(value, minimum, maximum):
    return not isinstance(value,bool) and isinstance(value,(int,float)) and math.isfinite(value) and minimum <= value <= maximum


def summary(rows, current_version):
    groups={current_version:[]}
    for encoded, in rows:
        record=json.loads(encoded)['response'];groups.setdefault(record['instrument_version'],[]).append(record)
    result=[]
    def normalized(value):
        return ' '.join(unicodedata.normalize('NFKC',value).casefold().split())
    for version,records in sorted(groups.items()):
        teachers={(normalized(r['identity']['name']),normalized(r['answers'].get('institution') or '')) for r in records}
        rates={basis:[] for basis in ('measured','estimated')};elapsed=[];visible=[]
        for r in records:
            a=r['answers'];minutes=a.get('manual.minutes');deliveries=a.get('manual.deliveries');basis=a.get('manual.basis')
            if version=='5.0-web-medicion' and valid_number(minutes,.1,10080) and isinstance(deliveries,int) and valid_number(deliveries,1,1000) and basis in rates:
                rates[basis].append(minutes/deliveries)
            m=r.get('completion_metrics') or {}
            if m.get('source')=='browser' and valid_number(m.get('elapsed_seconds'),0,86400) and valid_number(m.get('visible_seconds'),0,m['elapsed_seconds']):
                elapsed.append(m['elapsed_seconds']);visible.append(m['visible_seconds'])
        result.append({'version':version,'responses':len(records),'teachers_declared':len(teachers),'minutes_per_delivery_n':sum(map(len,rates.values())),
                       'minutes_per_delivery_by_basis':{b:{'n':len(v),'mean':round(statistics.mean(v),3) if v else None} for b,v in rates.items()},
                       'form_duration_n':len(elapsed),'form_elapsed_median_seconds':round(statistics.median(elapsed),1) if elapsed else None,'form_visible_median_seconds':round(statistics.median(visible),1) if visible else None})
    return {'release':RELEASE,'versions':result,'note':'No mezclar versiones modificadas. Docentes declarados por nombre e institución; identidad no verificada. Duración del navegador, no preprueba humana ni tiempo de calificación.'}
