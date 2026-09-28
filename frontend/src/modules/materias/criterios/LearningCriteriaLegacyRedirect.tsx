import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { routes } from '@/config/routes';
import { queryKeys } from '@/config/queryKeys';
import { getLearningCriteriaCapabilities } from './api';
import { MateriaDbaPage } from '../MateriaDbaPage';

export function LearningCriteriaLegacyRedirect() {
  const { id = '' } = useParams();
  const location = useLocation();
  const capabilities = useQuery({
    queryKey: queryKeys.materias.learningCriteriaCapabilities,
    queryFn: getLearningCriteriaCapabilities,
    retry: false,
  });
  if (!capabilities.data?.ui) return <MateriaDbaPage />;
  return <Navigate replace to={`${routes.materiaCriterios(id)}${location.search}${location.hash}`} />;
}
