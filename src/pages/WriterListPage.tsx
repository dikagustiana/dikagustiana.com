import { useParams } from 'react-router-dom';
import { WriterList } from '@/components/writer/WriterList';

export default function WriterListPage() {
  const { section } = useParams<{ section: string }>();

  const validSection = section || 'next-big-thing';

  return <WriterList section={validSection} />;
}
