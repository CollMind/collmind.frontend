import React, { useState } from 'react';
import { Agreement } from '@/types/agreement.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useSubmitAgreement,
  useApproveAgreement,
  useRejectAgreement,
  useCancelAgreement,
  useDeleteAgreement,
  useAgreementPermissions,
} from '@/services/agreements.service';
import { Send, Check, X, Ban, Trash2, Edit } from 'lucide-react';

interface AgreementActionsProps {
  agreement: Agreement;
  onEdit?: () => void;
  onSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function AgreementActions({
  agreement,
  onEdit,
  onSuccess,
  onDeleteSuccess,
}: AgreementActionsProps) {
  const permissions = useAgreementPermissions(agreement);
  const submitMutation = useSubmitAgreement();
  const approveMutation = useApproveAgreement();
  const rejectMutation = useRejectAgreement();
  const cancelMutation = useCancelAgreement();
  const deleteMutation = useDeleteAgreement();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [approveComments, setApproveComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(agreement.id);
      setSubmitDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        id: agreement.id,
        data: approveComments ? { comments: approveComments } : undefined,
      });
      setApproveDialogOpen(false);
      setApproveComments('');
      onSuccess?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        id: agreement.id,
        data: { reason: rejectReason },
      });
      setRejectDialogOpen(false);
      setRejectReason('');
      onSuccess?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        id: agreement.id,
        data: { reason: cancelReason },
      });
      setCancelDialogOpen(false);
      setCancelReason('');
      onSuccess?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(agreement.id);
      setDeleteDialogOpen(false);
      // Call onDeleteSuccess if provided, otherwise call onSuccess
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        onSuccess?.();
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {permissions.canEdit && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        )}

        {permissions.canSubmit && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setSubmitDialogOpen(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Onay İçin Gönder
          </Button>
        )}

        {permissions.canApprove && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setApproveDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Onayla
          </Button>
        )}

        {permissions.canReject && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRejectDialogOpen(true)}
          >
            <X className="h-4 w-4 mr-2" />
            Reddet
          </Button>
        )}

        {permissions.canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCancelDialogOpen(true)}
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <Ban className="h-4 w-4 mr-2" />
            İptal Et
          </Button>
        )}

        {permissions.canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </Button>
        )}
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onay İçin Gönder</DialogTitle>
            <DialogDescription>
              Bu anlaşmayı onay için göndermek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
            >
              İptal
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anlaşmayı Onayla</DialogTitle>
            <DialogDescription>
              Bu anlaşmayı onaylamak istediğinizden emin misiniz? Onaylandığında
              bütçe rezervasyonu otomatik olarak yapılacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approveComments">Yorum (Opsiyonel)</Label>
              <Textarea
                id="approveComments"
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                rows={3}
                placeholder="Onay yorumu ekleyebilirsiniz..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setApproveDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? 'Onaylanıyor...' : 'Onayla'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anlaşmayı Reddet</DialogTitle>
            <DialogDescription>
              Bu anlaşmayı reddetmek için lütfen bir neden belirtin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Red Nedeni *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Red nedeni..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? 'Reddediliyor...' : 'Reddet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anlaşmayı İptal Et</DialogTitle>
            <DialogDescription>
              Bu anlaşmayı iptal etmek için lütfen bir neden belirtin. Rezerve
              edilmiş bütçe serbest bırakılacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancelReason">İptal Nedeni *</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="İptal nedeni..."
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {cancelMutation.isPending ? 'İptal Ediliyor...' : 'İptal Et'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anlaşmayı Sil</DialogTitle>
            <DialogDescription>
              Bu anlaşmayı silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
