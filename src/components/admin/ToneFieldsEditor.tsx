import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { 
  VoiceRole, 
  ManagerFields, 
  EconomistFields, 
  EducatorFields, 
  CoachFields 
} from '@/lib/types/toneFields';

interface ToneFieldsEditorProps {
  role: VoiceRole;
  managerFields: Partial<ManagerFields>;
  economistFields: Partial<EconomistFields>;
  educatorFields: Partial<EducatorFields>;
  coachFields: Partial<CoachFields>;
  onManagerFieldsChange: (fields: Partial<ManagerFields>) => void;
  onEconomistFieldsChange: (fields: Partial<EconomistFields>) => void;
  onEducatorFieldsChange: (fields: Partial<EducatorFields>) => void;
  onCoachFieldsChange: (fields: Partial<CoachFields>) => void;
}

export function ToneFieldsEditor({
  role,
  managerFields,
  economistFields,
  educatorFields,
  coachFields,
  onManagerFieldsChange,
  onEconomistFieldsChange,
  onEducatorFieldsChange,
  onCoachFieldsChange,
}: ToneFieldsEditorProps) {
  const [procedureInput, setProcedureInput] = useState('');
  const [errorInput, setErrorInput] = useState({ error: '', consequence: '' });
  const [benefitInput, setBenefitInput] = useState('');
  const [loserInput, setLoserInput] = useState('');
  const [tradeoffInput, setTradeoffInput] = useState({ gain: '', sacrifice: '' });
  const [effectInput, setEffectInput] = useState('');
  const [methodInput, setMethodInput] = useState('');

  if (role === 'hybrid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hybrid Content</CardTitle>
          <CardDescription>
            Hybrid content does not require specific tone fields. Use basic content fields above.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (role === 'manager') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Manager Tone Fields
            <Badge variant="outline">Required</Badge>
          </CardTitle>
          <CardDescription>
            Finance/Accounting content - procedural, decision-focused
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>When You Need This *</Label>
            <Textarea
              value={managerFields.whenYouNeedThis || ''}
              onChange={(e) => onManagerFieldsChange({ ...managerFields, whenYouNeedThis: e.target.value })}
              placeholder="When [situation], use this."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>What to Calculate *</Label>
            <Textarea
              value={managerFields.whatToCalculate || ''}
              onChange={(e) => onManagerFieldsChange({ ...managerFields, whatToCalculate: e.target.value })}
              placeholder="Calculate [X] by [formula]."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Decision Supported *</Label>
            <Input
              value={managerFields.decisionSupported || ''}
              onChange={(e) => onManagerFieldsChange({ ...managerFields, decisionSupported: e.target.value })}
              placeholder="The decision this supports: [question]"
            />
          </div>

          <div className="space-y-2">
            <Label>Procedure Steps *</Label>
            <div className="flex gap-2">
              <Input
                value={procedureInput}
                onChange={(e) => setProcedureInput(e.target.value)}
                placeholder="Add a step..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && procedureInput.trim()) {
                    e.preventDefault();
                    onManagerFieldsChange({ 
                      ...managerFields, 
                      procedure: [...(managerFields.procedure || []), procedureInput.trim()] 
                    });
                    setProcedureInput('');
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  if (procedureInput.trim()) {
                    onManagerFieldsChange({ 
                      ...managerFields, 
                      procedure: [...(managerFields.procedure || []), procedureInput.trim()] 
                    });
                    setProcedureInput('');
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(managerFields.procedure || []).length > 0 && (
              <ol className="list-decimal list-inside space-y-1 mt-2">
                {managerFields.procedure!.map((step, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="flex-1">{step}</span>
                    <button
                      type="button"
                      onClick={() => onManagerFieldsChange({
                        ...managerFields,
                        procedure: managerFields.procedure!.filter((_, i) => i !== idx)
                      })}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="space-y-2">
            <Label>Common Errors *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={errorInput.error}
                onChange={(e) => setErrorInput({ ...errorInput, error: e.target.value })}
                placeholder="The error..."
              />
              <Input
                value={errorInput.consequence}
                onChange={(e) => setErrorInput({ ...errorInput, consequence: e.target.value })}
                placeholder="The consequence..."
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (errorInput.error.trim() && errorInput.consequence.trim()) {
                  onManagerFieldsChange({
                    ...managerFields,
                    commonErrors: [...(managerFields.commonErrors || []), errorInput]
                  });
                  setErrorInput({ error: '', consequence: '' });
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Error
            </Button>
            {(managerFields.commonErrors || []).length > 0 && (
              <div className="space-y-2 mt-2">
                {managerFields.commonErrors!.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Error: {item.error}</p>
                      <p className="text-sm text-muted-foreground">Consequence: {item.consequence}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onManagerFieldsChange({
                        ...managerFields,
                        commonErrors: managerFields.commonErrors!.filter((_, i) => i !== idx)
                      })}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (role === 'economist') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Economist Tone Fields
            <Badge variant="outline">Required</Badge>
          </CardTitle>
          <CardDescription>
            Green Transition/Next Big Thing content - trade-offs, winners/losers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Core Question *</Label>
            <Textarea
              value={economistFields.coreQuestion || ''}
              onChange={(e) => onEconomistFieldsChange({ ...economistFields, coreQuestion: e.target.value })}
              placeholder="The core question: [provocative framing]?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Why This is Happening *</Label>
            <Textarea
              value={economistFields.whyHappening || ''}
              onChange={(e) => onEconomistFieldsChange({ ...economistFields, whyHappening: e.target.value })}
              placeholder="This is happening because [structural force]."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Who Benefits *</Label>
              <div className="flex gap-2">
                <Input
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  placeholder="Add beneficiary..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && benefitInput.trim()) {
                      e.preventDefault();
                      onEconomistFieldsChange({ 
                        ...economistFields, 
                        whoBenefits: [...(economistFields.whoBenefits || []), benefitInput.trim()] 
                      });
                      setBenefitInput('');
                    }
                  }}
                />
                <Button type="button" size="icon" variant="outline" onClick={() => {
                  if (benefitInput.trim()) {
                    onEconomistFieldsChange({ 
                      ...economistFields, 
                      whoBenefits: [...(economistFields.whoBenefits || []), benefitInput.trim()] 
                    });
                    setBenefitInput('');
                  }
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(economistFields.whoBenefits || []).map((item, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {item}
                    <button type="button" onClick={() => onEconomistFieldsChange({
                      ...economistFields,
                      whoBenefits: economistFields.whoBenefits!.filter((_, i) => i !== idx)
                    })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Who Loses *</Label>
              <div className="flex gap-2">
                <Input
                  value={loserInput}
                  onChange={(e) => setLoserInput(e.target.value)}
                  placeholder="Add loser..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && loserInput.trim()) {
                      e.preventDefault();
                      onEconomistFieldsChange({ 
                        ...economistFields, 
                        whoLoses: [...(economistFields.whoLoses || []), loserInput.trim()] 
                      });
                      setLoserInput('');
                    }
                  }}
                />
                <Button type="button" size="icon" variant="outline" onClick={() => {
                  if (loserInput.trim()) {
                    onEconomistFieldsChange({ 
                      ...economistFields, 
                      whoLoses: [...(economistFields.whoLoses || []), loserInput.trim()] 
                    });
                    setLoserInput('');
                  }
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(economistFields.whoLoses || []).map((item, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {item}
                    <button type="button" onClick={() => onEconomistFieldsChange({
                      ...economistFields,
                      whoLoses: economistFields.whoLoses!.filter((_, i) => i !== idx)
                    })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trade-offs *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={tradeoffInput.gain}
                onChange={(e) => setTradeoffInput({ ...tradeoffInput, gain: e.target.value })}
                placeholder="Gain..."
              />
              <Input
                value={tradeoffInput.sacrifice}
                onChange={(e) => setTradeoffInput({ ...tradeoffInput, sacrifice: e.target.value })}
                placeholder="Sacrifice..."
              />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => {
              if (tradeoffInput.gain.trim() && tradeoffInput.sacrifice.trim()) {
                onEconomistFieldsChange({
                  ...economistFields,
                  tradeOffs: [...(economistFields.tradeOffs || []), tradeoffInput]
                });
                setTradeoffInput({ gain: '', sacrifice: '' });
              }
            }}>
              <Plus className="h-4 w-4 mr-1" /> Add Trade-off
            </Button>
            {(economistFields.tradeOffs || []).length > 0 && (
              <div className="space-y-2 mt-2">
                {economistFields.tradeOffs!.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="text-green-600">{item.gain}</span>
                    <span>↔</span>
                    <span className="text-red-600">{item.sacrifice}</span>
                    <button type="button" onClick={() => onEconomistFieldsChange({
                      ...economistFields,
                      tradeOffs: economistFields.tradeOffs!.filter((_, i) => i !== idx)
                    })} className="ml-auto text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Second-Order Effects *</Label>
            <div className="flex gap-2">
              <Input
                value={effectInput}
                onChange={(e) => setEffectInput(e.target.value)}
                placeholder="Add effect..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && effectInput.trim()) {
                    e.preventDefault();
                    onEconomistFieldsChange({ 
                      ...economistFields, 
                      secondOrderEffects: [...(economistFields.secondOrderEffects || []), effectInput.trim()] 
                    });
                    setEffectInput('');
                  }
                }}
              />
              <Button type="button" size="icon" variant="outline" onClick={() => {
                if (effectInput.trim()) {
                  onEconomistFieldsChange({ 
                    ...economistFields, 
                    secondOrderEffects: [...(economistFields.secondOrderEffects || []), effectInput.trim()] 
                  });
                  setEffectInput('');
                }
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(economistFields.secondOrderEffects || []).map((item, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {item}
                  <button type="button" onClick={() => onEconomistFieldsChange({
                    ...economistFields,
                    secondOrderEffects: economistFields.secondOrderEffects!.filter((_, i) => i !== idx)
                  })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (role === 'educator') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Educator Tone Fields
            <Badge variant="outline">Required</Badge>
          </CardTitle>
          <CardDescription>
            Books content - militant, directive, Tan Malaka-inspired
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>The Ignorance This Fights *</Label>
            <Textarea
              value={educatorFields.ignoranceFought || ''}
              onChange={(e) => onEducatorFieldsChange({ ...educatorFields, ignoranceFought: e.target.value })}
              placeholder="This ignorance enables [specific harm]."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Skill Sharpened *</Label>
            <Input
              value={educatorFields.skillSharpened || ''}
              onChange={(e) => onEducatorFieldsChange({ ...educatorFields, skillSharpened: e.target.value })}
              placeholder="After reading, you will be able to [concrete skill]."
            />
          </div>

          <div className="space-y-2">
            <Label>Why Needed Now *</Label>
            <Textarea
              value={educatorFields.whyNeededNow || ''}
              onChange={(e) => onEducatorFieldsChange({ ...educatorFields, whyNeededNow: e.target.value })}
              placeholder="This is urgent now because [current context]."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <Label>How to Read</Label>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Reading Sequence *</Label>
              <Input
                value={educatorFields.howToRead?.sequence || ''}
                onChange={(e) => onEducatorFieldsChange({ 
                  ...educatorFields, 
                  howToRead: { ...educatorFields.howToRead, sequence: e.target.value } as any
                })}
                placeholder="Read chapters [X-Y] first..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">What to Skip *</Label>
              <Input
                value={educatorFields.howToRead?.skip || ''}
                onChange={(e) => onEducatorFieldsChange({ 
                  ...educatorFields, 
                  howToRead: { ...educatorFields.howToRead, skip: e.target.value } as any
                })}
                placeholder="Skip [Z]..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Companion Activities *</Label>
              <Textarea
                value={educatorFields.howToRead?.companionActivities || ''}
                onChange={(e) => onEducatorFieldsChange({ 
                  ...educatorFields, 
                  howToRead: { ...educatorFields.howToRead, companionActivities: e.target.value } as any
                })}
                placeholder="While reading, [activity]..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (role === 'coach') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Coach Tone Fields
            <Badge variant="outline">Required</Badge>
          </CardTitle>
          <CardDescription>
            IELTS content - metrics-driven, deliberate practice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Score *</Label>
              <Input
                value={coachFields.targetScore || ''}
                onChange={(e) => onCoachFieldsChange({ ...coachFields, targetScore: e.target.value })}
                placeholder="e.g., Band 7.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Time Required *</Label>
              <Input
                value={coachFields.timeRequired || ''}
                onChange={(e) => onCoachFieldsChange({ ...coachFields, timeRequired: e.target.value })}
                placeholder="e.g., 40 minutes"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Task Description *</Label>
            <Textarea
              value={coachFields.taskDescription || ''}
              onChange={(e) => onCoachFieldsChange({ ...coachFields, taskDescription: e.target.value })}
              placeholder="The task: [exact description]."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Scoring Criteria *</Label>
            <Textarea
              value={coachFields.scoringCriteria || ''}
              onChange={(e) => onCoachFieldsChange({ ...coachFields, scoringCriteria: e.target.value })}
              placeholder="How performance is measured..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Method Steps *</Label>
            <div className="flex gap-2">
              <Input
                value={methodInput}
                onChange={(e) => setMethodInput(e.target.value)}
                placeholder="Add a step..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && methodInput.trim()) {
                    e.preventDefault();
                    onCoachFieldsChange({ 
                      ...coachFields, 
                      method: [...(coachFields.method || []), methodInput.trim()] 
                    });
                    setMethodInput('');
                  }
                }}
              />
              <Button type="button" size="icon" variant="outline" onClick={() => {
                if (methodInput.trim()) {
                  onCoachFieldsChange({ 
                    ...coachFields, 
                    method: [...(coachFields.method || []), methodInput.trim()] 
                  });
                  setMethodInput('');
                }
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(coachFields.method || []).length > 0 && (
              <ol className="list-decimal list-inside space-y-1 mt-2">
                {coachFields.method!.map((step, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="flex-1">{step}</span>
                    <button type="button" onClick={() => onCoachFieldsChange({
                      ...coachFields,
                      method: coachFields.method!.filter((_, i) => i !== idx)
                    })} className="text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="space-y-4">
            <Label>Practice Protocol</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Frequency *</Label>
                <Input
                  value={coachFields.practiceProtocol?.frequency || ''}
                  onChange={(e) => onCoachFieldsChange({ 
                    ...coachFields, 
                    practiceProtocol: { ...coachFields.practiceProtocol, frequency: e.target.value } as any
                  })}
                  placeholder="e.g., Daily"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Duration *</Label>
                <Input
                  value={coachFields.practiceProtocol?.duration || ''}
                  onChange={(e) => onCoachFieldsChange({ 
                    ...coachFields, 
                    practiceProtocol: { ...coachFields.practiceProtocol, duration: e.target.value } as any
                  })}
                  placeholder="e.g., 30 minutes"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Feedback Loop *</Label>
                <Input
                  value={coachFields.practiceProtocol?.feedbackLoop || ''}
                  onChange={(e) => onCoachFieldsChange({ 
                    ...coachFields, 
                    practiceProtocol: { ...coachFields.practiceProtocol, feedbackLoop: e.target.value } as any
                  })}
                  placeholder="How to self-assess"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
