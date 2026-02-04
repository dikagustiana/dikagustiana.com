import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EssayTemplateType, getTemplateOptions, essayTemplates } from '@/lib/essayTemplates';
import { FileText, BarChart3, BookOpen, GraduationCap, File } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplate: EssayTemplateType;
  onTemplateSelect: (template: EssayTemplateType) => void;
  disabled?: boolean;
}

const templateIcons: Record<EssayTemplateType, React.ReactNode> = {
  blank: <File className="h-4 w-4" />,
  essay: <FileText className="h-4 w-4" />,
  analysis: <BarChart3 className="h-4 w-4" />,
  'case-study': <BookOpen className="h-4 w-4" />,
  tutorial: <GraduationCap className="h-4 w-4" />,
};

const templateDescriptions: Record<EssayTemplateType, string> = {
  blank: 'Start with empty fields',
  essay: 'Introduction, Context, Key Points, Analysis, Conclusion',
  analysis: 'Problem Statement, Assumptions, Evidence, Findings',
  'case-study': 'Background, Problem, Actions, Results, Lessons',
  tutorial: 'Objective, Requirements, Steps, Tips, Conclusion',
};

export function TemplateSelector({ 
  selectedTemplate, 
  onTemplateSelect,
  disabled = false,
}: TemplateSelectorProps) {
  const options = getTemplateOptions();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Template</CardTitle>
        <CardDescription>
          Select a template to auto-fill fields, or start blank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="template">Choose Template</Label>
            <Select 
              value={selectedTemplate} 
              onValueChange={(v) => onTemplateSelect(v as EssayTemplateType)}
              disabled={disabled}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {templateIcons[opt.value]}
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedTemplate !== 'blank' && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <strong>Structure:</strong> {templateDescriptions[selectedTemplate]}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
