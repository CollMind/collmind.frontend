import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpiEndpoints, Kpi, CreateKpiDto, UpdateKpiDto } from '@/api/endpoints/kpi.endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle,
  Database,
  TrendingUp,
  Calculator,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const FORMULA_TYPES = [
  { value: 'expression', label: 'İfade (Expression)' },
  { value: 'conditional', label: 'Koşullu (Conditional)' },
  { value: 'user_input', label: 'Kullanıcı Girdisi' },
  { value: 'external', label: 'Harici Veri' },
];

const CALCULATION_LEVELS = [
  { value: 'sku', label: 'SKU' },
  { value: 'fu', label: 'FU (Forecasting Unit)' },
  { value: 'plan', label: 'Plan' },
];

const DISPLAY_FORMATS = [
  { value: 'number', label: 'Sayı' },
  { value: 'currency', label: 'Para Birimi (₺)' },
  { value: 'percentage', label: 'Yüzde (%)' },
];

const AGGREGATION_METHODS = [
  { value: 'sum', label: 'Toplam (SUM)' },
  { value: 'avg', label: 'Ortalama (AVG)' },
  { value: 'min', label: 'Minimum (MIN)' },
  { value: 'max', label: 'Maksimum (MAX)' },
  { value: 'weighted_avg', label: 'Ağırlıklı Ort.' },
];

const KPI_GROUPS = ['Volume', 'Profit', 'ROI', 'Revenue', 'Spend', 'Custom'];

const emptyForm: CreateKpiDto = {
  kpiCode: '',
  kpiName: '',
  kpiGroup: 'Volume',
  kpiDescription: '',
  formulaType: 'expression',
  formulaText: '',
  dependsOnKpis: [],
  calculationOrder: 1,
  calculationLevel: 'sku',
  displayFormat: 'number',
  decimalPlaces: 2,
  showInGrid: true,
  columnOrder: undefined,
  aggregationMethodFu: 'sum',
  ragGreenThreshold: undefined,
  ragAmberThreshold: undefined,
  isActive: true,
};

export function KpiManagementPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [form, setForm] = useState<CreateKpiDto>(emptyForm);
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Data
  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const res = await kpiEndpoints.getAll();
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateKpiDto) => kpiEndpoints.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast.success('KPI başarıyla oluşturuldu');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'KPI oluşturulamadı');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKpiDto }) =>
      kpiEndpoints.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast.success('KPI başarıyla güncellendi');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'KPI güncellenemedi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kpiEndpoints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast.success('KPI başarıyla silindi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'KPI silinemedi');
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => kpiEndpoints.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast.success('Varsayılan KPI\'lar oluşturuldu');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Seed işlemi başarısız');
    },
  });

  // Handlers
  const openCreate = useCallback(() => {
    setEditingKpi(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((kpi: Kpi) => {
    setEditingKpi(kpi);
    setForm({
      kpiCode: kpi.kpiCode,
      kpiName: kpi.kpiName,
      kpiGroup: kpi.kpiGroup,
      kpiDescription: kpi.kpiDescription || '',
      formulaType: kpi.formulaType,
      formulaText: kpi.formulaText,
      dependsOnKpis: kpi.dependsOnKpis || [],
      calculationOrder: kpi.calculationOrder,
      calculationLevel: kpi.calculationLevel,
      displayFormat: kpi.displayFormat,
      decimalPlaces: kpi.decimalPlaces,
      showInGrid: kpi.showInGrid,
      columnOrder: kpi.columnOrder,
      aggregationMethodFu: kpi.aggregationMethodFu || 'sum',
      ragGreenThreshold: kpi.ragGreenThreshold,
      ragAmberThreshold: kpi.ragAmberThreshold,
      isActive: kpi.isActive,
    });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingKpi(null);
    setForm(emptyForm);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.kpiCode || !form.kpiName || !form.formulaText) {
      toast.error('Kod, isim ve formül alanları zorunludur');
      return;
    }
    if (editingKpi) {
      updateMutation.mutate({ id: editingKpi.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }, [form, editingKpi, createMutation, updateMutation]);

  const handleDelete = useCallback((kpi: Kpi) => {
    if (window.confirm(`"${kpi.kpiName}" KPI'sını silmek istediğinize emin misiniz?`)) {
      deleteMutation.mutate(kpi.id);
    }
  }, [deleteMutation]);

  const toggleActive = useCallback((kpi: Kpi) => {
    updateMutation.mutate({
      id: kpi.id,
      data: { isActive: !kpi.isActive },
    });
  }, [updateMutation]);

  // Filtered KPIs
  const filteredKpis = kpis.filter((kpi) => {
    const matchesSearch = !search ||
      kpi.kpiCode.toLowerCase().includes(search.toLowerCase()) ||
      kpi.kpiName.toLowerCase().includes(search.toLowerCase()) ||
      kpi.kpiGroup.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = filterGroup === 'all' || kpi.kpiGroup === filterGroup;
    return matchesSearch && matchesGroup;
  });

  // Group KPIs by group
  const groups = [...new Set(kpis.map(k => k.kpiGroup))];

  const getCalcLevelLabel = (level: string) =>
    CALCULATION_LEVELS.find(l => l.value === level)?.label || level;
  const getDisplayFormatLabel = (format: string) =>
    DISPLAY_FORMATS.find(f => f.value === format)?.label || format;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'sku': return 'bg-blue-100 text-blue-700';
      case 'fu': return 'bg-purple-100 text-purple-700';
      case 'plan': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getGroupColor = (group: string) => {
    switch (group) {
      case 'Volume': return 'bg-green-100 text-green-700';
      case 'Profit': return 'bg-emerald-100 text-emerald-700';
      case 'ROI': return 'bg-amber-100 text-amber-700';
      case 'Revenue': return 'bg-blue-100 text-blue-700';
      case 'Spend': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dinamik KPI tanımlarını, formüllerini ve hesaplama sırasını yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Database className="h-4 w-4 mr-1" />
            {seedMutation.isPending ? 'Yükleniyor...' : 'Varsayılanları Yükle'}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Yeni KPI
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">Toplam KPI</span>
          </div>
          <p className="text-2xl font-bold mt-1">{kpis.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-500">Aktif</span>
          </div>
          <p className="text-2xl font-bold mt-1">{kpis.filter(k => k.isActive).length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-gray-500">Grid'de Görünen</span>
          </div>
          <p className="text-2xl font-bold mt-1">{kpis.filter(k => k.showInGrid).length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-gray-500">RAG Eşikli</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {kpis.filter(k => k.ragGreenThreshold !== null && k.ragGreenThreshold !== undefined).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="KPI ara (kod, isim, grup)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Grup Filtresi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Gruplar</SelectItem>
            {groups.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['kpis'] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredKpis.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {search || filterGroup !== 'all' ? 'Filtrelerle eşleşen KPI bulunamadı' : 'Henüz KPI tanımlanmamış. "Varsayılanları Yükle" butonunu kullanabilirsiniz.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sıra</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kod</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">İsim</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Grup</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Seviye</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Formül</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Format</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Grid</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">RAG</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Durum</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredKpis.map((kpi) => (
                  <tr
                    key={kpi.id}
                    className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500">{kpi.calculationOrder}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{kpi.kpiCode}</td>
                    <td className="px-4 py-3 font-medium">{kpi.kpiName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getGroupColor(kpi.kpiGroup)}`}>
                        {kpi.kpiGroup}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getLevelColor(kpi.calculationLevel)}`}>
                        {getCalcLevelLabel(kpi.calculationLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-[200px] truncate block">
                        {kpi.formulaText}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {getDisplayFormatLabel(kpi.displayFormat)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {kpi.showInGrid ? (
                        <Eye className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {kpi.ragGreenThreshold !== null && kpi.ragGreenThreshold !== undefined ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(kpi)}>
                        <Badge variant={kpi.isActive ? 'default' : 'secondary'} className="cursor-pointer">
                          {kpi.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(kpi)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(kpi)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKpi ? 'KPI Düzenle' : 'Yeni KPI Oluştur'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KPI Kodu <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.kpiCode}
                  onChange={(e) => setForm(f => ({ ...f, kpiCode: e.target.value.toUpperCase() }))}
                  placeholder="Ör: INCR_VOL"
                  disabled={!!editingKpi}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KPI Adı <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.kpiName}
                  onChange={(e) => setForm(f => ({ ...f, kpiName: e.target.value }))}
                  placeholder="Ör: Incremental Volume"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI Grubu</label>
                <Select value={form.kpiGroup} onValueChange={(v) => setForm(f => ({ ...f, kpiGroup: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KPI_GROUPS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hesaplama Sırası</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.calculationOrder}
                  onChange={(e) => setForm(f => ({ ...f, calculationOrder: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <Input
                value={form.kpiDescription || ''}
                onChange={(e) => setForm(f => ({ ...f, kpiDescription: e.target.value }))}
                placeholder="KPI açıklaması..."
              />
            </div>

            {/* Formula */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Formül Konfigürasyonu
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formül Tipi</label>
                  <Select value={form.formulaType} onValueChange={(v: any) => setForm(f => ({ ...f, formulaType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMULA_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hesaplama Seviyesi</label>
                  <Select value={form.calculationLevel} onValueChange={(v: any) => setForm(f => ({ ...f, calculationLevel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CALCULATION_LEVELS.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formül Metni <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={form.formulaText}
                  onChange={(e) => setForm(f => ({ ...f, formulaText: e.target.value }))}
                  placeholder="Ör: PLAN_VOL - BASE_VOL"
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Değişkenler: BASE_VOL, PLAN_VOL, BPTT, COGS, INCR_VOL, PLAN_TURNOVER, TACTIC_SPEND, GP veya diğer KPI kodları
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bağımlı KPI'lar</label>
                <Input
                  value={(form.dependsOnKpis || []).join(', ')}
                  onChange={(e) => setForm(f => ({
                    ...f,
                    dependsOnKpis: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                  }))}
                  placeholder="Virgülle ayrılmış KPI kodları: INCR_VOL, PLAN_TURNOVER"
                />
              </div>
            </div>

            {/* Display */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gösterim Formatı</label>
                <Select value={form.displayFormat} onValueChange={(v: any) => setForm(f => ({ ...f, displayFormat: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_FORMATS.map(df => (
                      <SelectItem key={df.value} value={df.value}>{df.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ondalık Basamak</label>
                <Input
                  type="number"
                  min={0}
                  max={6}
                  value={form.decimalPlaces ?? 2}
                  onChange={(e) => setForm(f => ({ ...f, decimalPlaces: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agregasyon</label>
                <Select value={form.aggregationMethodFu || 'sum'} onValueChange={(v: any) => setForm(f => ({ ...f, aggregationMethodFu: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGGREGATION_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid & RAG */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Grid Ayarları</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showInGrid"
                    checked={form.showInGrid ?? true}
                    onChange={(e) => setForm(f => ({ ...f, showInGrid: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="showInGrid" className="text-sm text-gray-700">Grid'de Göster</label>
                </div>
                {form.showInGrid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sütun Sırası</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.columnOrder || ''}
                      onChange={(e) => setForm(f => ({ ...f, columnOrder: parseInt(e.target.value) || undefined }))}
                      placeholder="Opsiyonel"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">RAG Eşikleri</h4>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1" />
                    Green ≥
                  </label>
                  <Input
                    type="number"
                    value={form.ragGreenThreshold ?? ''}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      ragGreenThreshold: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))}
                    placeholder="Ör: 20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block mr-1" />
                    Amber ≥
                  </label>
                  <Input
                    type="number"
                    value={form.ragAmberThreshold ?? ''}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      ragAmberThreshold: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))}
                    placeholder="Ör: 10"
                  />
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive ?? true}
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Aktif</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>İptal</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Kaydediliyor...'
                : editingKpi ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
