import { LegalLayout } from '@/components/legal/LegalLayout';
import { LEGAL_CONTACT_EMAIL, LEGAL_PROJECT_LOCATION, LEGAL_PROJECT_OWNERS } from './legalContent';

const OfficialSources = () => (
  <section>
    <h2>Marco de referencia</h2>
    <ul>
      <li><a href="https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noreferrer">Ley 1581 de 2012</a>.</li>
      <li><a href="https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/politicas-de-tratamiento-de-datos-personales" target="_blank" rel="noreferrer">Orientación de la SIC sobre políticas de tratamiento</a>.</li>
      <li><a href="https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos" target="_blank" rel="noreferrer">Circular Externa 002 de 2024 sobre IA y datos personales</a>.</li>
    </ul>
  </section>
);

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de tratamiento de datos y privacidad" summary="Explica qué información trata XCalificator, para qué la utiliza, cuándo interviene la IA y cómo pueden ejercer sus derechos los titulares.">
      <section>
        <h2>1. Responsable y alcance</h2>
        <p>XCalificator es un proyecto de investigación y desarrollo educativo de {LEGAL_PROJECT_OWNERS}, con domicilio en {LEGAL_PROJECT_LOCATION}. El canal de privacidad es <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</p>
        <p>Cuando una institución educativa decide qué información académica cargar y para qué utilizarla, puede actuar como responsable del tratamiento y XCalificator como encargado. Esa distribución debe quedar definida en el acuerdo del piloto o servicio correspondiente.</p>
      </section>
      <section>
        <h2>2. Información tratada</h2>
        <ul>
          <li>Identificación y cuenta: nombre, correo, rol, estado y credenciales protegidas.</li>
          <li>Información académica: materias, matrículas, asistencia, evaluaciones, respuestas, notas, rúbricas, retroalimentación y solicitudes de revisión.</li>
          <li>Evidencias: fotografías, PDF, escritura manuscrita y documentos pedagógicos aportados por docentes o estudiantes.</li>
          <li>Operación y seguridad: registros de acceso, auditoría, trabajos en cola, errores técnicos y eventos mínimos de uso.</li>
          <li>Configuración: preferencias visuales, de accesibilidad y de proveedor de IA.</li>
          <li>Investigación: tiempos y observaciones solo dentro de un estudio autorizado y con el consentimiento aplicable.</li>
        </ul>
      </section>
      <section>
        <h2>3. Finalidades</h2>
        <ul>
          <li>Crear y administrar cuentas, materias, matrículas y actividades educativas.</li>
          <li>Recibir evidencias, asistir la digitalización y proponer calificaciones o retroalimentación para revisión docente.</li>
          <li>Generar materiales pedagógicos, presentaciones y apoyos de aprendizaje.</li>
          <li>Proteger la sesión, prevenir abuso, recuperar trabajos y mantener trazabilidad.</li>
          <li>Atender consultas, reclamos, correcciones, supresión y soporte.</li>
          <li>Medir el impacto del sistema únicamente cuando exista protocolo y consentimiento de investigación separados.</li>
        </ul>
        <p>No vendemos datos personales ni los usamos para publicidad comportamental.</p>
      </section>
      <section>
        <h2>4. Inteligencia artificial y decisión humana</h2>
        <p>Texto, imágenes o fragmentos necesarios pueden transmitirse al proveedor de IA que la institución o el docente autorizado tenga configurado. El proveedor puede operar fuera de Colombia; por ello cada despliegue debe revisar sus condiciones, ubicación, retención, seguridad y acuerdos de tratamiento.</p>
        <p>La IA produce propuestas. El docente conserva la decisión final sobre la calificación y debe revisar los casos de baja confianza, discrepancia o evidencia insuficiente. Los titulares pueden solicitar explicación, corrección o revisión por los canales de la plataforma y de la institución.</p>
      </section>
      <section>
        <h2>5. Niños, niñas y adolescentes</h2>
        <p>Sus derechos prevalecen. El tratamiento debe responder a su interés superior, respetar sus derechos fundamentales, limitarse a finalidades educativas claras y contar con autorización verificable del representante legal o de la institución cuando corresponda. El menor debe ser informado y escuchado de acuerdo con su madurez.</p>
        <p>Una casilla de registro no reemplaza esos soportes. Los menores no deben crear cuentas públicas sin acompañamiento y autorización verificable; la institución o el docente autorizado puede facilitar cuentas internas conforme a su proceso institucional.</p>
      </section>
      <section>
        <h2>6. Encargados y circulación</h2>
        <p>Podemos usar infraestructura de alojamiento, correo transaccional, protección de red, almacenamiento y proveedores configurables de IA. Solo deben recibir la información necesaria para prestar su función y estar sujetos a condiciones de confidencialidad, seguridad y tratamiento. No se autoriza al docente a cargar datos en una API personal por fuera de las autorizaciones institucionales aplicables.</p>
      </section>
      <section>
        <h2>7. Conservación y eliminación</h2>
        <p>La información se conserva mientras la cuenta, materia, obligación académica, soporte o estudio autorizado lo requieran y durante los periodos legales o institucionales aplicables. Luego debe eliminarse o anonimizarse de forma segura. Las instituciones deben definir y comunicar plazos concretos antes de ampliar el piloto.</p>
        <p>Una solicitud de supresión puede estar limitada cuando exista deber legal, necesidad de conservar integridad académica, investigación ya anonimizada o defensa de derechos. La limitación se explicará al titular.</p>
      </section>
      <section>
        <h2>8. Derechos y procedimiento</h2>
        <p>El titular puede conocer, acceder, actualizar, rectificar y solicitar prueba de autorización; conocer el uso; presentar quejas ante la SIC; revocar la autorización o solicitar supresión cuando proceda; y acceder gratuitamente a sus datos.</p>
        <p>Puede escribir a <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> indicando nombre, relación con la plataforma, solicitud, hechos y medio de respuesta. Si actúa por un menor o tercero deberá acreditar su representación. Se responderá dentro de los términos previstos por la normativa colombiana.</p>
      </section>
      <section>
        <h2>9. Seguridad e incidentes</h2>
        <p>Aplicamos control por roles, sesiones protegidas, trazabilidad, minimización, cifrado de credenciales de proveedores y restricciones de acceso. Ningún sistema es infalible; ante un incidente material se aplicará el procedimiento de contención, evaluación y comunicación exigible.</p>
      </section>
      <section>
        <h2>10. Cambios</h2>
        <p>Los cambios sustanciales se publicarán con nueva versión y fecha. Cuando afecten finalidades o requieran nueva autorización, no se presumirá la aceptación por el simple silencio o uso anterior.</p>
      </section>
      <OfficialSources />
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Términos de uso" summary="Reglas para utilizar XCalificator de forma segura, responsable y coherente con la autonomía docente.">
      <section><h2>1. Naturaleza del servicio</h2><p>XCalificator es software educativo de código abierto en etapa piloto. Ayuda a organizar clases, crear contenidos, recibir evidencias y producir sugerencias de calificación y retroalimentación. No reemplaza al docente, al sistema institucional de evaluación ni las decisiones de la institución.</p></section>
      <section><h2>2. Cuenta y acceso</h2><p>La persona usuaria debe proporcionar información veraz, proteger su contraseña y usar únicamente las funciones autorizadas para su rol. Las solicitudes docentes requieren aprobación administrativa. Las cuentas internas de estudiantes deben entregarse de forma segura y cambiar su contraseña inicial.</p></section>
      <section><h2>3. Menores</h2><p>Un menor solo debe utilizar la plataforma con acompañamiento y autorización verificable de su representante o institución, y con información adecuada a su edad. La aceptación de estos términos no reemplaza esa autorización.</p></section>
      <section><h2>4. Calificación asistida</h2><p>La IA puede equivocarse, omitir información o interpretar mal una imagen. La sugerencia, confianza o retroalimentación no constituye una decisión definitiva. El docente debe revisar las alertas y conserva la responsabilidad de confirmar, ajustar o rechazar antes de publicar.</p></section>
      <section><h2>5. Uso permitido</h2><ul><li>Cargar únicamente información que esté autorizado a tratar.</li><li>Usar resultados como apoyo pedagógico y verificar su pertinencia.</li><li>Respetar derechos de autor, privacidad, convivencia y normas institucionales.</li></ul></section>
      <section><h2>6. Uso prohibido</h2><ul><li>Suplantar personas, compartir credenciales o eludir permisos.</li><li>Cargar material ilegal, discriminatorio, dañino o ajeno sin autorización.</li><li>Publicar datos académicos o evidencias fuera de los destinatarios autorizados.</li><li>Usar la IA para tomar decisiones adversas sin revisión humana.</li><li>Atacar, automatizar abusivamente o interferir con la disponibilidad del servicio.</li></ul></section>
      <section><h2>7. Proveedores y APIs del docente</h2><p>Cuando un docente conecta una API propia, debe contar con autorización institucional y revisar las condiciones del proveedor antes de enviar datos estudiantiles. XCalificator no convierte una credencial personal en un canal automáticamente autorizado.</p></section>
      <section><h2>8. Propiedad intelectual</h2><p>La consulta pública del repositorio no concede por sí sola permisos de copia, modificación o redistribución mientras no exista una licencia expresa publicada. Los usuarios conservan los derechos que les correspondan sobre sus materiales y deben respetar licencias, autorías y atribuciones de libros, imágenes y recursos cargados.</p></section>
      <section><h2>9. Disponibilidad y cambios</h2><p>Al ser un piloto, pueden existir mantenimientos, errores o cambios. Se procurará proteger evidencias y trabajos en curso, pero no se garantiza disponibilidad ininterrumpida. Los cambios que afecten derechos o aceptación se informarán de manera clara.</p></section>
      <section><h2>10. Suspensión</h2><p>Una cuenta puede suspenderse para proteger estudiantes, datos o infraestructura, o ante incumplimiento grave. La medida debe ser proporcional y permitir revisión cuando corresponda.</p></section>
      <section><h2>11. Ley y contacto</h2><p>Estos términos se interpretan conforme a la legislación colombiana. Las consultas pueden enviarse a <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</p></section>
    </LegalLayout>
  );
}

export function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies y almacenamiento local" summary="Inventario de la información que el navegador conserva para sesión, seguridad y preferencias.">
      <section><h2>1. Cookies necesarias</h2><div className="overflow-x-auto"><table><thead><tr><th>Nombre</th><th>Finalidad</th><th>Duración máxima</th></tr></thead><tbody><tr><td><code>access_token</code></td><td>Mantener la sesión autenticada y aplicar permisos.</td><td>Hasta 60 minutos en la configuración base; puede ser menor según el despliegue.</td></tr><tr><td><code>refresh_token</code></td><td>Renovar de forma segura una sesión válida.</td><td>Hasta 7 días en la configuración base; puede ser menor según el despliegue.</td></tr><tr><td><code>xcalificator_csrf</code></td><td>Prevenir solicitudes maliciosas realizadas con una sesión ajena.</td><td>Hasta 7 días en la configuración base; puede ser menor según el despliegue.</td></tr></tbody></table></div><p>Estas cookies son necesarias para iniciar sesión y proteger operaciones. No se usan para publicidad.</p></section>
      <section><h2>2. Almacenamiento local funcional</h2><p>El navegador puede conservar preferencias como tema, movimiento reducido, recorridos vistos, último correo escrito y referencias de trabajos en segundo plano. Esto evita perder contexto o repetir configuraciones. No se usa para crear perfiles publicitarios.</p></section>
      <section><h2>3. Medición de rendimiento</h2><p>Producción utiliza Cloudflare Web Analytics para métricas técnicas de carga. Según su documentación, no utiliza cookies ni <code>localStorage</code> y no crea huellas individuales para esta medición. Consulte la <a href="https://developers.cloudflare.com/web-analytics/about/" target="_blank" rel="noreferrer">documentación de Cloudflare Web Analytics</a>.</p></section>
      <section><h2>4. Controles</h2><p>Puede borrar cookies y almacenamiento desde el navegador. Si bloquea las cookies necesarias, no podrá iniciar o mantener sesión. Si en el futuro se añaden cookies no necesarias, se actualizará esta política y se solicitará la elección correspondiente antes de cargarlas cuando la ley lo exija.</p></section>
    </LegalLayout>
  );
}

export function PrivacyNoticePage() {
  return (
    <LegalLayout title="Aviso de privacidad" summary="Resumen breve del tratamiento. La política completa prevalece y permanece disponible en todo momento.">
      <section><h2>Responsable</h2><p>Proyecto XCalificator, desarrollado por {LEGAL_PROJECT_OWNERS}, {LEGAL_PROJECT_LOCATION}. Contacto: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</p></section>
      <section><h2>Tratamiento y finalidades</h2><p>Tratamos datos de cuenta, académicos, evidencias, seguridad y uso para prestar la plataforma educativa, asistir la creación y revisión de actividades, proteger el servicio, atender solicitudes y, solo con autorización separada, realizar mediciones del estudio.</p></section>
      <section><h2>IA y menores</h2><p>Parte de la evidencia puede enviarse al proveedor de IA configurado para producir una sugerencia revisada por el docente. El tratamiento de menores exige garantías reforzadas y autorización verificable; responder preguntas sobre datos sensibles es facultativo salvo obligación legal debidamente informada.</p></section>
      <section><h2>Derechos</h2><p>Puede conocer, actualizar, rectificar, solicitar prueba y uso, revocar o pedir supresión cuando proceda y presentar queja ante la SIC. Consulte la <a href="/privacidad">política completa</a> para el procedimiento y demás condiciones.</p></section>
    </LegalLayout>
  );
}

export function PilotInformationPage() {
  return (
    <LegalLayout title="Información sobre el piloto y la investigación" summary="Usar XCalificator y participar en la investigación son decisiones relacionadas, pero jurídicamente distintas.">
      <section><h2>1. Propósito</h2><p>El piloto busca conocer si la calificación asistida con LLM, OCR y RAG reduce tiempo docente y mejora la calidad de la retroalimentación en una institución educativa de Mocoa.</p></section>
      <section><h2>2. Voluntariedad</h2><p>Crear o utilizar una cuenta no significa aceptar participar en la investigación. La recolección de tiempos, encuestas, entrevistas o análisis con fines de tesis requiere información y consentimiento específicos. Negarse o retirarse del estudio no debe afectar notas, acceso educativo ni relación con la institución.</p></section>
      <section><h2>3. Participantes menores</h2><p>Cuando el estudio incluya datos de estudiantes menores se requiere el marco institucional, autorización del representante legal y asentimiento del estudiante cuando sea pertinente según edad y madurez. Se debe explicar en lenguaje comprensible qué se medirá y cómo se protegerá.</p></section>
      <section><h2>4. Resultados</h2><p>Los informes de tesis deben usar información agregada o anonimizada y evitar nombres, correos, fotografías o resultados que permitan identificar estudiantes. Las evidencias académicas no deben publicarse como anexos identificables.</p></section>
      <section><h2>5. Contacto</h2><p>Para preguntas sobre participación, retiro o uso de información escriba a <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> y contacte también al responsable designado por la institución.</p></section>
    </LegalLayout>
  );
}
