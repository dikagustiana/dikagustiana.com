import { useParams } from 'react-router-dom';
import { WriterEditor } from '@/components/writer';

export default function WriterEditorPage() {
  const { section, slug } = useParams<{ section: string; slug: string }>();
  
  const validSection = section === 'next-big-thing' || section === 'green-transition' 
    ? section 
    : 'next-big-thing';

  const isNew = slug === 'new';

  return (
    <WriterEditor 
      section={validSection} 
      initialSlug={isNew ? undefined : slug}
    />
  );
}
