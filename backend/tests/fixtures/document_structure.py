"""Independent educational fixture; never copied from a teacher's document."""
from uuid import NAMESPACE_URL, uuid5


def identifier(label):
    return str(uuid5(NAMESPACE_URL, 'xcal-spec130-synthetic:' + label))


def sample_document():
    nodes, questions, source_ids = [], [], []

    def add(label, kind, parent=None, **values):
        siblings = sum(node['padre_id'] == parent for node in nodes)
        source = 'source:' + label
        source_ids.append(source)
        node = {'id': identifier(label), 'tipo': kind, 'padre_id': parent,
                'orden': siblings, 'fuente_ids': [source], **values}
        nodes.append(node)
        return node['id']

    def question(parent, label):
        number = len(questions) + 1
        qid = identifier('question:' + str(number))
        questions.append({'numero': number, 'contenido_id': qid, 'tipo': 'abierta',
                          'enunciado': f'Explica la observación científica {number}.',
                          'puntaje': '0.35' if number == 16 else '0.31'})
        add('question-node:' + str(number), 'pregunta', parent,
            pregunta_id=qid, etiqueta_original=str(label))

    start = add('start', 'seccion', titulo='Observamos el jardín', etiqueta_original='1')
    add('instruction', 'texto', start, proposito='instruccion', texto='Observa el jardín y responde.')
    for number in range(1, 5):
        question(start, number)
    reading = add('reading', 'seccion', titulo='Lectura: una semilla viajera', etiqueta_original='2')
    add('reading-body', 'texto', reading, proposito='lectura',
        texto='Una semilla llegó al jardín con el viento.\nCon agua y luz comenzó a crecer.')
    comprehension = add('comprehension', 'seccion', titulo='Comprendemos la lectura', etiqueta_original='3')
    literal = add('literal', 'seccion', comprehension, titulo='Lo que dice el texto', etiqueta_original='A')
    for number in range(1, 4):
        question(literal, number)
    inferential = add('inferential', 'seccion', comprehension, titulo='Lo que deducimos', etiqueta_original='B')
    for number in range(4, 7):
        question(inferential, number)
    reflection = add('reflection', 'seccion', titulo='Reflexionamos', etiqueta_original='4')
    for number in range(1, 4):
        question(reflection, number)
    debate = add('debate', 'seccion', titulo='Conversamos en grupo', etiqueta_original='5')
    add('debate-body', 'texto', debate, proposito='actividad',
        texto='Comparen sus ideas sobre el cuidado del jardín y escuchen a sus compañeros.')
    conclusion = add('conclusion', 'seccion', titulo='Mi conclusión', etiqueta_original='6')
    for number in range(1, 4):
        question(conclusion, number)
    return {'schema_version': 1, 'nodos': nodes,
            'revision': {'detectados': source_ids, 'conservados': list(source_ids),
                         'estado': 'completa', 'confirmado': True, 'avisos': []}}, questions
