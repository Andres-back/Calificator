import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { isInstalledApp } from '@/lib/installedApp';

export function HomeScreenGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [platform, setPlatform] = useState<'android' | 'iphone'>(() => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iphone' : 'android');
  return createPortal(<Modal open={open} onClose={onClose} title="Añadir XCalificator al inicio" description="Un acceso directo para entrar sin buscar el sitio. Requiere internet y tu cuenta habitual.">
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Elige tu celular">
        <Button variant={platform === 'android' ? 'primary' : 'outline'} aria-pressed={platform === 'android'} onClick={() => setPlatform('android')}>Android</Button>
        <Button variant={platform === 'iphone' ? 'primary' : 'outline'} aria-pressed={platform === 'iphone'} onClick={() => setPlatform('iphone')}>iPhone</Button>
      </div>
      <ol className="list-decimal space-y-3 pl-6 text-base leading-7 text-fg">
        {platform === 'iphone' ? <>
          <li>Abre XCalificator en <strong>Safari</strong> en tu iPhone.</li>
          <li>Toca <strong>Compartir</strong> en el menú del navegador.</li>
          <li>Elige <strong>Agregar a inicio</strong> o <strong>Añadir a pantalla de inicio</strong> y confirma en <strong>Agregar</strong>.</li>
        </> : <>
          <li>Abre XCalificator en <strong>Chrome</strong> en tu celular.</li>
          <li>Toca el menú de los <strong>tres puntos</strong> del navegador.</li>
          <li>Elige <strong>Agregar a pantalla principal</strong> o <strong>Instalar app</strong>, si aparece, y confirma.</li>
        </>}
      </ol>
      <p className="rounded-xl bg-surface-2 p-3 text-sm leading-6 text-secondary">¿Lo abriste desde WhatsApp? Usa «Abrir en navegador» para ir a Safari o Chrome. Si no aparece la opción de añadir, puedes guardar el sitio como favorito.</p>
      <p className="hidden text-sm leading-6 text-secondary sm:block">¿Estás en computador? Abre <span className="font-semibold text-fg [overflow-wrap:anywhere]">xcalificator.daimuz.com</span> en tu celular y sigue estos pasos. No necesitas una extensión ni descargar un archivo.</p>
      <Button fullWidth onClick={onClose}>Entendido</Button>
    </div>
  </Modal>, document.body);
}

export function HomeScreenShortcut({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  if (isInstalledApp()) return null;
  return <>
    <Button variant="outline" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}><Smartphone className="h-4 w-4" aria-hidden="true" /> Añadir al inicio</Button>
    <HomeScreenGuide open={open} onClose={() => setOpen(false)} />
  </>;
}
