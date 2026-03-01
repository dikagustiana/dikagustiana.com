import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateFinanceModel, type FinanceModel } from '@/hooks/queries/useFinanceModels';
import type { FinanceModule } from '@/hooks/queries/useFinance';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  model: FinanceModel;
  allModules: FinanceModule[];
}

export function FinanceModelAdminPanel({ model, allModules }: Props) {
  const update = useUpdateFinanceModel();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(model.description || '');
  const [depth, setDepth] = useState(model.depth);
  const [flagship, setFlagship] = useState(model.is_flagship);
  const [selectedRefs, setSelectedRefs] = useState<string[]>(model.module_references || []);
  const [docs, setDocs] = useState(model.documentation || {});
  const [uploading, setUploading] = useState(false);

  const save = (field: string, value: unknown) => {
    update.mutate(
      { id: model.id, data: { [field]: value } },
      { onSuccess: () => toast({ title: 'Saved' }) }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.xlsx')) {
      toast({ title: 'Only .xlsx files are accepted', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const path = `${model.slug}/${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from('finance-models')
      .upload(path, file, { upsert: true });
    if (uploadErr) {
      toast({ title: 'Upload failed', description: uploadErr.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('finance-models').getPublicUrl(path);
    const newVersion = `v${parseFloat(model.version.replace('v', '')) + 0.1}`;
    update.mutate(
      { id: model.id, data: { excel_file_url: urlData.publicUrl, version: newVersion, last_updated: new Date().toISOString().slice(0, 10) } },
      {
        onSuccess: () => { toast({ title: 'File uploaded' }); setUploading(false); },
        onError: () => setUploading(false),
      }
    );
  };

  const toggleRef = (id: string) => {
    setSelectedRefs(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground"
      >
        Admin Controls
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6">
          {/* Upload */}
          <div>
            <Label>Upload Model File (.xlsx)</Label>
            <Input type="file" accept=".xlsx" onChange={handleFileUpload} disabled={uploading} className="mt-1" />
          </div>

          <Separator />

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1" />
            <Button size="sm" className="mt-2" onClick={() => save('description', description)}>Save</Button>
          </div>

          <Separator />

          {/* Documentation */}
          <div>
            <Label className="text-base font-semibold">Model Documentation</Label>
            {(['objective', 'mechanics', 'inputs', 'outputs', 'decision', 'limitations'] as const).map(key => (
              <div key={key} className="mt-3">
                <Label className="capitalize">{key === 'decision' ? 'Strategic Decision Supported' : key === 'mechanics' ? 'Core Mechanics' : key === 'inputs' ? 'Key Inputs' : key === 'outputs' ? 'Key Outputs' : key === 'limitations' ? 'Known Limitations' : 'Objective'}</Label>
                <Textarea
                  value={(docs as Record<string, string>)[key] || ''}
                  onChange={e => setDocs(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="mt-1"
                />
              </div>
            ))}
            <Button size="sm" className="mt-2" onClick={() => save('documentation', docs)}>Save Documentation</Button>
          </div>

          <Separator />

          {/* Module References */}
          <div>
            <Label>Module References</Label>
            <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded p-2 space-y-1">
              {allModules.map(mod => (
                <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedRefs.includes(mod.id)}
                    onChange={() => toggleRef(mod.id)}
                  />
                  <span className="text-muted-foreground text-xs">{mod.track_slug}</span>
                  <span>{mod.title}</span>
                </label>
              ))}
            </div>
            <Button size="sm" className="mt-2" onClick={() => save('module_references', selectedRefs)}>Save References</Button>
          </div>

          <Separator />

          {/* Flagship */}
          <div className="flex items-center gap-3">
            <Switch checked={flagship} onCheckedChange={v => { setFlagship(v); save('is_flagship', v); }} />
            <Label>Mark as Flagship Model</Label>
          </div>

          {/* Depth */}
          <div>
            <Label>Depth Indicator</Label>
            <Select value={depth} onValueChange={(v: 'foundation' | 'executive' | 'institutional') => { setDepth(v); save('depth', v); }}>
              <SelectTrigger className="w-48 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="institutional">Institutional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
