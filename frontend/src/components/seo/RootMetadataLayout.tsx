import { Outlet } from 'react-router-dom';
import { RouteMetadata } from './RouteMetadata';

export function RootMetadataLayout() {
  return (
    <>
      <RouteMetadata />
      <Outlet />
    </>
  );
}
