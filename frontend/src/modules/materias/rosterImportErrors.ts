const messages: Record<string, { title: string; detail: string }> = {
  service_unavailable: { title: 'El servicio de lectura no está disponible.', detail: 'Intenta más tarde o avisa al administrador. Este error no significa que tu foto esté mal.' },
  invalid_response: { title: 'La lectura no se completó correctamente.', detail: 'Intenta de nuevo. Si continúa, avisa al administrador.' },
  no_names: { title: 'No encontramos nombres en la lista.', detail: 'Si es una foto, toma otra con buena luz y toda la lista visible. Si es un archivo, revisa que tenga una columna con los nombres.' },
};

export function rosterImportError(code: unknown) {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(messages, code) ? messages[code] : {
    title: 'No pudimos completar la lectura de la lista.',
    detail: 'Intenta de nuevo. Si continúa, avisa al administrador.',
  };
}
