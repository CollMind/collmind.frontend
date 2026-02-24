import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { Plus, Edit, Search, Store, ArrowRight, ArrowLeft, Check, Trash2 } from 'lucide-react';
import { cplEndpoints } from '@/api/endpoints/master-data.endpoints';
import { customerEndpoints } from '@/api/endpoints/customers.endpoints';
import { ChannelSelect } from '@/components/common/ChannelSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CplManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    channelId: '',
    isActive: true, // Default to true as per request "isActive: true"
    status: 'ACTIVE' as 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED',
  });
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCpl, setEditingCpl] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cplToDelete, setCplToDelete] = useState<any>(null);

  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch CPLs
  const { data: cpls = [], isLoading: cplsLoading } = useQuery({
    queryKey: ['cpls'],
    queryFn: () => cplEndpoints.getAll(false).then((res) => res.data),
  });

  // Helper to get channel code from ID
  const selectedChannelCode = cpls.find(c => c.channelId === formData.channelId)?.channel?.code
    // Fallback: we need to fetch channels to get the code if not found in CPL list
    // But better yet, let's use useChannels hook here to get all channels and find the code.
    // However, refactoring to useChannels is cleaner.
    // Let's modify the component to use useChannels.
    ;

  // We need to fetch channels to map ID to Code
  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => import('@/api/endpoints/master-data.endpoints').then(m => m.channelEndpoints.getAll(false)).then(res => res.data),
  });

  const selectedChannel = channels.find((c: any) => c.id === formData.channelId);

  // Fetch Customers for the selected channel (Step 2)
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'channelId', formData.channelId],
    queryFn: () => customerEndpoints.getByChannelId(formData.channelId).then((res) => res.data),
    enabled: !!formData.channelId && currentStep === 2,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // 1. Create CPL with customer IDs
      // Remove isActive from payload as backend expects status
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isActive, ...cplData } = data;
      const cplResponse = await cplEndpoints.create({
        ...cplData,
        customerIds: selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined,
      });
      return cplResponse.data;
    },
    onSuccess: () => {
      toast.success('CPL ve müşteri atamaları başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['cpls'] });
      handleDialogClose();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.response?.data?.message || 'CPL oluşturulurken hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cplEndpoints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpls'] });
      toast.success('CPL başarıyla silindi');
      setDeleteDialogOpen(false);
      setCplToDelete(null);
    },
    onError: () => {
      toast.error('CPL silinirken hata oluştu');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isActive, ...cplData } = data;
      await cplEndpoints.update(editingCpl.id, cplData);

      if (customers.length > 0) {
        const previousCplCustomerIds = customers.filter(c => c.cpl?.id === editingCpl.id).map(c => c.id);

        const toRemove = previousCplCustomerIds.filter(id => !selectedCustomerIds.includes(id));
        const toAdd = selectedCustomerIds.filter(id => !previousCplCustomerIds.includes(id));

        const promises = [];
        for (const id of toRemove) {
          promises.push(customerEndpoints.update(id, { cplId: null } as any));
        }
        for (const id of toAdd) {
          promises.push(customerEndpoints.update(id, { cplId: editingCpl.id }));
        }

        await Promise.all(promises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpls'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('CPL başarıyla güncellendi');
      handleDialogClose();
    },
    onError: () => toast.error('CPL güncellenirken hata oluştu'),
  });

  const handleEdit = (cpl: any) => {
    setEditingCpl(cpl);
    setFormData({
      code: cpl.code,
      name: cpl.name,
      channelId: cpl.channelId,
      description: cpl.description,
      isActive: cpl.status === 'ACTIVE',
      status: cpl.status,
    });
    setSelectedCustomerIds([]);
    setIsDialogOpen(true);
    setCurrentStep(1);
  };

  useEffect(() => {
    if (editingCpl && customers.length > 0) {
      const cplCustomers = customers.filter((c: any) => c.cpl?.id === editingCpl.id).map((c: any) => c.id);
      setSelectedCustomerIds(cplCustomers);
    }
  }, [customers, editingCpl]);

  const handleDeleteClick = (cpl: any) => {
    setCplToDelete(cpl);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCpl(null);
    setCurrentStep(1);
    setFormData({
      code: '',
      name: '',
      description: '',
      channelId: '',
      isActive: true,
      status: 'ACTIVE',
    });
    setSelectedCustomerIds([]);
    setSearchQuery('');
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.code || !formData.name || !formData.channelId) {
        toast.error('Lütfen zorunlu alanları doldurunuz (Kod, İsim, Kanal)');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleSubmit = () => {
    if (editingCpl) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CPL Yönetimi</h1>
          <p className="text-gray-600 mt-2">Müşteri Planlama Gruplarını (CPL) yönetin</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni CPL Oluştur
        </Button>
      </div>

      {/* CPL List - Grid View as per screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cplsLoading ? (
          <p>Yükleniyor...</p>
        ) : cpls.map((cpl: any) => (
          <Card key={cpl.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="mb-2">{cpl.code}</Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(cpl)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(cpl)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg">{cpl.name}</CardTitle>
              <CardDescription className="line-clamp-1">{cpl.description || '-'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Store className="h-4 w-4" />
                <span>{cpl.channel?.name || 'Kanal Yok'}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-4 pt-2 border-t">
                <span className={cpl.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'}>
                  {cpl.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                </span>
                <span className="text-gray-400">
                  {cpl.customers?.length || 0} Müşteri
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle>{editingCpl ? 'CPL Düzenle' : 'Yeni CPL Oluştur'}</DialogTitle>
                <DialogDescription>
                  {editingCpl
                    ? 'Mevcut CPL bilgilerini ve müşterilerini düzenleyin.'
                    : `Adım ${currentStep} / 2`
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">CPL Kodu *</Label>
                  <Input
                    id="code"
                    placeholder="ÖRN: CPL-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="name">CPL Adı *</Label>
                  <Input
                    id="name"
                    placeholder="Örn: Carrefour Modern Grup"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Kanal *</Label>
                  <div className="mt-1.5">
                    <ChannelSelect
                      value={formData.channelId}
                      onChange={(val) => setFormData({ ...formData, channelId: val })}
                      placeholder="Kanal seçiniz"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    placeholder="Bu grup hakkında detaylı bilgi..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex gap-3 text-sm">
                  <InfoIcon className="h-5 w-5 flex-shrink-0" />
                  <p>Aşağıda seçilen kanala ait müşteriler listelenmektedir. Bu müşterileri yeni oluşturacağınız CPL grubuna atayabilirsiniz.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Müşteri Seçimi ({selectedCustomerIds.length} seçildi)</Label>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Müşteri ara..."
                        className="pl-8 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <Card className="border-2 border-dashed shadow-none">
                    <ScrollArea className="h-[300px] w-full p-4">
                      {customersLoading ? (
                        <div className="text-center py-8 text-gray-500">Müşteriler yükleniyor...</div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <Store className="h-12 w-12 mb-3 opacity-20" />
                          <p>Bu kanalda atanabilecek müşteri bulunamadı.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {filteredCustomers.map(customer => (
                            <div
                              key={customer.id}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedCustomerIds.includes(customer.id)
                                ? 'bg-blue-50 border-blue-200'
                                : 'hover:bg-gray-50 border-gray-100'
                                }`}
                              onClick={() => toggleCustomer(customer.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedCustomerIds.includes(customer.id)}
                                  onCheckedChange={() => toggleCustomer(customer.id)}
                                />
                                <div>
                                  <p className="font-medium text-sm">{customer.name}</p>
                                  <p className="text-xs text-gray-500">{customer.code} • {customer.city || '-'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={handleDialogClose}>İptal</Button>
            <div className="flex gap-2">
              {currentStep === 2 && (
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Geri
                </Button>
              )}
              {currentStep === 1 ? (
                <Button onClick={handleNext}>
                  Devam Et
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {editingCpl ? 'Güncelle' : 'Oluştur'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CPL Sil</DialogTitle>
            <DialogDescription>
              "{cplToDelete?.name}" isimli CPL'i silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
            <Button
              variant="destructive"
              onClick={() => cplToDelete && deleteMutation.mutate(cplToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  );
}
