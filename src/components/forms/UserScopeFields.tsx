import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCpls, useCategories } from '@/hooks/useMasterData';
import { UserRole } from '@/types/user.types';
import { Plus, Trash2 } from 'lucide-react';
import type { CreateUserFormData } from '@/schemas/user.schema';

/**
 * Radix `Select` boş string değeri kabul etmiyor (`SelectItem value=""`
 * atılıyor) — "tüm CPL/kategori" seçeneğini ayrı bir sentinel string ile
 * temsil ediyoruz ve cplId/categoryId'ye yazarken `null`e çeviriyoruz
 * (backend'in "hepsi" anlamı — `user-scope.entity.ts:58,61`).
 *
 * `undefined` (henüz seçilmedi) ile `null` ("Tümü" bilinçli seçildi)
 * ayrı tutulur: yeni bir satır placeholder gösterir, kullanıcı "Tümü"yü
 * DE açıkça seçmelidir — sessizce varsayılan bir seçime düşmez (§2.5'in
 * UI tarafı: boş bırakılan bir alan bir seçim değildir).
 */
const ALL_VALUE = '__ALL__';

function toSelectValue(v: string | null | undefined): string | undefined {
  if (v === null) return ALL_VALUE;
  return v ?? undefined;
}

interface UserScopeFieldsProps {
  role: UserRole;
}

/**
 * T-243 — `SCOPE_REQUIRED_ROLES` (PLANNER/CATEGORY_MANAGER) için kapsam
 * çift listesi. R-1 pair semantiği korunur: her satır kendi bağımsız
 * (cplId, categoryId) çiftidir — iki ayrı çoklu-seçim listesi YOK, yani
 * `cplIds[] × categoryIds[]` düzleştirmesi burada yapısal olarak mümkün
 * değil (`access-scope.service.ts` başlığı, R-1).
 */
export function UserScopeFields({ role }: UserScopeFieldsProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateUserFormData>();
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'scope',
  });
  const { data: cpls = [], isLoading: cplsLoading } = useCpls(true);
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories(true);

  const isCm = role === UserRole.CATEGORY_MANAGER;

  // Rol PLANNER <-> CATEGORY_MANAGER arasında değiştiğinde satırları o
  // rolün şekline uydur: CM'de cplId hiç taşınmaz (R1, backend REDDEDİYOR
  // — user.service.ts:234-247), en az bir satır her zaman kalır (kapsam
  // zorunlu, T-241 karar (b)).
  useEffect(() => {
    if (isCm) {
      const stripped = fields.map((f) => ({ categoryId: f.categoryId }));
      replace(stripped.length > 0 ? stripped : [{ categoryId: undefined }]);
    } else if (fields.length === 0) {
      append({ cplId: undefined, categoryId: undefined });
    }
    // Yalnız rol CM<->PLANNER arasında değiştiğinde çalışsın. `fields`/
    // `append`/`replace` her render'da yeni referans taşıdığı için
    // dependency'e eklenirse sonsuz döngü olur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCm]);

  const rowError = (index: number, field: 'cplId' | 'categoryId') =>
    (errors.scope as unknown as Array<Record<string, { message?: string }>>)
      ?.[index]?.[field]?.message;
  const arrayError = (errors.scope as { message?: string } | undefined)
    ?.message;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label>
          Kapsam <span className="text-red-500">*</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append(
              isCm
                ? { categoryId: undefined }
                : { cplId: undefined, categoryId: undefined },
            )
          }
        >
          <Plus className="mr-1 h-3 w-3" />
          Kapsam ekle
        </Button>
      </div>

      {isCm && (
        <p className="text-xs text-muted-foreground">
          Kategori müdürü kapsamı yalnız kategori boyutundadır (kanaldan
          bağımsız kategori sahibi) — bu rolde CPL seçimi gösterilmez.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-2">
          {!isCm && (
            <div className="flex-1">
              <Label className="text-xs">CPL</Label>
              <Controller
                control={control}
                name={`scope.${index}.cplId`}
                render={({ field: cplField }) => (
                  <Select
                    value={toSelectValue(cplField.value)}
                    onValueChange={(v) =>
                      cplField.onChange(v === ALL_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={cplsLoading ? 'Yükleniyor...' : 'CPL seçiniz'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Tüm CPL'ler</SelectItem>
                      {cpls.map(
                        (cpl: { id: string; code: string; name: string }) => (
                          <SelectItem key={cpl.id} value={cpl.id}>
                            {cpl.name} ({cpl.code})
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {rowError(index, 'cplId') && (
                <p className="text-xs text-red-600 mt-1">
                  {rowError(index, 'cplId')}
                </p>
              )}
            </div>
          )}

          <div className="flex-1">
            <Label className="text-xs">Kategori</Label>
            <Controller
              control={control}
              name={`scope.${index}.categoryId`}
              render={({ field: catField }) => (
                <Select
                  value={toSelectValue(catField.value)}
                  onValueChange={(v) =>
                    catField.onChange(v === ALL_VALUE ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        categoriesLoading ? 'Yükleniyor...' : 'Kategori seçiniz'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!isCm && (
                      <SelectItem value={ALL_VALUE}>
                        Tüm kategoriler
                      </SelectItem>
                    )}
                    {categories.map(
                      (category: {
                        id: string;
                        code: string;
                        name: string;
                      }) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({category.code})
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {rowError(index, 'categoryId') && (
              <p className="text-xs text-red-600 mt-1">
                {rowError(index, 'categoryId')}
              </p>
            )}
          </div>

          {fields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Kapsam satırını kaldır"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ))}

      {arrayError && <p className="text-xs text-red-600">{arrayError}</p>}
    </div>
  );
}
