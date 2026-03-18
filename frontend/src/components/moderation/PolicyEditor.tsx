'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { VIOLATION_CATEGORY_LABELS } from '@/lib/constants';
import type { Policy, ViolationCategory, PolicyAction } from '@/types/moderation';

const CATEGORIES: ViolationCategory[] = [
  'violence', 'nudity', 'drugs', 'hate_symbols', 'spam', 'misinformation', 'other',
];
const ACTIONS: PolicyAction[] = ['auto_flag', 'auto_reject', 'escalate', 'notify'];
const ACTION_LABELS: Record<PolicyAction, string> = {
  auto_flag: 'Auto Flag',
  auto_reject: 'Auto Reject',
  escalate: 'Escalate',
  notify: 'Notify',
};

const ruleSchema = z.object({
  category: z.enum(['violence', 'nudity', 'drugs', 'hate_symbols', 'spam', 'misinformation', 'other']),
  threshold: z.number().min(0).max(1),
  action: z.enum(['auto_flag', 'auto_reject', 'escalate', 'notify']),
});

const policySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  categories: z.array(z.string()).min(1, 'Select at least one category'),
  rules: z.array(ruleSchema),
  actions: z.array(z.string()),
  is_active: z.boolean(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface PolicyEditorProps {
  policy?: Policy;
  onSubmit: (values: PolicyFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PolicyEditor({ policy, onSubmit, onCancel, isSubmitting }: PolicyEditorProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: policy
      ? {
          name: policy.name,
          description: policy.description ?? '',
          categories: policy.categories,
          rules: policy.rules,
          actions: policy.actions,
          is_active: policy.is_active,
        }
      : {
          name: '',
          description: '',
          categories: [],
          rules: [],
          actions: ['auto_flag'],
          is_active: true,
        },
  });

  const { fields: ruleFields, append: appendRule, remove: removeRule } = useFieldArray({
    control,
    name: 'rules',
  });

  const selectedCategories = watch('categories');
  const selectedActions = watch('actions');

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setValue('categories', next, { shouldValidate: true });
  };

  const toggleAction = (action: string) => {
    const next = selectedActions.includes(action)
      ? selectedActions.filter((a) => a !== action)
      : [...selectedActions, action];
    setValue('actions', next);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name & description */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Policy name</Label>
          <Input id="name" placeholder="e.g. Strict Violence Policy" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" placeholder="Describe this policy…" rows={2} {...register('description')} />
        </div>
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Content categories</h3>
        {errors.categories && (
          <p className="text-xs text-destructive">{errors.categories.message}</p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent"
            >
              <Checkbox
                checked={selectedCategories.includes(cat)}
                onCheckedChange={() => toggleCategory(cat)}
              />
              <span className="text-sm">{VIOLATION_CATEGORY_LABELS[cat]}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Rules</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendRule({ category: 'violence', threshold: 0.7, action: 'auto_flag' })}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add rule
          </Button>
        </div>

        {ruleFields.length === 0 && (
          <p className="text-xs text-muted-foreground">No rules yet. Add a rule to define thresholds per category.</p>
        )}

        <div className="space-y-3">
          {ruleFields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2 rounded-md border p-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Category</Label>
                <Controller
                  control={control}
                  name={`rules.${index}.category`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-xs">
                            {VIOLATION_CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">Threshold (0–1)</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  className="h-8 text-xs"
                  {...register(`rules.${index}.threshold`, { valueAsNumber: true })}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Action</Label>
                <Controller
                  control={control}
                  name={`rules.${index}.action`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map((a) => (
                          <SelectItem key={a} value={a} className="text-xs">
                            {ACTION_LABELS[a]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeRule(index)}
                aria-label="Remove rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Default actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Default actions</h3>
        <div className="flex flex-wrap gap-3">
          {ACTIONS.map((action) => (
            <label key={action} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={selectedActions.includes(action)}
                onCheckedChange={() => toggleAction(action)}
              />
              <span className="text-sm">{ACTION_LABELS[action]}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">
            Inactive policies are saved but not applied during moderation
          </p>
        </div>
        <Controller
          control={control}
          name="is_active"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : policy ? 'Save changes' : 'Create policy'}
        </Button>
      </div>
    </form>
  );
}
