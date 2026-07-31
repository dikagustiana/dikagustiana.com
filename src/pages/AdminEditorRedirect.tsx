import { Navigate, useParams } from 'react-router-dom';

/**
 * Redirects legacy /admin/content/:id to /admin/writer/:id
 */
export default function AdminEditorRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/writer/${id}`} replace />;
}
