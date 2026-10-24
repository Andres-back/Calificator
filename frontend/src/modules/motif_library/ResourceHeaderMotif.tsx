import { readDecorationUrl } from './resourceDecoration';

export function ResourceHeaderMotif({ content }: { content: unknown }) {
  const src = readDecorationUrl(content);
  return src ? <div className="mb-3 flex justify-end"><img key={src} src={src} alt="" aria-hidden="true" className="h-20 w-24 object-contain" onError={event => { event.currentTarget.style.display = 'none'; }} /></div> : null;
}
