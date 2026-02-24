import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { fuEndpoints } from '@/api/endpoints/master-data.endpoints';
import { Plan } from '@/api/endpoints/plans.endpoints';

interface AddFuDialogProps {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (fuIds: string[]) => Promise<void>;
}

export function AddFuDialog({ plan, isOpen, onClose, onAdd }: AddFuDialogProps) {
  const [selectedFuIds, setSelectedFuIds] = useState<Set<string>>(new Set());

  // Fetch available FUs for the plan's category
  const { data: fus, isLoading } = useQuery({
    queryKey: ['fus', plan.categoryId],
    queryFn: () => fuEndpoints.getAll(true, undefined, plan.categoryId).then(res => res.data),
    enabled: isOpen && !!plan.categoryId,
  });

  // Filter out already added FUs
  const availableFus = (fus || []).filter(
    (fu: any) => !plan.planFus?.some((planFu) => planFu.fuId === fu.id)
  );

  const handleFuToggle = (fuId: string, checked: boolean) => {
    const newSelected = new Set(selectedFuIds);
    if (checked) {
      newSelected.add(fuId);
    } else {
      newSelected.delete(fuId);
    }
    setSelectedFuIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedFuIds.size === 0) {
      return;
    }
    await onAdd(Array.from(selectedFuIds));
    setSelectedFuIds(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelectedFuIds(new Set());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>FU Ekle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
          ) : availableFus.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Bu kategori için eklenebilecek FU bulunamadı.
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {availableFus.map((fu: any) => (
                    <div
                      key={fu.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        id={`add-fu-${fu.id}`}
                        checked={selectedFuIds.has(fu.id)}
                        onCheckedChange={(checked) => handleFuToggle(fu.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`add-fu-${fu.id}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <span className="font-medium">{fu.code}: {fu.name}</span>
                        {fu.skus && (
                          <span className="text-gray-500 ml-2">
                            ({fu.skus.length} SKU içeriyor)
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={selectedFuIds.size === 0}>
            Ekle ({selectedFuIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
