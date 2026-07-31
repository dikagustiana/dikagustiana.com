import { useState, useEffect } from 'react';
import { VoiceRole } from '@/components/layouts/PageLayout';
import { contentTemplates, TemplateField, validateContentAgainstTemplate } from './ContentTemplates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';

interface EssayTemplateFormProps {
  role: VoiceRole;
  initialValues?: Record<string, string | string[]>;
  onValuesChange?: (values: Record<string, string | string[]>) => void;
  onContentValidation?: (isValid: boolean, violations: string[]) => void;
}

export function EssayTemplateForm({
  role,
  initialValues = {},
  onValuesChange,
  onContentValidation,
}: EssayTemplateFormProps) {
  const template = contentTemplates[role];
  const [values, setValues] = useState<Record<string, string | string[]>>(initialValues);
  const [arrayInputs, setArrayInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize array fields
    const newArrayInputs: Record<string, string> = {};
    template.fields.forEach((field) => {
      if (field.type === 'array' && !values[field.key]) {
        setValues((prev) => ({ ...prev, [field.key]: [] }));
      }
    });
    setArrayInputs(newArrayInputs);
  }, [template, values]);

  const handleChange = (key: string, value: string) => {
    const newValues = { ...values, [key]: value };
    setValues(newValues);
    onValuesChange?.(newValues);

    // Validate full content
    const fullContent = Object.values(newValues)
      .filter((v) => typeof v === 'string')
      .join(' ');
    const validation = validateContentAgainstTemplate(fullContent, role);
    onContentValidation?.(validation.valid, validation.violations);
  };

  const handleArrayAdd = (key: string) => {
    const inputValue = arrayInputs[key]?.trim();
    if (!inputValue) return;

    const currentArray = (values[key] as string[]) || [];
    const newValues = { ...values, [key]: [...currentArray, inputValue] };
    setValues(newValues);
    setArrayInputs((prev) => ({ ...prev, [key]: '' }));
    onValuesChange?.(newValues);
  };

  const handleArrayRemove = (key: string, index: number) => {
    const currentArray = (values[key] as string[]) || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    const newValues = { ...values, [key]: newArray };
    setValues(newValues);
    onValuesChange?.(newValues);
  };

  const renderField = (field: TemplateField) => {
    if (field.type === 'array') {
      const items = (values[field.key] as string[]) || [];
      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              id={field.key}
              value={arrayInputs[field.key] || ''}
              onChange={(e) =>
                setArrayInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleArrayAdd(field.key);
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => handleArrayAdd(field.key)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {items.map((item, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {item}
                  <button
                    type="button"
                    onClick={() => handleArrayRemove(field.key, index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            id={field.key}
            value={(values[field.key] as string) || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          id={field.key}
          value={(values[field.key] as string) || ''}
          onChange={(e) => handleChange(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {template.name}
          <Badge variant="outline" className="capitalize">
            {role}
          </Badge>
        </CardTitle>
        <CardDescription>
          Fill in the required fields for this content type. Avoid forbidden patterns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {template.fields.map(renderField)}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Forbidden Patterns (Avoid These)
          </h4>
          <div className="flex flex-wrap gap-2">
            {template.forbiddenPatterns.map((pattern, index) => (
              <Badge key={index} variant="destructive" className="text-xs">
                {pattern}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
